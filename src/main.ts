
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// ==========================================
// REINICIO DE SESION DESDE EL SCRIPT .BAT
// ==========================================

if (typeof window !== 'undefined') {

  const parametros = new URLSearchParams(
    window.location.search
  );

  if (parametros.get('reiniciarSesion') === '1') {

    // Eliminar JWT anterior
    localStorage.removeItem('token');
    localStorage.removeItem('rol');

    // Eliminar el parametro sin cambiar la ruta
    parametros.delete('reiniciarSesion');

    const query = parametros.toString();

    const urlLimpia =
      window.location.pathname +
      (query ? '?' + query : '') +
      window.location.hash;

    window.history.replaceState(
      null,
      '',
      urlLimpia
    );

    console.log('Sesion anterior eliminada. Se requiere login.');
  }
}

// Iniciar Angular normalmente
bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
