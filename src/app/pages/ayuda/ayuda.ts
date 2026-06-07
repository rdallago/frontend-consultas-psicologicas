import { Component,OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ayuda',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ayuda.html',
  styleUrls: ['./ayuda.css']
})
/*export class AyudaComponent {

  seccionActual = 'inicio';

  mostrar(seccion: string): void {
    this.seccionActual = seccion;
  }
  
*/

export class AyudaComponent implements OnInit {

  ngOnInit(): void {
    console.log('AYUDA INICIALIZADA');
  }

}