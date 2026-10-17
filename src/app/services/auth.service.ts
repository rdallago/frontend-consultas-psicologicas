import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { jwtDecode } from 'jwt-decode';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private api = 'http://localhost:8080/api/auth';

  constructor(private http: HttpClient) {}

  login(username: string, password: string) {

    return this.http.post<any>(
      `${this.api}/login`,
      {
        username,
        password
      }
    ).pipe(
      tap(response => {

        if (typeof window !== 'undefined') {

          localStorage.setItem(
            'token',
            response.token
          );
        }
      })
    );
  }

  logout() {

    if (typeof window !== 'undefined') {

      localStorage.removeItem('token');
      localStorage.removeItem('rol');
    }
  }

  getToken(): string | null {

    if (typeof window === 'undefined') {
      return null;
    }

    return localStorage.getItem('token');
  }

  isLogged(): boolean {

  const token = this.getToken();

  if (!token) {
    return false;
  }

  try {

    const payload: any = jwtDecode(token);

    if (!payload.exp) {
      return false;
    }

    const ahora = Math.floor(Date.now() / 1000);

    if (payload.exp <= ahora) {
      this.logout();
      return false;
    }

    return true;

  } catch (error) {

    this.logout();
    return false;
  }
}
  getRol(): string {

    const token = this.getToken();

    if (!token) {
      return '';
    }

    const payload: any = jwtDecode(token);

    return payload.rol;
  }

  isAdmin(): boolean {

    return this.getRol() === 'ADMIN';
  }

  isProfesional(): boolean {

    return this.getRol() === 'PROFESIONAL';
  }

  isOperador(): boolean {

    return this.getRol() === 'OPERADOR';
  }

  getUsername(): string {

    const token = this.getToken();

    if (!token) {
      return '';
    }

    const payload: any = jwtDecode(token);

    return payload.sub;
  }
}