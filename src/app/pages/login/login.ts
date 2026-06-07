import { Component,OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login implements OnInit{

  username = '';
  password = '';
  error = '';

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}
ngOnInit(): void {

  if (typeof window !== 'undefined' && localStorage) {
    localStorage.removeItem('token');
    localStorage.removeItem('rol');
  }

}
  ingresar() {
next: (resp: any) => {

  localStorage.setItem('token', resp.token);
  localStorage.setItem('rol', resp.rol); // 👈 ESTO ES CLAVE

  this.router.navigate(['/pacientes']);
}
    this.error = '';

    this.auth.login(
      this.username,
      this.password
    ).subscribe({

      next: () => {

        this.router.navigate(['/pacientes']);
       
      },

      error: () => {
        localStorage.clear();
        this.error = 'Usuario o contraseña incorrectos';
      }
    });
  }
  
}