import { Routes } from '@angular/router';

import { Pacientes } from './pages/pacientes/pacientes';
import { TurnosComponent } from './pages/turnos/turnos';

export const routes: Routes = [
  { path: '', redirectTo: 'pacientes', pathMatch: 'full' },

  { path: 'pacientes', component: Pacientes },

  { path: 'turnos', component: TurnosComponent }
];