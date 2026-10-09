import {
  Component,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';

import { FormsModule } from '@angular/forms';

import {
  HttpClient,
  HttpHeaders
} from '@angular/common/http';

@Component({
  selector: 'app-turnos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './turnos.html',
  styleUrls: ['./turnos.css']
})

export class TurnosComponent implements OnInit {

  turnos: any[] = [];

  pacientes: any[] = [];

  dias: (number | null)[] = [];

  mesActual = new Date().getMonth();

  anioActual = new Date().getFullYear();

  mostrarPopup = false;
  soloLectura = false;
  editando = false;

  mostrarToast = false;

  mensaje = '';

  eliminando = false;

  nuevoTurno: any = {

    id: null,

    fechaHora: '',

    pacienteId: '',

    estado: 'AGENDADO',

    motivo: ''
  };

  constructor(

    private http: HttpClient,

    private cd: ChangeDetectorRef

  ) {}

  ngOnInit(): void {

    this.generarCalendario();

    this.cargarPacientes();

    this.cargarTurnos();
  }

  // ==========================
  // PACIENTES
  // ==========================

  cargarPacientes() {

    this.http.get<any[]>(

      'http://localhost:8080/api/pacientes'

    ).subscribe({

      next: (data) => {

        this.pacientes = data;
      },

      error: (err) => {

        console.error(
          'Error cargando pacientes',
          err
        );
      }
    });
  }

  // ==========================
  // TURNOS
  // ==========================

  cargarTurnos() {

    this.http.get<any[]>(

      'http://localhost:8080/api/turnos'

    ).subscribe({

      next: (data) => {

        this.turnos = data;

        this.cd.detectChanges();
      },

      error: (err) => {

        console.error(
          'Error cargando turnos',
          err
        );
      }
    });
  }

  // ==========================
  // CALENDARIO
  // ==========================

generarCalendario() {

  this.dias = [];

  // Día de la semana en que comienza el mes
  const primerDia = new Date(
    this.anioActual,
    this.mesActual,
    1
  ).getDay();

  // JavaScript:
  // Domingo = 0
  // Lunes   = 1
  // Martes  = 2
  // Miércoles = 3
  // Jueves  = 4
  // Viernes = 5
  // Sábado  = 6
  //
  // Nuestro calendario comienza en Lunes.
  const posicionInicial = (primerDia + 6) % 7;

  // Espacios vacíos antes del día 1
  for (let i = 0; i < posicionInicial; i++) {

    this.dias.push(null);
  }

  // Cantidad de días del mes
  const cantidadDias = new Date(
    this.anioActual,
    this.mesActual + 1,
    0
  ).getDate();

  // Agregar los días reales
  for (let dia = 1; dia <= cantidadDias; dia++) {

    this.dias.push(dia);
  }
}

cambiarMes(valor: number) {

  this.mesActual += valor;

  if (this.mesActual > 11) {

    this.mesActual = 0;
    this.anioActual++;
  }

  if (this.mesActual < 0) {

    this.mesActual = 11;
    this.anioActual--;
  }

  this.generarCalendario();
}

  // ==========================
  // FORMULARIO
  // ==========================

  abrirFormulario(dia: number) {

    const fecha =

      `${this.anioActual}-${String(this.mesActual + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}T09:00`;

    this.nuevoTurno = {

      id: null,

      fechaHora: fecha,

      pacienteId: '',

      estado: 'AGENDADO',

      motivo: ''
    };

    this.editando = false;

    this.mostrarPopup = true;
  }

editarTurno(turno: any) {

  this.nuevoTurno = {

    id: turno.id,

    fechaHora:
      turno.fechaHora.substring(0, 16),

    pacienteId:
      turno.paciente?.id,

    estado:
      turno.estado,

    motivo:
      turno.motivo || ''
  };

  // =========================================
  // TURNO ASISTIDO = SOLO LECTURA
  // =========================================

  if (turno.estado === 'ASISTIO') {

    this.notificar(
      'Los turnos asistidos solo pueden modificarse desde Visitas, pudiendo cambiar solo la observación'
    );

    this.soloLectura = true;

    this.editando = true;

    this.mostrarPopup = true;

    return;
  }

  // =========================================
  // EDICIÓN NORMAL
  // =========================================

  this.soloLectura = false;

  this.editando = true;

  this.mostrarPopup = true;
}

  // ==========================
  // GUARDAR
  // ==========================

  guardarTurno() {

    const estadoActual =

      String(this.nuevoTurno.estado || '')

        .trim()

        .toUpperCase();

    // ==========================
    // VALIDAR PACIENTE
    // ==========================

    if (!this.nuevoTurno.pacienteId) {

      this.notificar(
        'Debe seleccionar un paciente'
      );

      return;
    }

    // ==========================
    // VALIDAR MOTIVO
    // ==========================

    if (

      (
        estadoActual === 'AUSENTE' ||

        estadoActual === 'CANCELADO'
      )

      &&

      !this.nuevoTurno.motivo?.trim()

    ) {

      this.notificar(
        'Debe ingresar un motivo'
      );

      return;
    }

    // ==========================
    // VALIDAR SUPERPOSICIÓN
    // ==========================

    if (

      estadoActual !== 'AUSENTE' &&

      estadoActual !== 'CANCELADO'

    ) {

      const nuevaFecha =

        new Date(this.nuevoTurno.fechaHora);

      const conflicto = this.turnos.some(t => {

        // ignorar mismo turno
        if (

          this.editando &&

          t.id === this.nuevoTurno.id

        ) {

          return false;
        }

        const estadoExistente =

          String(t.estado || '')

            .trim()

            .toUpperCase();

        // ignorar ausentes/cancelados
        if (

          estadoExistente === 'AUSENTE' ||

          estadoExistente === 'CANCELADO'

        ) {

          return false;
        }

        const fechaExistente =

          new Date(t.fechaHora);

        const diferencia =

          Math.abs(

            nuevaFecha.getTime() -

            fechaExistente.getTime()

          ) / 60000;

        return diferencia < 40;
      });

      if (conflicto) {

        this.notificar(

          'Debe existir al menos 40 minutos entre turnos'

        );

        return;
      }
    }

    // ==========================
    // BODY JSON
    // ==========================

    const body = {

      fechaHora:
        this.nuevoTurno.fechaHora + ':00',

      estado:
        estadoActual,

      motivo:
        this.nuevoTurno.motivo || '',

      paciente: {

        id: Number(
          this.nuevoTurno.pacienteId
        )
      }
    };

    console.log(
      'BODY ENVIADO:',
      body
    );

    // ==========================
    // HEADERS
    // ==========================

    const options = {

      headers: new HttpHeaders({

        'Content-Type': 'application/json'
      })
    };

    // ==========================
    // REQUEST
    // ==========================

    const request = this.editando

      ? this.http.put(

          `http://localhost:8080/api/turnos/${this.nuevoTurno.id}`,

          body,

          options
        )

      : this.http.post(

          `http://localhost:8080/api/turnos`,

          body,

          options
        );

    request.subscribe({

      next: () => {

        this.notificar(

          this.editando

            ? 'Turno actualizado'

            : 'Turno agendado'
        );

        this.cerrarPopup();

        this.cargarTurnos();

        this.cd.detectChanges();
      },

      error: (err) => {

        console.error(
          'ERROR COMPLETO:',
          err
        );

        this.notificar(

          err?.error?.message ||

          'No se pudo guardar'
        );
      }
    });
  }

  // ==========================
  // ELIMINAR
  // ==========================

  eliminarTurno() {

    if (this.eliminando) return;

    this.eliminando = true;

    this.http.delete(

      `http://localhost:8080/api/turnos/${this.nuevoTurno.id}`,

      {

        responseType: 'text',

        observe: 'response'
      }

    ).subscribe({

      next: (resp) => {

        this.eliminando = false;

        this.notificar(

          resp.body ||

          'Turno eliminado'
        );

        this.cerrarPopup();

        this.cargarTurnos();
      },

      error: (err) => {

        this.eliminando = false;

        let mensaje =
          'No se pudo eliminar el turno';

        if (typeof err.error === 'string') {

          mensaje = err.error;
        }

        else if (err.error?.text) {

          mensaje = err.error.text;
        }

        else if (err.message) {

          mensaje = err.message;
        }

        this.notificar(mensaje);

        this.cd.detectChanges();
      }
    });
  }

  // ==========================
  // CERRAR POPUP
  // ==========================

  cerrarPopup() {

    this.mostrarPopup = false;

    this.editando = false;
    this.soloLectura = false;

    this.eliminando = false;

    this.nuevoTurno = {

      id: null,

      fechaHora: '',

      pacienteId: '',

      estado: 'AGENDADO',

      motivo: ''
    };

    this.cd.detectChanges();
  }

  // ==========================
  // TOAST
  // ==========================

  notificar(texto: string) {

    this.mensaje = texto;

    this.mostrarToast = true;

    setTimeout(() => {

      this.mostrarToast = false;

    }, 2200);
  }

  // ==========================
  // TURNOS DEL DÍA
  // ==========================

 turnosDelDia(dia: number) {

  return this.turnos.filter(t => {

    const fechaHora = String(t.fechaHora || '');

    const fecha = fechaHora.substring(0, 10);

    const [anio, mes, diaTurno] =
      fecha.split('-').map(Number);

    return (
      diaTurno === dia &&
      mes === this.mesActual + 1 &&
      anio === this.anioActual
    );
  });
}
}