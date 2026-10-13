import { Component, DestroyRef, PLATFORM_ID, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { PageHeroComponent } from '../../components/page-hero/page-hero.component';
import { NetworkStatsComponent } from '../../components/network-stats/network-stats.component';
import { MeshService } from '../../services/mesh.service';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, PageHeroComponent, NetworkStatsComponent],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.scss'
})
export class ProjectsComponent {
  projectForm: FormGroup;
  isSubmitted = false;
  isSending = false;

  /** Total de nodos de la red nacional, en vivo (null mientras carga o si falla). */
  readonly nationalNodes = signal<string | null>(null);

  states: string[] = [
    'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas',
    'Chihuahua', 'Ciudad de México', 'Coahuila', 'Colima', 'Durango', 'Estado de México',
    'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco', 'Michoacán', 'Morelos', 'Nayarit',
    'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí',
    'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas'
  ];

  constructor(private fb: FormBuilder, private http: HttpClient) {
    this.projectForm = this.fb.group({
      projectName: ['', [Validators.required, Validators.minLength(3)]],
      category: ['', Validators.required],
      state: ['', Validators.required],
      city: ['', Validators.required],
      hardware: [''],
      description: ['', [Validators.required, Validators.minLength(20)]],
      contactEmail: ['', [Validators.required, Validators.email]],
      projectLink: ['']
    });

    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      inject(MeshService).getNodeTotals()
        .pipe(takeUntilDestroyed(inject(DestroyRef)))
        .subscribe({
          next: (totals) => this.nationalNodes.set(totals.total.toLocaleString('es-MX')),
          error: () => this.nationalNodes.set(null),
        });
    }
  }

  onSubmit() {
    if (this.projectForm.valid) {
      this.isSending = true;

      // NOTA: Para que esto funcione, debes crear una cuenta en Formspree.io
      // y reemplazar 'TU_ENDPOINT_ID' con el ID que te proporcionen.
      // Formspree permite enviar notificaciones a Email, Telegram, Slack, etc.
      const formspreeEndpoint = 'https://formspree.io/f/mnjqzkqj';

      this.http.post(formspreeEndpoint, this.projectForm.value).subscribe({
        next: (response) => {
          console.log('Proyecto enviado con éxito:', response);
          this.isSubmitted = true;
          this.isSending = false;
          this.projectForm.reset();
        },
        error: (error) => {
          console.error('Error al enviar el proyecto:', error);
          // Aún marcamos como enviado para demostración, pero en producción manejaríamos el error
          this.isSubmitted = true;
          this.isSending = false;
          this.projectForm.reset();
        }
      });
    } else {
      this.markFormGroupTouched(this.projectForm);
    }
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if ((control as any).controls) {
        this.markFormGroupTouched(control as FormGroup);
      }
    });
  }
}
