import { Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { Pacientes } from './pages/pacientes/pacientes';
import { PacienteForm } from './pages/paciente-form/paciente-form';
import { TurnosComponent } from './pages/turnos/turnos';
import { HistoriaClinicaComponent } from './pages/historia-clinica/historia-clinica';
import { VisitasComponent } from './pages/visitas/visitas';

export const routes: Routes = [
  // 1. Redirección inicial (Cuando entras a la raíz)
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

  // 2. Rutas principales
  { path: 'dashboard', component: DashboardComponent },
  { path: 'historias', component: HistoriaClinicaComponent },
  { path: 'pacientes', component: Pacientes },
  { path: 'turnos', component: TurnosComponent },
  { path: 'visitas',component: VisitasComponent},

  // 3. Rutas de formulario de pacientes
  { path: 'pacientes/nuevo', component: PacienteForm },
  { path: 'pacientes/editar/:id', component: PacienteForm },

  // 4. Ruta comodín (Si escriben cualquier otra cosa, vuelve al dashboard)
  { path: '**', redirectTo: 'dashboard' }
];