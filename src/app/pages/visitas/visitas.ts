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
  
  // =====================================
// DICTADO PRIMERA ENTREVISTA
// =====================================

transcripcionPrimeraEntrevista = '';

organizandoEntrevista = false;
  private detenerPrimeraEntrevistaPendiente = false;
  private temporizadorDetencion: ReturnType<typeof setTimeout> | null = null;
  private sesionDictado = 0;
  private solicitudEntrevistaId = 0;

  private finalizarDetencionDictado(): void {
    if (this.temporizadorDetencion !== null) {
      clearTimeout(this.temporizadorDetencion);
      this.temporizadorDetencion = null;
    }
    const organizar = this.detenerPrimeraEntrevistaPendiente;
    this.detenerPrimeraEntrevistaPendiente = false;
    this.grabando = false;
    this.deteniendoDictado = false;
    this.cdr.detectChanges();
    if (organizar) {
      if (this.transcripcionPrimeraEntrevista.trim()) {
        this.organizarEntrevistaConIA();
      } else {
        this.mostrarMensaje('No se detectó texto. Revisá los permisos del micrófono.');
      }
    }
  }

  guardando = false;
  entrevistaOrganizadaLista = false;
  cargandoVisita = false;
  verificandoGuardado = false;
  errorDictado = '';
  deteniendoDictado = false;

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

          this.finalizarDetencionDictado();
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

  // =====================================
  // PRIMERA ENTREVISTA
  // =====================================

  if (
    this.modoFormulario === 'PRIMERA_ENTREVISTA'
  ) {

    this.transcripcionPrimeraEntrevista +=
      textoFinal;

  }

  // =====================================
  // SEGUIMIENTO
  // =====================================

  else {

    // Se mantiene exactamente el
    // comportamiento que ya funcionaba

    this.nuevaVisita.observacion =
      String(
        this.nuevaVisita.observacion || ''
      ) + textoFinal;
  }

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

    this.detenerPrimeraEntrevistaPendiente = false;
    if (this.temporizadorDetencion !== null) {
      clearTimeout(this.temporizadorDetencion);
      this.temporizadorDetencion = null;
    }
    if (this.organizandoEntrevista || this.deteniendoDictado || this.guardando || this.cargandoVisita || this.verificandoGuardado) {
      this.mostrarMensaje('Esperá a que termine el proceso actual');
      return;
    }
    this.transcripcionPrimeraEntrevista = ''; // cada sesión agrega solamente lo nuevo
    this.entrevistaOrganizadaLista = false;
    this.errorDictado = '';
    this.recognition.start();

  } catch (error) {

    console.error(error);
  }
}

 detenerDictado(): void {
  if (!this.recognition) return;
  const primera = this.modoFormulario === 'PRIMERA_ENTREVISTA';
  this.detenerPrimeraEntrevistaPendiente = primera;
  this.deteniendoDictado = true;
  // Se espera el último resultado del reconocimiento antes de organizar.
  this.grabando = false;
  this.cdr.detectChanges();
  try {
    this.recognition.stop();
  } catch (error) {
    console.warn('No se pudo detener SpeechRecognition normalmente:', error);
    try { this.recognition.abort(); } catch (_) { /* sin sesión activa */ }
    this.finalizarDetencionDictado();
    return;
  }
  // Algunos navegadores no emiten onend después de stop().
  // Esperamos resultados finales brevemente y garantizamos el cierre.
  if (this.temporizadorDetencion !== null) clearTimeout(this.temporizadorDetencion);
  this.temporizadorDetencion = setTimeout(() => {
    if (this.detenerPrimeraEntrevistaPendiente || this.temporizadorDetencion !== null) {
      try { this.recognition.abort(); } catch (_) { /* ya detenido */ }
      this.zone.run(() => this.finalizarDetencionDictado());
    }
  }, 1500);
}

  // Siempre conservar la transcripción literal, incluso si falla la IA.
  // La sección no se duplica al volver a intentar organizar.
  private anexarTranscripcionOriginal(html: string, texto: string, pendiente: string = ''): string {
    const inicio = '<!-- INICIO_TRANSCRIPCION_ORIGINAL -->';
    const fin = '<!-- FIN_TRANSCRIPCION_ORIGINAL -->';
    const anterior = html.indexOf(inicio);
    if (anterior >= 0) {
      const cierre = html.indexOf(fin, anterior);
      if (cierre >= 0) html = html.slice(0, anterior) + html.slice(cierre + fin.length);
    }
    const escapar = (s: string): string => s.replace(/&/g, '&amp;')
      .replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const pendienteHtml = pendiente.trim()
      ? `<h3>Información pendiente de clasificar (sugerencia IA)</h3><p>${escapar(pendiente).replace(/\n/g, '<br>')}</p>`
      : '';
    return html + inicio + pendienteHtml
      + '<h3>Transcripción original completa — verificar antes de guardar</h3>'
      + `<p>${escapar(texto).replace(/\n/g, '<br>')}</p>` + fin;
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

// =====================================
// GENERAR RESUMEN IA DE VISITA GUARDADA
// =====================================

generarResumenVisitaIA(visita: any): void {

  if (!visita || !visita.id) {
    this.mostrarMensaje('La visita debe estar guardada');
    return;
  }

  if (this.generandoIA) {
    return;
  }

  if (!confirm('¿Generar resumen IA de esta visita?')) {
    return;
  }

  this.generandoIA = true;

 const token = localStorage.getItem('token');

if (!token) {
  this.generandoIA = false;
  this.mostrarMensaje('Sesión no disponible. Iniciá sesión nuevamente.');
  return;
}

this.http.post<any>(
  `http://localhost:8080/api/visitas/${visita.id}/generar-resumen-ia`,
  {},
  {
    headers: {
      Authorization: `Bearer ${token}`
    }
  }
).subscribe({

    next: (visitaActualizada) => {

      this.zone.run(() => {

        const index = this.visitas.findIndex(
          v => v.id === visitaActualizada.id
        );

        if (index !== -1) {
          this.visitas[index] = visitaActualizada;
        }

        // Actualizar también el formulario si está abierto
        if (this.nuevaVisita.id === visitaActualizada.id) {
          this.nuevaVisita.resumenIa = visitaActualizada.resumenIa;
          this.nuevaVisita.estadoIa = visitaActualizada.estadoIa;
        }

        this.generandoIA = false;

        this.mostrarMensaje('Resumen IA generado correctamente');

        this.cdr.detectChanges();
      });
    },

    error: (err) => {

      console.error('Error generando resumen IA:', err);

      this.zone.run(() => {

        this.generandoIA = false;

        this.mostrarMensaje(
          err.error?.error || 'No se pudo generar el resumen IA'
        );

        this.cdr.detectChanges();
      });
    }
  });
}


// Fusiona por etiqueta sin borrar ninguna respuesta o edición anterior.
// La IA solo aporta valores nuevos; el profesional revisa el resultado.
private integrarEntrevistaSinBorrar(anterior: string, nueva: string): string {
  if (!anterior.trim()) return nueva;
  const parser = new DOMParser();
  const base = parser.parseFromString(anterior, 'text/html');
  const aporte = parser.parseFromString(nueva, 'text/html');
  const normalizar = (s: string) => s.replace(/\s+/g, ' ').trim().toLocaleLowerCase('es');
  const parrafos = Array.from(base.body.querySelectorAll('p'));
  const pendientes: string[] = [];
  for (const p of Array.from(aporte.body.querySelectorAll('p'))) {
    const nuevoValor = p.querySelector('span.respuesta-entrevista');
    const titulo = p.querySelector('strong');
    if (!nuevoValor || !titulo || !nuevoValor.textContent?.trim()) continue;
    const etiqueta = normalizar(titulo.textContent || '');
    const destino = parrafos.find(x => normalizar(x.querySelector('strong')?.textContent || '') === etiqueta);
    if (!destino) {
      pendientes.push(p.outerHTML);
      continue;
    }
    const dato = nuevoValor.textContent.trim();
    // Evita agregar dos veces exactamente el mismo contenido.
    if (normalizar(destino.textContent || '').includes(normalizar(dato))) continue;
    const nuevoSpan = base.createElement('span');
    nuevoSpan.className = 'respuesta-entrevista';
    nuevoSpan.textContent = dato;
    const existentes = destino.querySelectorAll('span.respuesta-entrevista');
    if (existentes.length) {
      destino.appendChild(base.createTextNode(' | '));
    } else {
      destino.appendChild(base.createTextNode(' '));
    }
    destino.appendChild(nuevoSpan);
  }
  if (pendientes.length) {
    const h = base.createElement('h3');
    h.textContent = 'Información nueva para revisar';
    base.body.appendChild(h);
    const fragmento = parser.parseFromString(pendientes.join(''), 'text/html');
    while (fragmento.body.firstChild) base.body.appendChild(fragmento.body.firstChild);
  }
  return base.body.innerHTML;
}

// Conserva las transcripciones anteriores y añade la nueva sin HTML inyectable.
private anexarNuevaTranscripcion(html: string, texto: string, pendiente = ''): string {
  const escapar = (s: string) => s.replace(/&/g, '&amp;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const pendienteHtml = pendiente.trim()
    ? `<p><strong>Información pendiente de clasificar:</strong> ${escapar(pendiente)}</p>` : '';
  return html + '<h3>Transcripción adicional (revisar)</h3>' +
    `<p>${escapar(texto)}</p>` + pendienteHtml;
}

organizarEntrevistaConIA(): void {

  if (this.organizandoEntrevista) {
    return;
  }

  const texto =
    this.transcripcionPrimeraEntrevista
      .trim();

  if (!texto) {

    this.mostrarMensaje(
      'No hay transcripción para organizar'
    );

    return;
  }

  this.organizandoEntrevista = true;
  this.errorDictado = '';
  this.entrevistaOrganizadaLista = false;
  const solicitudActual = ++this.solicitudEntrevistaId;

  this.mostrarMensaje(
    'Organizando entrevista con IA...'
  );

  this.http.post<any>(
    'http://localhost:8080/api/ia/organizar-entrevista',
    {
      texto: texto
    }
  )
  .subscribe({

    next: (datos) => {

      this.zone.run(() => {
        if (solicitudActual !== this.solicitudEntrevistaId || !this.mostrarPopup) return;

        try {

          const organizada = this.construirEntrevistaConRespuestas(datos);
          // Nunca sustituir la entrevista previa por la respuesta del último dictado.
          const documentoAnterior = String(this.nuevaVisita.observacion || '');
          const combinado = this.integrarEntrevistaSinBorrar(documentoAnterior, organizada);
          this.nuevaVisita.observacion = this.anexarNuevaTranscripcion(
            combinado, texto, typeof datos?.informacion_pendiente === 'string'
              ? datos.informacion_pendiente : ''
          );
          this.nuevaVisita.organizadaConIa = true;
          this.transcripcionPrimeraEntrevista = '';

          this.organizandoEntrevista = false;
          this.entrevistaOrganizadaLista = true;

          this.mostrarMensaje(
            'Entrevista organizada. Revisá los datos antes de guardar'
          );

          this.cdr.detectChanges();

        } catch (error) {

          console.error(
            'Error construyendo entrevista:',
            error
          );

          this.organizandoEntrevista = false;

          this.errorDictado = 'No se pudo organizar. Se conserva el dictado para reintentar.';
          this.mostrarMensaje(
            'Error armando la entrevista'
          );

          this.cdr.detectChanges();
        }
      });
    },

    error: (err) => {

      console.error(
        'Error organizando entrevista:',
        err
      );

      this.zone.run(() => {

        if (solicitudActual !== this.solicitudEntrevistaId || !this.mostrarPopup) return;
        this.organizandoEntrevista = false;
        this.errorDictado = 'Falló la organización. El dictado se conserva para reintentar.';

        this.mostrarMensaje(
          'Error organizando entrevista con IA'
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
// Identificador para ignorar respuestas de turnos seleccionados anteriormente.
private consultaTipoVisitaId = 0;

seleccionarPaciente(pacienteId: number): void {
  // Este método recibe ID de paciente, no ID de historia clínica.
  if (!pacienteId) return;
  this.http.get<boolean>(
    `http://localhost:8080/api/visitas/es-primera/${pacienteId}`
  ).subscribe({
    next: (esPrimera) => {
      this.modoFormulario = esPrimera ? 'PRIMERA_ENTREVISTA' : 'SEGUIMIENTO';
      this.nuevaVisita.tipoVisita = this.modoFormulario;
      if (!esPrimera) this.nuevaVisita.observacion = '';
      this.cdr.detectChanges();
    },
    error: (err) => console.error('Error verificando visitas previas', err)
  });
}

onTurnoSeleccionado(): void {
  if (this.editando) return;
  const pacienteId = this.nuevaVisita.turno?.paciente?.id;
  const turnoId = this.nuevaVisita.turno?.id;
  const consultaActual = ++this.consultaTipoVisitaId;

  // Nunca mostrar el cuestionario anterior mientras se consulta el tipo.
  this.modoFormulario = 'SEGUIMIENTO';
  this.nuevaVisita.tipoVisita = null;
  this.nuevaVisita.observacion = '';
  this.transcripcionPrimeraEntrevista = '';
  this.organizandoEntrevista = false;

  if (!pacienteId || !turnoId) {
    this.cdr.detectChanges();
    return;
  }

  this.http.get<boolean>(
    `http://localhost:8080/api/visitas/es-primera/${pacienteId}`
  ).subscribe({
    next: (esPrimera) => {
      if (consultaActual !== this.consultaTipoVisitaId ||
          this.nuevaVisita.turno?.id !== turnoId || this.editando) return;

      this.modoFormulario = esPrimera ? 'PRIMERA_ENTREVISTA' : 'SEGUIMIENTO';
      this.nuevaVisita.tipoVisita = this.modoFormulario;
      if (esPrimera) {
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

  if (this.grabando || this.deteniendoDictado || this.detenerPrimeraEntrevistaPendiente || this.organizandoEntrevista || this.cargandoVisita || this.verificandoGuardado) {
    this.mostrarMensaje('Esperá a que termine el dictado y la organización con IA');
    return;
  }

  if (this.guardando) {
    return;
  }
  if (this.modoFormulario === 'PRIMERA_ENTREVISTA' && this.transcripcionPrimeraEntrevista.trim()) {
    this.mostrarMensaje('Hay un dictado sin organizar. Reintentá la organización antes de guardar.');
    return;
  }

  if (!this.editando && !this.nuevaVisita.tipoVisita) {
    this.mostrarMensaje('Esperá a que se verifique el tipo de visita');
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

    turno: { id: this.nuevaVisita.turno.id },

    fecha: this.nuevaVisita.fecha,

    tipoVisita: this.nuevaVisita.tipoVisita,

    // El indicador es independiente del resumen clínico opcional.
    organizadaConIa: this.modoFormulario === 'PRIMERA_ENTREVISTA'
      ? (this.entrevistaOrganizadaLista || this.nuevaVisita.organizadaConIa === true)
      : false,

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
      // La respuesta del PUT/POST no prueba que una nueva lectura recupere el contenido.
      const id = visitaGuardada?.id;
      if (!id) {
        this.guardando = false;
        this.mostrarMensaje('El servidor no devolvió un identificador. Verificá antes de reintentar.');
        return;
      }
      this.verificandoGuardado = true;
      this.http.get<any>(`http://localhost:8080/api/visitas/${id}`).subscribe({
        next: (confirmada) => this.zone.run(() => {
          this.guardando = false;
          this.verificandoGuardado = false;
          if (String(confirmada?.observacion ?? '') !== String(payload.observacion ?? '')) {
            this.mostrarMensaje('ATENCIÓN: el contenido recuperado no coincide. No cierres el formulario.');
            return;
          }
          const index = this.visitas.findIndex(v => v.id === id);
          if (index !== -1) this.visitas[index] = confirmada;
          else this.visitas.unshift(confirmada);
          this.mostrarMensaje('Guardado y verificado en el servidor');
          this.cerrarPopup();
          this.cargarVisitas();
          this.cdr.detectChanges();
        }),
        error: (err) => this.zone.run(() => {
          console.error('No se pudo verificar el guardado:', err);
          this.guardando = false;
          this.verificandoGuardado = false;
          this.mostrarMensaje('No se pudo verificar el guardado. No cierres el formulario.');
          this.cdr.detectChanges();
        })
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
  if (!v?.id) { this.mostrarMensaje('Visita inválida'); return; }
  this.cargandoVisita = true;
  const solicitudActual = ++this.solicitudEntrevistaId;
  this.http.get<any>(`http://localhost:8080/api/visitas/${v.id}`).subscribe({
    next: (actual) => this.zone.run(() => {
      if (solicitudActual !== this.solicitudEntrevistaId) return;
      this.cargandoVisita = false;
      if (!actual?.turno?.id) {
        this.mostrarMensaje('La visita no posee turno asociado'); return;
      }
      this.resetFormulario();
      this.editando = true;
      this.mostrarPopup = true;
      this.modoFormulario = actual.tipoVisita ?? 'SEGUIMIENTO';
      if (!this.turnos.some(t => t?.id === actual.turno.id))
        this.turnos = [...this.turnos, actual.turno];
      this.nuevaVisita = {
        id: actual.id,
        turno: actual.turno,
        observacion: actual.observacion || '',
        organizadaConIa: actual.organizadaConIa === true,
        fecha: actual.fecha,
        resumenIa: actual.resumenIa || '',
        estadoIa: actual.estadoIa || null,
        tipoVisita: actual.tipoVisita || null
      };
      this.cdr.detectChanges();
    }),
    error: err => this.zone.run(() => {
      console.error('Error cargando visita:', err);
      this.cargandoVisita = false;
      this.mostrarMensaje('No se pudo recuperar la visita del servidor');
    })
  });
}

cerrarPopup(): void {
  if (this.grabando || this.deteniendoDictado || this.organizandoEntrevista || this.guardando || this.verificandoGuardado || this.cargandoVisita) {
    this.mostrarMensaje('Esperá a que termine el proceso antes de cerrar');
    return;
  }
  if (this.modoFormulario === 'PRIMERA_ENTREVISTA' && this.transcripcionPrimeraEntrevista.trim()) {
    if (!confirm('Hay un dictado pendiente de organizar. Si cerrás, se perderá ese dictado. ¿Cerrar igualmente?')) return;
  }
  this.mostrarPopup = false;
  this.resetFormulario();
}
resetFormulario(): void {
  this.solicitudEntrevistaId++;
  this.consultaTipoVisitaId++;
  this.modoFormulario = 'SEGUIMIENTO';

  this.requestIaId = this.requestIaId || 0;
  this.detenerPrimeraEntrevistaPendiente = false;
  
    this.transcripcionPrimeraEntrevista = '';

  this.organizandoEntrevista = false;
  this.deteniendoDictado = false;
  this.entrevistaOrganizadaLista = false;
  this.errorDictado = '';

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

construirEntrevistaConRespuestas(
  datos: any
): string {

  const respuesta = (
    clave: string
  ): string => {

    const valor =
      datos?.[clave];

    if (
      valor === null ||
      valor === undefined
    ) {

      return '';
    }

    return String(valor).trim();
  };

  const esc = (
    texto: string
  ): string => {

    return texto
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const campo = (
    etiqueta: string,
    clave: string
  ): string => {

    const valor =
      respuesta(clave);

    return `
<p>
  <strong>${etiqueta}:</strong>
  ${valor
    ? `<span class="respuesta-entrevista"> ${esc(valor)}</span>`
    : ''}
</p>`;
  };

  const campoPregunta = (
    etiqueta: string,
    pregunta: string,
    clave: string
  ): string => {

    const valor =
      respuesta(clave);

    return `
<p>
  <strong>${etiqueta}:</strong>
  <em>${pregunta}</em>
  ${valor
    ? `<br><span class="respuesta-entrevista">${esc(valor)}</span>`
    : ''}
</p>`;
  };

  return `

<h2>ENTREVISTA CLÍNICA INICIAL</h2>

<br>

<h3>1. Datos de identificación</h3>

${campo('Nombre completo', 'nombre_completo')}
${campo('Edad', 'edad')}
${campo('Fecha de nacimiento', 'fecha_nacimiento')}
${campo('DNI', 'dni')}
${campo('Dirección actual', 'direccion_actual')}
${campo('Teléfono', 'telefono')}
${campo('Contacto de emergencia', 'contacto_emergencia')}
${campo('Parentesco', 'parentesco')}
${campo('Tel. de emergencia', 'telefono_emergencia')}
${campo('Estudios previos o cursados', 'estudios_previos')}
${campo('Ocupación actual', 'ocupacion_actual')}
${campo('Estado civil', 'estado_civil')}
${campo('Derivado/a por', 'derivado_por')}

<br>

<h3>2. Historia de tratamientos previos</h3>

${campoPregunta(
  'Tratamientos anteriores',
  '¿Ha realizado procesos de psicoterapia previamente? (orientación, duración, motivo, resultados y razón de finalización)',
  'tratamientos_anteriores'
)}

${campoPregunta(
  'Tratamiento farmacológico / psiquiátrico',
  '¿Actualmente o en el pasado ha recibido atención psiquiátrica?',
  'tratamiento_farmacologico_psiquiatrico'
)}

${campo(
  'Medicación psicotrópica actual',
  'medicacion_psicotropica_actual'
)}

${campoPregunta(
  'Historial de internaciones o urgencias',
  '¿Ha tenido episodios previos de crisis graves, ideación suicida, autolesiones o internaciones?',
  'historial_internaciones_urgencias'
)}

${campoPregunta(
  'Balance de tratamientos anteriores',
  '¿Qué cosas de esos tratamientos siente que le sirvieron y cuáles no?',
  'balance_tratamientos_anteriores'
)}

<br>

<h3>3. Motivo de consulta</h3>

${campoPregunta(
  'Motivo principal',
  '¿Cuál es el motivo principal por el cual decidió consultar hoy?',
  'motivo_principal'
)}

${campoPregunta(
  'Hecho reciente',
  '¿Ocurrió algo en particular recientemente que lo/la llevó a pedir esta cita?',
  'hecho_reciente'
)}

${campoPregunta(
  'Expectativas',
  '¿Qué le gustaría lograr o cambiar a través de este espacio terapéutico?',
  'expectativas'
)}

<br>

<h3>4. Historia del problema actual</h3>

${campoPregunta(
  'Inicio y evolución',
  '¿Cuándo comenzó a sentirse así o cuándo notó que este problema empezó a ser un inconveniente?',
  'inicio_evolucion'
)}

${campoPregunta(
  'Situación desencadenante',
  '¿Identifica alguna situación o hecho en particular que crea que desencadenó esto?',
  'situacion_desencadenante'
)}

${campoPregunta(
  'Síntomas',
  '¿Qué síntomas siente?',
  'sintomas'
)}

${campoPregunta(
  'Frecuencia e intensidad',
  '¿Con qué frecuencia e intensidad se presentan los síntomas o la molestia (emocional, conductual, cognitiva)?',
  'frecuencia_intensidad'
)}

${campoPregunta(
  'Momentos de empeoramiento',
  '¿En qué momentos o situaciones nota que estos síntomas empeoran?',
  'momentos_empeoramiento'
)}

<p>
<strong>Cuando aparece esta situación, lo que pasa en:</strong>
</p>

${campoPregunta(
  'Pensamiento',
  '¿Qué pensamientos suelen venirle a la cabeza?',
  'pensamiento'
)}

${campoPregunta(
  'Emoción',
  '¿Qué emociones siente cuando esto pasa y qué sensaciones nota en su cuerpo?',
  'emocion'
)}

${campoPregunta(
  'Conducta',
  '¿Qué suele hacer usted cuando se siente de esa manera?',
  'conducta'
)}

${campoPregunta(
  'Impacto funcional',
  '¿De qué manera esta situación interfiere en sus rutinas cotidianas, trabajo/estudios, relaciones interpersonales o cuidado personal?',
  'impacto_funcional'
)}

${campoPregunta(
  'Estrategias de afrontamiento previas',
  '¿Qué ha intentado hacer hasta ahora para solucionar o gestionar esto? ¿Qué le ha servido y qué no?',
  'estrategias_afrontamiento'
)}

<br>

<h3>5. Antecedentes médicos y farmacológicos</h3>

${campoPregunta(
  'Antecedentes familiares',
  '¿Hay en su familia antecedentes médicos o psiquiátricos?',
  'antecedentes_familiares'
)}

${campoPregunta(
  'Enfermedades médicas o crónicas',
  '¿Padece alguna condición médica, diagnóstico físico o dolor crónico?',
  'enfermedades_medicas_cronicas'
)}

${campoPregunta(
  'Chequeos',
  '¿Se realiza chequeos médicos de manera regular?',
  'chequeos'
)}

${campo(
  'Medicación',
  'medicacion'
)}

<br>

<h3>6. Estructura familiar y redes de apoyo</h3>

${campoPregunta(
  'Composición familiar actual',
  '¿Con quiénes convive actualmente?',
  'composicion_familiar_actual'
)}

${campo(
  'Familia de origen',
  'familia_origen'
)}

${campo(
  'Dinámica relacional e historia familiar',
  'dinamica_relacional_historia_familiar'
)}

${campo(
  'Relación de pareja',
  'descripcion_relacion_pareja'
)}

${campo(
  '¿Tiene pareja actualmente?',
  'tiene_pareja'
)}

${campo(
  '¿Hace cuánto tiempo?',
  'tiempo_pareja'
)}

${campo(
  '¿Cómo describiría la relación con él/ella?',
  'descripcion_relacion_pareja'
)}

${campo(
  '¿Tiene hijos?',
  'tiene_hijos'
)}

${campo(
  '¿Cuántos?',
  'cantidad_hijos'
)}

${campo(
  'Edades, nombres y vínculo con cada uno',
  'edades_nombres_vinculo_hijos'
)}

${campoPregunta(
  'Red de apoyo',
  '¿Con qué personas de su familia o amigos siente que cuenta para buscar apoyo cuando lo necesita?',
  'red_apoyo'
)}

<br>

<h3>7. Hábitos y estilo de vida</h3>

${campo(
  'Hábitos de sueño - ¿Cuántas horas duerme?',
  'horas_sueno'
)}

${campo(
  'Hábitos de sueño - ¿Cómo es la calidad de sueño y descanso?',
  'calidad_sueno'
)}

${campoPregunta(
  'Alimentación',
  '¿Cómo definiría su patrón alimentario actual?',
  'alimentacion'
)}

${campoPregunta(
  'Consumo de sustancias / Adicciones',
  'Consumo de alcohol, tabaco, café u otras sustancias (frecuencia, cantidad y contexto de uso).',
  'consumo_sustancias'
)}

${campoPregunta(
  'Actividad física',
  '¿Realiza alguna actividad física o deportiva?',
  'actividad_fisica'
)}

${campoPregunta(
  'Actividades recreativas',
  '¿Qué actividades le gusta hacer en su tiempo libre o para despejarse?',
  'actividades_recreativas'
)}

${campo(
  '¿Con qué frecuencia las realiza?',
  'frecuencia_actividades_recreativas'
)}

${campoPregunta(
  'Vida social',
  '¿Tiene amigos, familiares o compañeros de trabajo con quienes socializar? ¿Con qué frecuencia se junta con ellos?',
  'vida_social'
)}

<br>

<h3>8. Seguridad y riesgo</h3>

${campoPregunta(
  'Ideación o pensamientos de daño',
  '¿Ha tenido pensamientos de que preferiría no despertar o de hacerse daño en el último tiempo?',
  'ideacion_pensamientos_dano'
)}

${campoPregunta(
  'Capacidad de mantenerse a salvo',
  '¿Siente que la situación actual sobrepasa su capacidad para mantenerse a salvo?',
  'capacidad_mantenerse_a_salvo'
)}

`;

}
}
