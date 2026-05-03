import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-turnos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './turnos.html',
  styleUrls: ['./turnos.css']
})
export class TurnosComponent implements OnInit {

  turnos: any[] = [];
  pacientes: any[] = [];
  dias: number[] = [];

  mesActual = new Date().getMonth();
  anioActual = new Date().getFullYear();

  mostrarPopup = false;
  editando = false;

  mostrarToast = false;
  mensaje = '';

  eliminando = false;

  nuevoTurno: any = {
    id: null,
    fechaHora: '',
    pacienteId: '',
    estado: 'AGENDADO'
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

  cargarPacientes() {
    this.http.get<any[]>('http://localhost:8080/pacientes')
      .subscribe(data => {
        this.pacientes = data;
      });
  }

  cargarTurnos() {
    this.http.get<any[]>('http://localhost:8080/api/turnos')
      .subscribe(data => {
        this.turnos = data;
        this.cd.detectChanges();
      });
  }

  generarCalendario() {
    this.dias = [];

    const cantidadDias = new Date(
      this.anioActual,
      this.mesActual + 1,
      0
    ).getDate();

    for (let i = 1; i <= cantidadDias; i++) {
      this.dias.push(i);
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

  abrirFormulario(dia: number) {

    const fecha =
      `${this.anioActual}-${String(this.mesActual + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}T09:00`;

    this.nuevoTurno = {
      id: null,
      fechaHora: fecha,
      pacienteId: '',
      estado: 'AGENDADO'
    };

    this.editando = false;
    this.mostrarPopup = true;
  }

  editarTurno(turno: any) {

    this.nuevoTurno = {
      id: turno.id,
      fechaHora: turno.fechaHora.substring(0, 16),
      pacienteId: turno.paciente?.id,
      estado: turno.estado
    };

    this.editando = true;
    this.mostrarPopup = true;
  }

  guardarTurno() {

    const estadoActual = String(this.nuevoTurno.estado || '')
      .trim()
      .toUpperCase();

    const body = {
      fechaHora: this.nuevoTurno.fechaHora,
      estado: estadoActual,
      paciente: {
        id: this.nuevoTurno.pacienteId
      }
    };

    const request = this.editando
      ? this.http.put(
          `http://localhost:8080/api/turnos/${this.nuevoTurno.id}`,
          body
        )
      : this.http.post(
          `http://localhost:8080/api/turnos`,
          body
        );

    const nuevaFecha = new Date(this.nuevoTurno.fechaHora);

    const conflicto = this.turnos.some(t => {

      if (this.editando && t.id === this.nuevoTurno.id) {
        return false;
      }

      const fechaExistente = new Date(t.fechaHora);

      const diferencia =
        Math.abs(
          nuevaFecha.getTime() - fechaExistente.getTime()
        ) / 60000;

      return diferencia < 40;
    });

    if (conflicto) {
      this.notificar(
        'No se puede guardar. Hay superposición o menos de 40 minutos con otro turno.'
      );
      return;
    }

    request.subscribe({
      next: () => {

        this.cerrarPopup();
        this.cargarTurnos();

        this.notificar(
          this.editando
            ? 'Turno actualizado'
            : 'Turno agendado'
        );

        this.cd.detectChanges();
      },

      error: () => {
        this.notificar('No se pudo guardar');
      }
    });
  }

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

      this.notificar(resp.body || 'Turno eliminado');

      this.cerrarPopup();

      this.cargarTurnos();
    },

    error: (err) => {

      this.eliminando = false;

      let mensaje = 'No se pudo eliminar el turno';

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




  cerrarPopup() {

    this.mostrarPopup = false;
    this.editando = false;
    this.eliminando = false;

    this.nuevoTurno = {
      id: null,
      fechaHora: '',
      pacienteId: '',
      estado: 'AGENDADO'
    };

    this.cd.detectChanges();
  }

  notificar(texto: string) {

    this.mensaje = texto;
    this.mostrarToast = true;

    setTimeout(() => {
      this.mostrarToast = false;
    }, 2200);
  }

  turnosDelDia(dia: number) {

    const fecha =
      `${this.anioActual}-${String(this.mesActual + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

    return this.turnos.filter(
      t => t.fechaHora.startsWith(fecha)
    );
  }
}