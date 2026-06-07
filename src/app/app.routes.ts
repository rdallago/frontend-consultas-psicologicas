import { authGuard } from './guards/auth.guard';
import { usuariosGuard } from './guards/usuarios.guard';
import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Pacientes } from './pages/pacientes/pacientes';
import { PacienteForm } from './pages/paciente-form/paciente-form';
import { TurnosComponent } from './pages/turnos/turnos';
import { HistoriaClinicaComponent } from './pages/historia-clinica/historia-clinica';
import { VisitasComponent } from './pages/visitas/visitas';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { UsuariosComponent } from './pages/usuarios/usuarios';
import { RespaldosComponent } from './pages/respaldos/respaldos';
import { AyudaComponent } from './pages/ayuda/ayuda';


export const routes: Routes = [
  // 1. Redirección inicial (Cuando entras a la raíz)
  { path: '', redirectTo: 'pacientes', pathMatch: 'full' },

  // 2. Rutas principales
   {path: 'login', component: Login},


   { path: 'pacientes', component: Pacientes, canActivate: [authGuard] },
   { path: 'historias', component: HistoriaClinicaComponent, canActivate: [authGuard] },
   { path: 'turnos', component: TurnosComponent,canActivate: [authGuard] },
   { path: 'visitas',component: VisitasComponent,canActivate: [authGuard]},
   { path: 'dashboard', component: DashboardComponent },
  // 3. Rutas de formulario de pacientes
  { path: 'pacientes/nuevo', component: PacienteForm,canActivate: [authGuard] },
  { path: 'pacientes/editar/:id', component: PacienteForm,canActivate: [authGuard] },
  { path: 'usuarios',component: UsuariosComponent,canActivate: [authGuard,usuariosGuard]},
  { path: 'respaldos',component: RespaldosComponent,canActivate: [authGuard]},
  { path: 'ayuda',component: AyudaComponent},
  // 4. Ruta comodín (Si escriben cualquier otra cosa, vuelve a paciente)

  { path: '**', redirectTo: 'pacientes' },
 
 
];