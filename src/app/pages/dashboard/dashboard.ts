import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

import {
  Chart,
  registerables
} from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit, AfterViewInit {

  @ViewChild('graficoCanvas')
  graficoCanvas!: ElementRef<HTMLCanvasElement>;

  estadisticas: any[] = [];

  resumen: any = {
    totales: 0,
    asistidos: 0,
    ausentes: 0,
    pendientes: 0
  };

  cargando = true;

  chart: any;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.obtenerDatos();
  }

  ngAfterViewInit(): void {}

  obtenerDatos(): void {

    // =========================
    // RESUMEN
    // =========================

    this.http.get<any>(
      'http://localhost:8080/api/turnos/estadisticas/resumen'
    ).subscribe({

      next: (res) => {

        this.resumen = res;

        this.cdr.detectChanges();

      },

      error: (err) => {
        console.error("ERROR RESUMEN:", err);
      }

    });

    // =========================
    // ESTADISTICAS
    // =========================

    this.http.get<any[]>(
      'http://localhost:8080/api/turnos/estadisticas/ausencias'
    ).subscribe({

      next: (data) => {

        this.estadisticas = data;

        this.cargando = false;

        this.cdr.detectChanges();

        // Esperar render del canvas
        setTimeout(() => {
          this.crearGrafico();
        }, 100);

      },

      error: (err) => {

        console.error("ERROR ESTADISTICAS:", err);

        this.cargando = false;

      }

    });

  }

  crearGrafico(): void {

    console.log("CREANDO GRAFICO...");

    if (!this.graficoCanvas) {
      console.error("Canvas no encontrado");
      return;
    }

    const ctx =
      this.graficoCanvas.nativeElement.getContext('2d');

    if (!ctx) {
      console.error("Contexto null");
      return;
    }

    // destruir gráfico anterior
    if (this.chart) {
      this.chart.destroy();
    }

    this.chart = new Chart(ctx, {

      type: 'bar',

      data: {

        labels: this.estadisticas.map(
          e => e.nombre
        ),

        datasets: [

          {
            label: 'Ausencias',

            data: this.estadisticas.map(
              e => e.ausencias
            ),

            // 🔥 COLOR LILA ORIGINAL
            backgroundColor: 'rgba(78, 115, 223, 0.8)',

            borderColor: '#4e73df',

            borderWidth: 1,

            borderRadius: 5
          }

        ]

      },

      options: {

        responsive: true,

        maintainAspectRatio: false,

        plugins: {

          legend: {
            display: false
          }

        },

        scales: {

          y: {

            beginAtZero: true,

            ticks: {
              precision: 0
            }

          },

          x: {

            grid: {
              display: false
            }

          }

        }

      }

    });

  }

}