import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Event {
  title: string;
  date: Date;
  location: string;
  description: string;
  details: string;
  image?: string;
}

@Component({
  selector: 'app-community',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './community.component.html',
  styleUrl: './community.component.scss'
})
export class CommunityComponent {
  showModal = false;
  selectedEvent: Event | null = null;
  showRegistrationForm = false;
  registrationSuccess = false;
  
  // Mexican states and cities
  mexicanCities = [
    'Aguascalientes',
    'Baja California',
    'Baja California Sur',
    'Campeche',
    'Chiapas',
    'Chihuahua',
    'Ciudad de México',
    'Coahuila',
    'Colima',
    'Durango',
    'Estado de México',
    'Guanajuato',
    'Guerrero',
    'Hidalgo',
    'Jalisco',
    'Michoacán',
    'Morelos',
    'Nayarit',
    'Nuevo León',
    'Oaxaca',
    'Puebla',
    'Querétaro',
    'Quintana Roo',
    'San Luis Potosí',
    'Sinaloa',
    'Sonora',
    'Tabasco',
    'Tamaulipas',
    'Tlaxcala',
    'Veracruz',
    'Yucatán',
    'Zacatecas',
    'Otra'
  ];

  // Form model
  registrationForm = {
    name: '',
    email: '',
    phone: '',
    city: '',
    otherCity: '',
    meshPlate: '',
    comments: ''
  };

  // Form validation state
  formErrors = {
    name: '',
    email: '',
    phone: '',
    city: '',
    meshPlate: ''
  };

  events: Event[] = [
    {
      title: 'Taller de Construcción de Nodos',
      date: new Date(2025, 11, 15), // December is 11 (0-based)
      location: 'CDMX',
      description: 'Aprende a construir tu propio nodo Meshtastic desde cero. Incluye todos los materiales necesarios.',
      details: 'Este taller está diseñado para principiantes que deseen adentrarse en el mundo de las redes Mesh. Cubriremos desde los conceptos básicos hasta la configuración avanzada. No se requiere experiencia previa. Incluye kit de inicio con placa, antena y componentes necesarios.',
      image: 'assets/images/workshop.jpg'
    },
    {
      title: 'Meetup Virtual: Aplicaciones Prácticas',
      date: new Date(2025, 10, 30), // November 30
      location: 'En línea',
      description: 'Presentación de casos de uso reales y aplicaciones prácticas de Meshtastic en México.',
      details: 'Sesión virtual donde miembros de la comunidad compartirán sus experiencias implementando redes Meshtastic en diferentes contextos. Incluye sesión de preguntas y respuestas. Se enviará enlace de Zoom a los registrados.'
    },
    {
      title: 'Reunión Anual Meshtastic 2025',
      date: new Date(2025, 11, 15), // December 15
      location: 'CDMX',
      description: 'Evento de Reunión anual de la comunidad Meshtastic México.',
      details: 'Únete a nosotros en nuestro evento más importante del año. Tendremos charlas técnicas, talleres prácticos, demostraciones en vivo y la oportunidad de conocer a otros entusiastas de las redes Mesh en México. Incluye comida y bebidas. Cupo limitado.'
    }
  ];

  openModal(event: Event): void {
    this.selectedEvent = event;
    this.showModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedEvent = null;
    this.showRegistrationForm = false;
    this.registrationSuccess = false;
    this.resetForm();
    document.body.style.overflow = 'auto';
  }
  
  showRegistration(event?: MouseEvent): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    console.log('Showing registration form');
    this.showRegistrationForm = true;
    this.registrationSuccess = false;
    this.resetForm();
    // Force change detection
    setTimeout(() => {
      this.showRegistrationForm = true;
    });
  }
  
  resetForm(): void {
    this.registrationForm = {
      name: '',
      email: '',
      phone: '',
      city: '',
      otherCity: '',
      meshPlate: '',
      comments: ''
    };
    this.formErrors = {
      name: '',
      email: '',
      phone: '',
      city: '',
      meshPlate: ''
    };
  }
  
  validateForm(): boolean {
    let isValid = true;
    
    // Reset errors
    this.formErrors = {
      name: !this.registrationForm.name ? 'El nombre es requerido' : '',
      email: !this.registrationForm.email ? 'El correo electrónico es requerido' : 
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.registrationForm.email) ? 'Ingresa un correo válido' : '',
      phone: !this.registrationForm.phone ? 'El teléfono es requerido' : 
            !/^[0-9\-\+\(\)\s]{10,15}$/.test(this.registrationForm.phone) ? 'Ingresa un teléfono válido' : '',
      city: !this.registrationForm.city ? 'La ciudad es requerida' : '',
      meshPlate: !this.registrationForm.meshPlate ? 'La placa Meshtastic es requerida' : ''
    };
    
    // If "Otra" is selected, require the otherCity field
    if (this.registrationForm.city === 'Otra' && !this.registrationForm.otherCity) {
      this.formErrors.city = 'Por favor especifica tu ciudad';
      isValid = false;
    }
    
    // Check if there are any errors
    Object.values(this.formErrors).forEach(error => {
      if (error) isValid = false;
    });
    
    return isValid;
  }
  
  onSubmit(): void {
    console.log('Form submission started');
    if (this.validateForm()) {
      // If "Otra" is selected, use the otherCity value
      const cityToSave = this.registrationForm.city === 'Otra' 
        ? this.registrationForm.otherCity 
        : this.registrationForm.city;

      const formData = {
        ...this.registrationForm,
        city: cityToSave
      };

      console.log('Form submitted:', formData);
      
      // Here you would typically send formData to your backend
      // For example:
      // this.yourService.submitRegistration(formData).subscribe(...);
      
      // Show success message
      this.registrationSuccess = true;
      
      // Reset the form after a delay
      setTimeout(() => {
        this.closeModal();
      }, 30000);
    } else {
      console.log('Form validation failed');
    }
  }

  getFormattedDate(date: Date): string {
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getMonthName(date: Date): string {
    return date.toLocaleDateString('es-MX', { month: 'short' });
  }
}
