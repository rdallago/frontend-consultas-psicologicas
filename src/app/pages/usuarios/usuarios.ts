import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';

import { ChangeDetectorRef } from '@angular/core';


@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './usuarios.html',
  styleUrls: ['./usuarios.css']
})
export class UsuariosComponent implements OnInit {

  usuarios: any[] = [];
  mostrarToast = false;

  mensaje = '';

  nuevoUsuario: any = {
    username: '',
    password: '',
    rol: 'OPERADOR'
  };

constructor(
  private http: HttpClient,
  private cdr: ChangeDetectorRef,
  private auth: AuthService
) {}

ngOnInit(): void {

  this.rolUsuario = this.auth.getRol();

  console.log('ROL LOGUEADO:', this.rolUsuario);

  this.esAdmin = this.rolUsuario === 'ADMIN';
  this.esProfesional = this.rolUsuario === 'PROFESIONAL';

  console.log('esAdmin:', this.esAdmin);
  console.log('esProfesional:', this.esProfesional);

  this.cargarUsuarios();
}


cargarUsuarios(): void {

  this.http.get<any[]>('http://localhost:8080/api/usuarios')
    .subscribe({

      next: data => {

        // 🔥 FILTRO FRONTEND (refuerzo visual)
        if (this.esProfesional) {
          this.usuarios = data.filter(u =>
            u.rol === 'PROFESIONAL' || u.rol === 'OPERADOR'
          );
        } else {
          this.usuarios = data;
        }

        this.cdr.detectChanges();
      },

      error: err => {
        console.error('ERROR GET', err);
      }
    });
}
  
guardar(): void {
if (!this.nuevoUsuario.id &&
    (!this.nuevoUsuario.password || this.nuevoUsuario.password.trim() === '')) {
  alert('La contraseña es obligatoria para crear usuarios');
  return;
}

if (this.nuevoUsuario.id &&
    (!this.nuevoUsuario.password || this.nuevoUsuario.password.trim() === '')) {
  alert('Debe ingresar una nueva contraseña para actualizar');
  return;
}
  if (!this.nuevoUsuario.username ||
      this.nuevoUsuario.username.trim() === '') {

    alert('El nombre de usuario es obligatorio');
    return;
  }

  if (!this.nuevoUsuario.id &&
      (!this.nuevoUsuario.password ||
       this.nuevoUsuario.password.trim() === '')) {

    alert('La contraseña es obligatoria para crear usuarios');
    return;
  }
    
   //VALIDACIONES:
  
  const usuarioExistente = this.usuarios.find(u =>

  u.username.toLowerCase() ===
  this.nuevoUsuario.username.toLowerCase()

  &&

  u.id !== this.nuevoUsuario.id
);

if (usuarioExistente) {

  this.notificar(
    'Ya existe un usuario registrado con ese nombre'
  );

  return;
} 
   const password = this.nuevoUsuario.password || '';

const passwordRegex =
/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.#_-])[A-Za-z\d@$!%*?&.#_-]{6,}$/;

if (!passwordRegex.test(password)) {

  this.notificar(
    'La contraseña debe tener al menos 6 caracteres, una mayúscula, una minúscula, un número y un carácter especial'
  );

  return;
}

  // ==========================
  // ACTUALIZAR
  // ==========================
  if (this.nuevoUsuario.id) {

    const usuarioActualizar = {
      username: this.nuevoUsuario.username,
      password: this.nuevoUsuario.password,
      rol: this.nuevoUsuario.rol
    };

    this.http.put(
      `http://localhost:8080/api/usuarios/${this.nuevoUsuario.id}`,
      usuarioActualizar
    ).subscribe({

      next: (resp) => {

        console.log('PUT OK', resp);

        alert('Usuario actualizado correctamente');

        this.nuevoUsuario = {
          username: '',
          password: '',
          rol: 'OPERADOR'
        };

        this.cargarUsuarios();
      },

      error: (err) => {

        console.error(err);

        alert(
          err?.error?.mensaje ||
          'Error al actualizar usuario'
        );
      }

    });

  }

  // ==========================
  // CREAR
  // ==========================
  else {

    this.http.post(
      'http://localhost:8080/api/usuarios',
      this.nuevoUsuario
    ).subscribe({

      next: (resp) => {

        console.log('POST OK', resp);

        alert('Usuario creado correctamente');

        this.nuevoUsuario = {
          username: '',
          password: '',
          rol: 'OPERADOR'
        };

        this.cargarUsuarios();
      },

      error: (err) => {

        console.error(err);

        alert(
          err?.error?.mensaje ||
          'Error al crear usuario'
        );
      }

    });

  }

}
 eliminar(id: number, usuarioRol: string): void {

  if (this.esProfesional && usuarioRol === 'ADMIN') {
    alert('No puedes eliminar ADMIN');
    return;
  }

  if (!confirm('¿Eliminar usuario?')) return;

  this.http.delete(
    `http://localhost:8080/api/usuarios/${id}`
  ).subscribe(() => this.cargarUsuarios());
}


  editar(usuario: any): void {

  if (this.esProfesional && usuario.rol === 'ADMIN') {
    alert('No puedes editar ADMIN');
    return;
  }

  this.nuevoUsuario = {
    id: usuario.id,
    username: usuario.username,
    password: '',
    rol: usuario.rol
  };
}

rolUsuario: string | null = null;
esAdmin = false;
esProfesional = false;

reactivar(id: number): void {

  if (!confirm('¿Desea reactivar este usuario?')) {
    return;
  }

  this.http.put(
    `http://localhost:8080/api/usuarios/${id}/reactivar`,
    {}
  ).subscribe({

    next: () => {

      alert('Usuario reactivado correctamente');

      this.cargarUsuarios();

    },

    error: (err) => {

      console.error(err);

      alert('No se pudo reactivar el usuario');
    }

  });

}
notificar(texto: string) {

  this.mensaje = texto;

  this.mostrarToast = true;

  setTimeout(() => {

    this.mostrarToast = false;

  }, 3000);
}
}
