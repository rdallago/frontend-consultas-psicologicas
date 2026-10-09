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
  paciente: any = this.pacienteVacio();
  esEdicion = false;
  cargando = false;
  guardando = false;
  errorCarga = '';

  constructor(
    private service: PacienteService,
    private router: Router,
    private route: ActivatedRoute,
    private cd: ChangeDetectorRef
  ) {}

  private pacienteVacio(): any {
    return {
      nombre: '', apellido: '', dni: '', email: '', telefono: '',
      direccion: '', fechaNacimiento: null, fechaInicioTratamiento: null,
      edad: null
    };
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      this.esEdicion = idParam !== null;
      this.errorCarga = '';
      this.paciente = this.pacienteVacio();

      if (!this.esEdicion) {
        this.cargando = false;
        this.cd.detectChanges();
        return;
      }

      const id = Number(idParam);
      if (!Number.isInteger(id) || id <= 0) {
        this.errorCarga = 'El identificador del paciente no es válido.';
        this.cargando = false;
        this.cd.detectChanges();
        return;
      }

      this.cargando = true;
      this.cd.detectChanges();
      this.service.obtenerPorId(id).subscribe({
        next: (data: any) => {
          if (!data || typeof data !== 'object' || !data.id) {
            this.errorCarga = 'El servidor no devolvió un paciente válido.';
          } else {
            this.paciente = {
              ...this.pacienteVacio(),
              ...data,
              fechaNacimiento: data.fechaNacimiento ?? null,
              fechaInicioTratamiento: data.fechaInicioTratamiento ?? null
            };
            this.calcularEdad();
          }
          this.cargando = false;
          this.cd.detectChanges();
        },
        error: (err: any) => {
          console.error('Error al cargar paciente:', err);
          this.errorCarga = 'No se pudieron cargar los datos del paciente.';
          this.cargando = false;
          this.cd.detectChanges();
        }
      });
    });
  }

  calcularEdad(): void {
    if (!this.paciente) return;
    const fecha = this.paciente.fechaNacimiento;
    this.paciente.edad = null;
    if (typeof fecha !== 'string') return;

    const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
    if (!partes) return;
    const anio = Number(partes[1]);
    const mes = Number(partes[2]);
    const dia = Number(partes[3]);
    const nacimiento = new Date(anio, mes - 1, dia);
    const hoy = new Date();
    if (nacimiento.getFullYear() !== anio || nacimiento.getMonth() !== mes - 1 ||
        nacimiento.getDate() !== dia || nacimiento > hoy) return;

    let edad = hoy.getFullYear() - anio;
    if (hoy.getMonth() + 1 < mes ||
        (hoy.getMonth() + 1 === mes && hoy.getDate() < dia)) edad--;
    this.paciente.edad = edad;
  }

  guardar(): void {
    if (this.cargando || this.guardando || this.errorCarga || !this.paciente) return;
    if (!this.paciente.nombre?.trim() || !this.paciente.apellido?.trim()) {
      alert('Complete los campos obligatorios');
      return;
    }
    // La edad es solo visual: no se envía al backend ni se guarda en MySQL.
    const { edad, ...datosPaciente } = this.paciente;
    this.guardando = true;
    const peticion = this.esEdicion
      ? this.service.actualizar(this.paciente.id, datosPaciente)
      : this.service.crear(datosPaciente);
    peticion.subscribe({
      next: () => {
        this.guardando = false;
        alert(this.esEdicion ? 'Paciente actualizado' : 'Paciente creado');
        this.router.navigate(['/pacientes']);
      },
      error: (err: any) => {
        this.guardando = false;
        console.error('Error al guardar paciente:', err);
        alert(this.esEdicion ? 'Error al actualizar el paciente' : 'Error al crear el paciente');
        this.cd.detectChanges();
      }
    });
  }

  volver(): void {
    this.router.navigate(['/pacientes']);
  }
}
