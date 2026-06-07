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

<h2>REGISTRO DE PRIMERA ENTREVISTA</h2>

<br>

<h3>1. Datos filiatorios</h3>

<p><strong>Nombre:</strong></p>

<p><strong>Preferencia:</strong></p>

<p><strong>Edad:</strong></p>

<p><strong>DNI:</strong></p>

<p><strong>Ocupación:</strong></p>

<p><strong>Tel:</strong></p>

<p><strong>Emergencia:</strong></p>

<br>

<h3>2. Motivo de consulta</h3>

<p>-</p>

<br>

<h3>3. Historia actual</h3>

<p>-</p>

<br>

<h3>4. Antecedentes personales</h3>

<p>-</p>

<br>

<h3>5. Antecedentes familiares</h3>

<p>-</p>

<br>

<h3>6. Escolaridad / Trabajo</h3>

<p>-</p>

<br>

<h3>7. Relaciones vinculares</h3>

<p>-</p>

<br>

<h3>8. Observaciones clínicas</h3>

<p>-</p>

<br>

<h3>9. Impresión diagnóstica inicial</h3>

<p>-</p>

<br>

<h3>10. Objetivos terapéuticos</h3>

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