import { Component, OnInit, ChangeDetectorRef, ViewEncapsulation } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-historia-clinica',
  standalone: true,
  templateUrl: './historias.html',
  styleUrls: ['./historias.css'],
  imports: [CommonModule, FormsModule],
  encapsulation: ViewEncapsulation.None // 🔥 CLAVE PARA QUE SE APLIQUE EL CSS
})
export class HistoriaClinicaComponent implements OnInit {

  historias: any[] = [];
  pacientes: any[] = [];
  historiasOriginal: any[] = [];
  filtroNombre: string = '';

  pacienteSeleccionadoId: number | null = null;
  fechaHistoria: string = new Date().toISOString().split('T')[0];

  mostrarFormulario = false;
  cargando = true;

  // 🔥 EDICIÓN
  editandoId: number | null = null;
  nuevaFechaEdicion: string = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarListas();
  }

  cargarListas() {

    this.cargando = true;

    this.http.get<any[]>('http://localhost:8080/api/historias')
      .subscribe({
        next: (res) => {
          this.historias = res;
          this.historiasOriginal = res;
          this.cargando = false;
          this.cd.detectChanges();
        },
        error: () => {
          this.cargando = false;
        }
      });

    this.http.get<any[]>('http://localhost:8080/api/pacientes')
      .subscribe(res => this.pacientes = res);
  }
  filtrar() {

  this.historias = this.historiasOriginal.filter(h => {

    const nombreCompleto =
      `${h.paciente?.nombre} ${h.paciente?.apellido}`
      .toLowerCase();

    return nombreCompleto.includes(
      this.filtroNombre.toLowerCase()
    );
  });
}

 guardarHistoria() {

  if (!this.pacienteSeleccionadoId) {
    alert("Debe seleccionar un paciente.");
    return;
  }

const payload = {
  paciente: {
    id: Number(this.pacienteSeleccionadoId)
  },
  fechaCreacion: this.fechaHistoria
};
console.log("JSON ENVIADO:", payload);
  this.http.post(
    'http://localhost:8080/api/historias',
    payload,
    {
      headers: { 'Content-Type': 'application/json' } // 🔥 CLAVE
    }
  ).subscribe({
    next: () => {
      alert("Historia creada correctamente");
      this.mostrarFormulario = false;
      this.cargarListas();
    },
    error: (err) => {
      console.error("ERROR BACKEND:", err);
      alert(err.error?.message || "Error al crear la historia");
    }
  });
}
  // =========================
  // 🔥 EDICIÓN
  // =========================

  iniciarEdicion(h: any) {
    this.editandoId = h.id;
    this.nuevaFechaEdicion = h.fechaCreacion;
  }

  guardarEdicion(h: any) {

    if (!this.nuevaFechaEdicion) {
      alert("Seleccione una fecha");
      return;
    }

    const payload = {
      fechaCreacion: this.nuevaFechaEdicion
    };

    this.http.put(
      `http://localhost:8080/api/historias/${h.id}`,
      payload
    ).subscribe({
      next: () => {
        alert("Historia actualizada correctamente");
        this.editandoId = null;
        this.cargarListas();
      },
      error: (err) => {
        console.error("ERROR REAL:", err);
        alert(err.error?.message || "Error al actualizar");
      }
    });
  }

  cancelarEdicion() {
    this.editandoId = null;
  }

eliminarHistoria(h: any) {

  console.log("🔥 CLICK ELIMINAR");
  console.log("Historia:", h);

  if (!confirm("¿Eliminar historia?")) {
    console.log("Cancelado");
    return;
  }

  console.log("Enviando DELETE...");

  this.http.delete(
    `http://localhost:8080/api/historias/${h.id}`,
    { responseType: 'text' }
  ).subscribe({

    next: (res) => {

      console.log("ELIMINADO OK");
      console.log(res);

      alert("Historia eliminada");

      this.cargarListas();
    },

    error: (err) => {

      console.error("ERROR DELETE:", err);

      alert("Error al eliminar");
    }
  });
} 

generarInforme(h: any) {
  alert("Informe próximamente");
}

}