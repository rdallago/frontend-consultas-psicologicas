import { Injectable } from '@angular/core';

import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class IaService {

  private apiUrl = 'http://localhost:8080/api/ia';

  constructor(private http: HttpClient) {}

  resumirObservacion(texto: string): Observable<string> {

    return this.http.post(
      `${this.apiUrl}/resumir`,
      { texto },
      {
        responseType: 'text'
      }
    );
  }
}