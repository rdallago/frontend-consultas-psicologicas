import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  Inject,
  PLATFORM_ID,
  ChangeDetectorRef,
  NgZone
} from '@angular/core';

import {
  CommonModule,
  isPlatformBrowser
} from '@angular/common';

import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { timeout } from 'rxjs/operators';

import { QuillModule } from 'ngx-quill';

declare global {

  interface Window {

    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

@Component({
  selector: 'app-visitas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    QuillModule
  ],
  templateUrl: './visitas.html',
  styleUrls: ['./visitas.css']
})
export class VisitasComponent
implements OnInit, AfterViewInit, OnDestroy {

  // =====================================
  // DATOS
  // =====================================

  visitas: any[] = [];

  turnos: any[] = [];

  recognition: any;

  grabando = false;

  speechDisponible = false;

  generandoIA = false;

  guardando = false;

  private requestIaId = 0;

  modoFormulario: 'PRIMERA_ENTREVISTA' | 'SEGUIMIENTO' = 'SEGUIMIENTO';
  
  editorModules = {

    toolbar: [

      ['bold', 'italic', 'underline'],

      [{ list: 'ordered' }, { list: 'bullet' }],

      [{ align: [] }],

      ['link'],

      ['clean']
    ]
  };

  nuevaVisita: any = {

  id: null,

  turno: null,

  observacion: '',

  fecha: null,

  resumenIa: '',

  estadoIa: null
};

  busquedaPaciente = '';

  busquedaFecha = '';

  mostrarPopup = false;

  editando = false;

  mostrarToast = false;

  mensajeToast = '';

  // =====================================
  // CONSTRUCTOR
  // =====================================

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  // =====================================
  // INIT
  // =====================================

  ngOnInit(): void {

    if (isPlatformBrowser(this.platformId)) {

      setTimeout(() => {

        this.cargarVisitas();

        this.cargarTurnos();

        this.inicializarSpeech();

        this.cdr.detectChanges();

      }, 200);
    }
  }

  ngAfterViewInit(): void {}

  // =====================================
  // TURNOS
  // =====================================

  cargarTurnos(): void {

    this.http
      .get<any[]>(
        'http://localhost:8080/api/turnos/para-visita'
      )
      .subscribe({

        next: (data) => {

          this.zone.run(() => {

            this.turnos = [...data];

            this.cdr.detectChanges();
          });
        },

        error: err => {

          console.error(err);
        }
      });
  }

  // =====================================
  // SPEECH
  // =====================================

  inicializarSpeech(): void {

    if (!isPlatformBrowser(this.platformId)) {

      return;
    }

    try {

      const SpeechRecognition =
        (globalThis as any).SpeechRecognition ||
        (globalThis as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {

        this.speechDisponible = false;

        return;
      }

      this.speechDisponible = true;

      this.recognition = new SpeechRecognition();

      this.recognition.lang = 'es-AR';

      this.recognition.continuous = true;

      this.recognition.interimResults = false;

      this.recognition.onstart = () => {

        this.zone.run(() => {

          this.grabando = true;
          this.cdr.detectChanges();
        });
      };

      this.recognition.onend = () => {

        this.zone.run(() => {

          this.grabando = false;
          this.cdr.detectChanges();
        });
      };

      this.recognition.onresult = (event: any) => {

        let textoFinal = '';

        for (
          let i = event.resultIndex;
          i < event.results.length;
          i++
        ) {

          if (event.results[i].isFinal) {

            textoFinal +=
              event.results[i][0].transcript + ' ';
          }
        }

        this.zone.run(() => {

          this.nuevaVisita.observacion =
String(this.nuevaVisita.observacion || '') + textoFinal;

          this.cdr.detectChanges();
        });
      };

    } catch (error) {

      console.error(error);

      this.speechDisponible = false;
    }
  }

 iniciarDictado(): void {

  // 🔥 evitar doble inicio
  if (this.grabando) {

    return;
  }

  if (!this.recognition) {

    this.mostrarMensaje(
      'Navegador no compatible'
    );

    return;
  }

  try {

    this.recognition.start();

  } catch (error) {

    console.error(error);
  }
}

  detenerDictado(): void {

    if (this.recognition) {

      this.recognition.stop();
    }
  }

  // =====================================
  // VISITAS
  // =====================================

  cargarVisitas(): void {

    this.http
      .get<any[]>('http://localhost:8080/api/visitas')
      .subscribe({

        next: (data) => {

          this.zone.run(() => {

            this.visitas = [...data];

            this.cdr.detectChanges();
          });
        },

        error: err => {

          console.error(err);
        }
      });
  }

  // =====================================
  // IA
  // =====================================

 generarResumenIA(): void {

  if (this.generandoIA) {

    return;
  }

  const textoPlano = this.nuevaVisita.observacion
    ?.replace(/<[^>]*>/g, '')
    .trim();

  if (!textoPlano) {

    this.mostrarMensaje(
      'No hay observación para resumir'
    );

    return;
  }

  this.generandoIA = true;

  this.nuevaVisita.estadoIa = 'PROCESANDO';

  const requestId = ++this.requestIaId;

  this.http.post(

    'http://localhost:8080/api/ia/resumir',

    {
      texto: textoPlano
    },

    {
      responseType: 'text'
    }

  )
  .subscribe({

    next: (resumen: string) => {

      this.zone.run(() => {

        // 🔥 evitar mezclar respuestas viejas
        if (requestId !== this.requestIaId) {

          return;
        }

        this.nuevaVisita.resumenIa = resumen;

        this.nuevaVisita.estadoIa = 'OK';

        this.generandoIA = false;

        this.mostrarMensaje(
          'Resumen generado correctamente'
        );

        this.cdr.detectChanges();
      });
    },

    error: (err) => {

      console.error(err);

      this.zone.run(() => {

        if (requestId !== this.requestIaId) {

          return;
        }

        this.nuevaVisita.estadoIa = 'ERROR';

        this.generandoIA = false;

        this.mostrarMensaje(
          'Error generando resumen IA'
        );

        this.cdr.detectChanges();
      });
    }
  });
}

textoObservacionVacio(): boolean {

  if (!this.nuevaVisita.observacion) {

    return true;
  }

  const textoPlano = this.nuevaVisita.observacion
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, '')
    .trim();

  return textoPlano.length === 0;
}
  // =====================================
  // GUARDAR
  // =====================================

  // =====================================
  // BUSQUEDAS
  // =====================================

  buscarPaciente(): void {

    if (!this.busquedaPaciente.trim()) {

      this.cargarVisitas();

      return;
    }

    this.http.get<any[]>(

      `http://localhost:8080/api/visitas/buscar?nombre=${this.busquedaPaciente}`

    ).subscribe({

      next: data => {

        this.visitas = [...data];
      }
    });
  }

  buscarFecha(): void {

    if (!this.busquedaFecha) {

      this.cargarVisitas();

      return;
    }

    this.http.get<any[]>(

      `http://localhost:8080/api/visitas/fecha?fecha=${this.busquedaFecha}`

    ).subscribe({

      next: data => {

        this.visitas = [...data];
      }
    });
  }

  // =====================================
  // ELIMINAR
  // =====================================

   eliminar(id: number): void {

  if (!confirm(
    '¿Eliminar visita?'
  )) {

    return;
  }

  this.http.delete(

    `http://localhost:8080/api/visitas/${id}`

  ).subscribe({

    next: () => {

      // =====================================
      // RECARGAR VISITAS
      // =====================================

      this.cargarVisitas();

      // =====================================
      // RECARGAR TURNOS
      // (para que el turno vuelva a AGENDADO)
      // =====================================

      this.cargarTurnos();

      // =====================================
      // MENSAJE
      // =====================================

      this.mostrarMensaje(
        'Visita eliminada y turno restaurado a AGENDADO'
      );
    },

    error: err => {

      console.error(err);

      this.mostrarMensaje(
        'Error al eliminar'
      );
    }
  });
}

  // =====================================
  // TOAST
  // =====================================

  mostrarMensaje(msg: string): void {

    this.mensajeToast = msg;

    this.mostrarToast = true;

    setTimeout(() => {

      this.mostrarToast = false;

    }, 2500);
  }

  // =====================================
  // DESTROY
  // =====================================

  ngOnDestroy(): void {

    if (this.recognition) {

      this.recognition.stop();
    }
  }
  abrirEdicion(v: any): void {

  this.editar(v);
}
verPdf(id: number): void {

  this.http.get(
    `http://localhost:8080/api/visitas/${id}/pdf`,
    {
      responseType: 'blob'
    }
  ).subscribe({

    next: (blob) => {

      const url =
        window.URL.createObjectURL(blob);

      window.open(
        url,
        '_blank'
      );
    },

    error: (err) => {

      console.error(
        'Error generando PDF',
        err
      );

      alert(
        'No se pudo generar el PDF de la visita'
      );
    }

  });
}
seleccionarPaciente(historiaId: number) {

  this.http.get<boolean>(
    `http://localhost:8080/api/visitas/es-primera/${historiaId}`
  ).subscribe(esPrimera => {

    if (esPrimera) {
      this.modoFormulario = 'PRIMERA_ENTREVISTA';
      this.nuevaVisita.tipoVisita = 'PRIMERA_ENTREVISTA';
    } else {
      this.modoFormulario = 'SEGUIMIENTO';
      this.nuevaVisita.tipoVisita = 'SEGUIMIENTO';
    }

  });

}
onTurnoSeleccionado(): void {

  if (!this.nuevaVisita.turno?.paciente?.id) {
    return;
  }

 const pacienteId =
  this.nuevaVisita.turno?.paciente?.id;

  // =====================================
  // CONSULTAR SI YA EXISTE PRIMERA ENTREVISTA
  // =====================================

  this.http.get<boolean>(
    `http://localhost:8080/api/visitas/es-primera/${pacienteId}`
  ).subscribe({

    next: (esPrimera) => {

      // =====================================
      // DEFINIR MODO
      // =====================================

      this.modoFormulario =
        esPrimera
          ? 'PRIMERA_ENTREVISTA'
          : 'SEGUIMIENTO';

      this.nuevaVisita.tipoVisita =
        this.modoFormulario;

      // =====================================
      // SI ES PRIMERA → CARGAR TEMPLATE
      // =====================================

      if (this.modoFormulario === 'PRIMERA_ENTREVISTA') {

     this.nuevaVisita.observacion = `

<h2>ENTREVISTA CLÍNICA INICIAL</h2>

<br>

<h3>1. Datos de identificación</h3>

<p><strong>Nombre completo:</strong></p>

<p><strong>Edad:</strong></p>

<p><strong>Fecha de nacimiento:</strong></p>

<p><strong>DNI:</strong></p>

<p><strong>Dirección actual:</strong></p>

<p><strong>Teléfono:</strong></p>

<p><strong>Contacto de emergencia:</strong></p>

<p><strong>Parentesco:</strong></p>

<p><strong>Tel. de emergencia:</strong></p>

<p><strong>Estudios previos o cursados:</strong></p>

<p><strong>Ocupación actual:</strong></p>

<p><strong>Estado civil:</strong></p>

<p><strong>Derivado/a por:</strong></p>

<br>

<h3>2. Historia de tratamientos previos</h3>

<p><strong>Tratamientos anteriores:</strong> <em>¿Ha realizado procesos de psicoterapia previamente? (orientación, duración, motivo, resultados y razón de finalización)</em></p>

<p>-</p>

<p><strong>Tratamiento farmacológico / psiquiátrico:</strong> <em>¿Actualmente o en el pasado ha recibido atención psiquiátrica?</em></p>

<p>-</p>

<p><strong>Medicación psicotrópica actual:</strong></p>

<p>-</p>

<p><strong>Historial de internaciones o urgencias:</strong> <em>¿Ha tenido episodios previos de crisis graves, ideación suicida, autolesiones o internaciones?</em></p>

<p>-</p>

<p><strong>Balance de tratamientos anteriores:</strong> <em>¿Qué cosas de esos tratamientos siente que le sirvieron y cuáles no?</em></p>

<p>-</p>

<br>

<h3>3. Motivo de consulta</h3>

<p><strong>Motivo principal:</strong> <em>¿Cuál es el motivo principal por el cual decidió consultar hoy?</em></p>

<p>-</p>

<p><strong>Hecho reciente:</strong> <em>¿Ocurrió algo en particular recientemente que lo/la llevó a pedir esta cita?</em></p>

<p>-</p>

<p><strong>Expectativas:</strong> <em>¿Qué le gustaría lograr o cambiar a través de este espacio terapéutico?</em></p>

<p>-</p>

<br>

<h3>4. Historia del problema actual</h3>

<p><strong>Inicio y evolución:</strong> <em>¿Cuándo comenzó a sentirse así o cuándo notó que este problema empezó a ser un inconveniente?</em></p>

<p>-</p>

<p><strong>Situación desencadenante:</strong> <em>¿Identifica alguna situación o hecho en particular que crea que desencadenó esto?</em></p>

<p>-</p>

<p><strong>Síntomas:</strong> <em>¿Qué síntomas siente?</em></p>

<p>-</p>

<p><strong>Frecuencia e intensidad:</strong> <em>¿Con qué frecuencia e intensidad se presentan los síntomas o la molestia (emocional, conductual, cognitiva)?</em></p>

<p>-</p>

<p><strong>Momentos de empeoramiento:</strong> <em>¿En qué momentos o situaciones nota que estos síntomas empeoran?</em></p>

<p>-</p>

<p><strong>Cuando aparece esta situación, lo que pasa en:</strong></p>

<p><strong>Pensamiento:</strong> <em>¿Qué pensamientos suelen venirle a la cabeza?</em></p>

<p>-</p>

<p><strong>Emoción:</strong> <em>¿Qué emociones siente cuando esto pasa y qué sensaciones nota en su cuerpo?</em></p>

<p>-</p>

<p><strong>Conducta:</strong> <em>¿Qué suele hacer usted cuando se siente de esa manera?</em></p>

<p>-</p>

<p><strong>Impacto funcional:</strong> <em>¿De qué manera esta situación interfiere en sus rutinas cotidianas, trabajo/estudios, relaciones interpersonales o cuidado personal?</em></p>

<p>-</p>

<p><strong>Estrategias de afrontamiento previas:</strong> <em>¿Qué ha intentado hacer hasta ahora para solucionar o gestionar esto? ¿Qué le ha servido y qué no?</em></p>

<p>-</p>

<br>

<h3>5. Antecedentes médicos y farmacológicos</h3>

<p><strong>Antecedentes familiares:</strong> <em>¿Hay en su familia antecedentes médicos o psiquiátricos?</em></p>

<p>-</p>

<p><strong>Enfermedades médicas o crónicas:</strong> <em>¿Padece alguna condición médica, diagnóstico físico o dolor crónico?</em></p>

<p>-</p>

<p><strong>Chequeos:</strong> <em>¿Se realiza chequeos médicos de manera regular?</em></p>

<p>-</p>

<p><strong>Medicación:</strong></p>

<p>-</p>

<br>

<h3>6. Estructura familiar y redes de apoyo</h3>

<p><strong>Composición familiar actual:</strong> <em>¿Con quiénes convive actualmente?</em></p>

<p>-</p>

<p><strong>Familia de origen:</strong> <em>Datos generales sobre padres, hermanos y figuras significativas de crianza.</em></p>

<p>-</p>

<p><strong>Dinámica relacional e historia familiar:</strong> <em>¿Cómo describiría el vínculo con su familia de origen durante su infancia y en la actualidad?</em></p>

<p>-</p>

<p><strong>Relación de pareja:</strong></p>

<p><strong>¿Tiene pareja actualmente?</strong></p>

<p><strong>¿Hace cuánto tiempo?</strong></p>

<p><strong>¿Cómo describiría la relación con él/ella?</strong></p>

<p>-</p>

<p><strong>Hijos - Rol maternal / paternal:</strong></p>

<p><strong>¿Tiene hijos?</strong></p>

<p><strong>¿Cuántos?</strong></p>

<p><strong>¿Cuáles son sus edades, nombres y cómo es el vínculo con cada uno de ellos?</strong></p>

<p>-</p>

<p><strong>Red de apoyo:</strong> <em>¿Con qué personas de su familia o amigos siente que cuenta para buscar apoyo cuando lo necesita?</em></p>

<p>-</p>

<br>

<h3>7. Hábitos y estilo de vida</h3>

<p><strong>Hábitos de sueño:</strong></p>

<p><strong>¿Cuántas horas duerme?</strong></p>

<p><strong>¿Cómo es la calidad de sueño y descanso?</strong></p>

<p>-</p>

<p><strong>Alimentación:</strong> <em>¿Cómo definiría su patrón alimentario actual?</em></p>

<p>-</p>

<p><strong>Consumo de sustancias / Adicciones:</strong> <em>Consumo de alcohol, tabaco, café u otras sustancias (frecuencia, cantidad y contexto de uso).</em></p>

<p>-</p>

<p><strong>Actividad física:</strong> <em>¿Realiza alguna actividad física o deportiva?</em></p>

<p>-</p>

<p><strong>Actividades recreativas:</strong> <em>¿Qué actividades le gusta hacer en su tiempo libre o para despejarse?</em></p>

<p><strong>¿Con qué frecuencia las realiza?</strong></p>

<p>-</p>

<p><strong>Vida social:</strong> <em>¿Tiene amigos, familiares o compañeros de trabajo con quienes socializar? ¿Con qué frecuencia se junta con ellos?</em></p>

<p>-</p>

<br>

<h3>8. Seguridad y riesgo</h3>

<p><strong>Ideación o pensamientos de daño:</strong> <em>¿Ha tenido pensamientos de que preferiría no despertar o de hacerse daño en el último tiempo?</em></p>

<p>-</p>

<p><strong>Capacidad de mantenerse a salvo:</strong> <em>¿Siente que la situación actual sobrepasa su capacidad para mantenerse a salvo?</em></p>

<p>-</p>
`;

      } else {

        // =====================================
        // SEGUIMIENTO → EDITOR VACÍO
        // =====================================

        this.nuevaVisita.observacion = '';
      }

      this.cdr.detectChanges();
    },

    error: (err) => {

      console.error(err);

      this.mostrarMensaje(
        'Error detectando tipo de entrevista'
      );
    }
  });
}

guardar(): void {

  if (this.guardando) {
    return;
  }

  // =====================================
  // VALIDACIÓN
  // =====================================

  const textoPlano =
    this.nuevaVisita.observacion
      ?.replace(/<[^>]*>/g, '')
      .trim();

  if (!this.nuevaVisita.turno?.id || !textoPlano) {

    this.mostrarMensaje(
      'Complete los datos'
    );

    return;
  }

  // =====================================
  // TIPO VISITA
  // =====================================

  if (!this.editando) {

    this.nuevaVisita.tipoVisita =
      this.nuevaVisita.tipoVisita ??
      this.modoFormulario;
  }

  // =====================================
  // ESTADO
  // =====================================

  this.guardando = true;

  const payload = {

    id: this.nuevaVisita.id,

    turno: this.nuevaVisita.turno,

    fecha: this.nuevaVisita.fecha,

    tipoVisita: this.nuevaVisita.tipoVisita,

    // 🔥 IMPORTANTE
    observacion: this.nuevaVisita.observacion
  };

  // =====================================
  // REQUEST
  // =====================================

  const request = this.editando

    ? this.http.put<any>(
        `http://localhost:8080/api/visitas/${this.nuevaVisita.id}`,
        payload
      )

    : this.http.post<any>(
        'http://localhost:8080/api/visitas',
        payload
      );

  request.subscribe({

    next: (visitaGuardada) => {

      this.zone.run(() => {

        const visitaLocal = {

          ...visitaGuardada,

          estadoIa: 'PROCESANDO',

          resumenIa: 'Generando resumen IA...'
        };

        if (this.editando) {

          const index = this.visitas.findIndex(
            v => v.id === visitaGuardada.id
          );

          if (index !== -1) {

            this.visitas[index] = visitaLocal;

          } else {

            this.visitas.unshift(visitaLocal);
          }

        } else {

          this.visitas.unshift(visitaLocal);
        }

        // =====================================
        // POLLING IA
        // =====================================

        const intervalo = setInterval(() => {

          this.http.get<any>(
            `http://localhost:8080/api/visitas/${visitaGuardada.id}`
          )
          .subscribe({

            next: (visitaActualizada) => {

              const index = this.visitas.findIndex(
                v => v.id === visitaActualizada.id
              );

              if (index !== -1) {

                this.visitas[index] =
                  visitaActualizada;

                this.cdr.detectChanges();
              }

              if (
                visitaActualizada.estadoIa === 'OK' ||
                visitaActualizada.estadoIa === 'ERROR'
              ) {

                clearInterval(intervalo);
              }
            },

            error: () => {

              clearInterval(intervalo);
            }
          });

        }, 3000);

        // =====================================
        // FINAL UI
        // =====================================

        this.guardando = false;

        this.mostrarMensaje(
          'Visita guardada'
        );

        this.cerrarPopup();

        this.cdr.detectChanges();
      });
    },

    error: (err) => {

      console.error(err);

      this.zone.run(() => {

        this.guardando = false;

        this.mostrarMensaje(
          'Error al guardar'
        );

        this.cdr.detectChanges();
      });
    }
  });
}

editar(v: any): void {

  // =====================================
  // VALIDAR VISITA
  // =====================================

  if (!v) {
    this.mostrarMensaje('Visita inválida');
    return;
  }

  // =====================================
  // VALIDAR TURNO
  // =====================================

  if (!v.turno || !v.turno.id) {
    this.mostrarMensaje('La visita no posee turno asociado todavía');
    return;
  }

  this.editando = true;
  this.mostrarPopup = true;

  // =====================================
  // MODO FORMULARIO (CLAVE FIX)
  // =====================================

  this.modoFormulario = v.tipoVisita ?? 'SEGUIMIENTO';

  // =====================================
  // ASEGURAR TURNOS VALIDOS
  // =====================================

  this.turnos = this.turnos.filter(
    t => t && t.id && t.paciente
  );

  const existe = this.turnos.some(
    t => t.id === v.turno.id
  );

  if (!existe) {
    this.turnos = [...this.turnos, v.turno];
  }

  // =====================================
  // FECHA
  // =====================================

  let fechaFormateada = null;

  if (Array.isArray(v.fecha)) {
    fechaFormateada = new Date(
      v.fecha[0],
      v.fecha[1] - 1,
      v.fecha[2]
    ).toISOString();
  } else {
    fechaFormateada = v.fecha;
  }

  // =====================================
  // CARGAR FORMULARIO
  // =====================================

  this.nuevaVisita = {
    id: v.id,
    turno: v.turno,
    observacion: v.observacion || '',
    fecha: fechaFormateada,
    resumenIa: v.resumenIa || '',
    estadoIa: v.estadoIa || null,
    tipoVisita: v.tipoVisita || null
  };

  this.cdr.detectChanges();
}

cerrarPopup(): void {
  this.mostrarPopup = false;
  this.resetFormulario();
}
resetFormulario(): void {

  this.requestIaId = this.requestIaId || 0;

  this.nuevaVisita = {
    id: null,
    turno: null,
    observacion: '',
    fecha: null,
    resumenIa: '',
    estadoIa: null,
    tipoVisita: null
  };

  this.editando = false;
  this.guardando = false;
  this.generandoIA = false;
}
abrirPopupNueva(): void {

  this.editando = false;

  this.resetFormulario();

  this.cargarTurnos();

  this.mostrarPopup = true;
}
}
