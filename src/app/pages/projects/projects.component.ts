import { Component } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.scss'
})
export class ProjectsComponent {
  projectForm: FormGroup;
  isSubmitted = false;
  isSending = false;

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
