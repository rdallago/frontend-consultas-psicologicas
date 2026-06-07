import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css']
})
export class NavbarComponent implements OnInit {

  usuario: string = '';
  rol: string = '';

  constructor(
    public auth: AuthService,
    private router: Router
  ) {}

  // =========================
  // INICIALIZACIÓN SEGURA
  // =========================
  ngOnInit(): void {
    this.cargarUsuarioDesdeToken();
  }

  // =========================
  // TOKEN JWT
  // =========================
  private cargarUsuarioDesdeToken(): void {
    
    // Protección SSR / runtime seguro
    if (typeof window === 'undefined') return;

    const token = window.localStorage.getItem('token');

    if (!token) {
      this.usuario = '';
      this.rol = '';
      return;
    }

    try {
      const payload: any = JSON.parse(atob(token.split('.')[1]));

      this.usuario = payload.sub || '';
      this.rol = payload.rol || '';
      //this.rol = (payload.rol || '').replace('ROLE_', '');
       console.log('ROL CARGADO NAVBAR:', this.rol);
       console.log('TOKEN PAYLOAD:', payload);
       console.log('ROL REAL:', this.rol);

    } catch (error) {
      console.error('Error decodificando token:', error);
      this.usuario = '';
      this.rol = '';
    }
  }

  // =========================
  // LOGOUT
  // =========================
  logout(): void {

    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('token');
      window.localStorage.clear();
    }

    this.auth.logout();
    this.router.navigate(['/login']);
  }

  // =========================
  // ROLES
  // =========================
  esAdmin(): boolean {
    return this.rol === 'ADMIN';
  }

  esProfesional(): boolean {
    return this.rol === 'PROFESIONAL';
  }

  
  // =========================
  // ACCESO RESPALDOS
  // =========================
  puedeVerRespaldos(): boolean {
  const rol = this.auth.getRol();
  return rol === 'ADMIN' || rol === 'PROFESIONAL';
}

///AUTORIZADOS PARA VER USUARIOS:

puedeVerUsuarios(): boolean {

  const rol = this.auth.getRol();

  return rol === 'ADMIN' || rol === 'PROFESIONAL';
}


esOperador(): boolean {
  return this.auth.getRol() === 'OPERADOR';
}
estaLogueado(): boolean {
  return !!this.auth.getUsername();
}
}