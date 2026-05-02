import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PacienteService {

  private apiUrl = 'http://localhost:8080/pacientes';

  constructor(private http: HttpClient) {}

  // 🔹 Obtener todos los pacientes
  listar(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  // 🔹 Obtener un paciente por ID
  obtenerPorId(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  // 🔹 Crear paciente
  crear(paciente: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, paciente);
  }

  // 🔹 Actualizar paciente
  actualizar(id: number, paciente: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, paciente);
  }

  // 🔹 Eliminar paciente
  eliminar(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }


}