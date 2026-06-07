import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-respaldos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './respaldos.html',
  styleUrls: ['./respaldos.css']
})
export class RespaldosComponent {

  mensaje = '';
  archivoSeleccionado: File | null = null;

  constructor(private http: HttpClient) {}

  // =========================
  // DESCARGAR BACKUP
  // =========================
 generarBackup(): void {

  console.log('ENTRÓ A generarBackup()');

  const url = 'http://localhost:8080/api/backups/generar';

  this.http.get(url, {
    responseType: 'blob',
    observe: 'response'
  })
  .subscribe({

    next: (response) => {
console.log('HEADERS COMPLETOS:',
      response.headers.keys());

  console.log(
      'CONTENT-DISPOSITION:',
      response.headers.get('Content-Disposition')
  );

      const blob = response.body!;

      let nombreArchivo = 'backup.sql';

      const disposition =
        response.headers.get('Content-Disposition');

      if (disposition) {

        const match =
          disposition.match(/filename="?([^"]+)"?/);

        if (match && match[1]) {
          nombreArchivo = match[1];
        }
      }

      const objectUrl =
        URL.createObjectURL(blob);

      const a =
        document.createElement('a');

      a.href = objectUrl;
      a.download = nombreArchivo;

      document.body.appendChild(a);

      a.click();

      document.body.removeChild(a);

      URL.revokeObjectURL(objectUrl);

      this.mensaje =
        'Backup descargado correctamente';
    },

    error: (err) => {

      console.error(
        'ERROR BACKUP:',
        err
      );

      this.mensaje =
        'Error al generar backup';
    }

  });
}
  // =========================
  // SELECCIONAR ARCHIVO
  // =========================
  seleccionarArchivo(event: any): void {

    this.archivoSeleccionado = event.target.files[0];
  }

  // =========================
  // RESTAURAR BACKUP
  // =========================
  restaurarBackup(): void {

  if (!this.archivoSeleccionado) {
    this.mensaje = 'Selecciona un archivo primero';
    return;
  }

  const formData = new FormData();
  formData.append('file', this.archivoSeleccionado);

  const url =
      'http://localhost:8080/api/backups/restaurar';

  this.http.post(
      url,
      formData,
      {
        responseType: 'text'
      }
  )
  .subscribe({

    next: (respuesta) => {

  this.mensaje = 'Backup restaurado correctamente';

  alert('Backup restaurado correctamente');

},

    error: (err) => {

  console.error(err);

  this.mensaje = 'Error al restaurar el backup. Verifique que el archivo SQL sea válido.';

  alert('Error al restaurar el backup. Verifique que el archivo SQL sea válido.');

}
  });
}
}