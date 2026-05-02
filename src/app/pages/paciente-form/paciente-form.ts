import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { PacienteService } from '../../services/paciente';

@Component({
  selector: 'app-paciente-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './paciente-form.html'
})
export class PacienteForm implements OnInit {

  paciente: any = null;
  esEdicion: boolean = false;

  constructor(
    private service: PacienteService,
    private router: Router,
    private route: ActivatedRoute,
    private cd: ChangeDetectorRef
  ) {
    // 🔥 Evita reutilización del componente
    this.router.routeReuseStrategy.shouldReuseRoute = () => false;
  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');

      console.log("ID recibido:", idParam);

      if (idParam) {
        const id = Number(idParam);
        this.esEdicion = true;

        this.service.obtenerPorId(id).subscribe({
          next: (data) => {
            console.log("Paciente recibido:", data);

            // 🔥 CLAVE
            this.paciente = { ...data };

            // 🔥 FORZAR ACTUALIZACIÓN DE VISTA
            this.cd.detectChanges();
          },
          error: (err) => {
            console.error("Error al cargar paciente:", err);
          }
        });

      } else {
        // 👉 Nuevo paciente
        this.paciente = {};
      }
    });
  }

guardar() {
  if (!this.paciente.nombre || !this.paciente.dni) {
    alert('Complete los campos obligatorios');
    return;
  }

  if (this.esEdicion) {
    this.service.actualizar(this.paciente.id, this.paciente).subscribe(() => {
      alert('Paciente actualizado');
      this.router.navigate(['/pacientes']);
    });
  } else {
    this.service.crear(this.paciente).subscribe(() => {
      alert('Paciente creado');
      this.router.navigate(['/pacientes']);
    });
  }
}
  volver() {
    this.router.navigate(['/pacientes']);
  }
}