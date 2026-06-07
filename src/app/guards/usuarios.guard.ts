import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const usuariosGuard: CanActivateFn = () => {

  const auth = inject(AuthService);
  const router = inject(Router);

  const rol = auth.getRol();

  if (
      rol === 'ADMIN' ||
      rol === 'PROFESIONAL'
  ) {
      return true;
  }

  alert(
    'No posee permisos para acceder a Gestión de Usuarios'
  );

  router.navigate(['/dashboard']);

  return false;
};