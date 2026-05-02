import { Router } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { PacienteService } from '../../services/paciente';

@Component({
  selector: 'app-pacientes',
  standalone: true,
  imports: [CommonModule, FormsModule], 
  templateUrl: './pacientes.html',
  styleUrls: ['./pacientes.css']
})
export class Pacientes implements OnInit {

  pacientes: any[] = [];
  pacientesOriginal: any[] = [];
  filtroNombre: string = '';

  constructor(
    private service: PacienteService,
    private cd: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit() {
    this.cargarPacientes();
  }

  cargarPacientes() {
    this.service.listar().subscribe({
      next: (data: any[]) => {
        this.pacientes = data;
        this.pacientesOriginal = data;
        this.cd.detectChanges();
      },
      error: (err: any) => {
        console.error(err);
      }
    });
  }

  filtrar() {
    this.pacientes = this.pacientesOriginal.filter(p =>
      p.nombre.toLowerCase().includes(this.filtroNombre.toLowerCase())
    );
  }

  nuevo() {
    this.router.navigate(['/pacientes/nuevo']);
  }

  editar(p: any) {
    this.router.navigate(['/pacientes/editar', p.id]);
  }

 eliminar(p: any) {
  console.log("Intentando eliminar:", p); // 👈 DEBUG

  const confirmacion = confirm(`¿Eliminar paciente ${p.nombre}?`);
  if (!confirmacion) return;

  this.service.eliminar(p.id).subscribe({
    next: () => {
      console.log("Eliminado OK"); // 👈 DEBUG
      alert("Paciente eliminado correctamente");
      this.cargarPacientes();
    },
    error: (err: any) => {
      console.error("Error al eliminar:", err); // 👈 DEBUG

      if (err.status === 400) {
        alert("No se puede eliminar: tiene turnos o historia clínica");
      } else {
        alert("Error al eliminar el paciente");
      }
    }
  });
}
}