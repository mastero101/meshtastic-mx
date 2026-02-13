import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Event {
  title: string;
  date: Date;
  endDate: Date;
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
      title: 'Tech That Liberates - Vol 1: Meshtastic',
      date: new Date(2026, 1, 17, 17, 0), // February 17, 2026 at 5:00 PM
      endDate: new Date(2026, 1, 17, 19, 0), // February 17, 2026 at 7:00 PM
      location: 'Remesal 3A, Barrio Guadalupe, Chiapas',
      description: 'Serie de discusiones enfocada en tecnologías descentralizadas y de código abierto. Entrada Libre. 5:00 PM.',
      details: 'En las últimas semanas, hemos conseguido atraer a otras personas dispuestas a ayudar y colaborar en el crecimiento de Meshtastic en Chiapas. Ahora tenemos una reunión para presentar Meshtastic a nuevas personas interesadas. Se trata de compartir nuestros avances hasta ahora y animar a más personas a que ayuden a hacer crecer los grupos locales de malla. ¡Estamos muy emocionados por los próximos pasos! Entrada Libre.',
      image: 'images/events/tech-that-liberates.jpg'
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

  getGoogleCalendarUrl(event: Event): string {
    const formatDate = (d: Date): string => {
      return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: event.title,
      dates: `${formatDate(event.date)}/${formatDate(event.endDate)}`,
      location: event.location,
      details: event.details,
      ctz: 'America/Mexico_City'
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }
}
