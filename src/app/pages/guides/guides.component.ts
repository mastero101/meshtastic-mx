import { Component, ViewChild, ElementRef, AfterViewInit, DestroyRef, ViewEncapsulation, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PageHeroComponent } from '../../components/page-hero/page-hero.component';

@Component({
  selector: 'app-guides',
  imports: [RouterModule, PageHeroComponent],
  templateUrl: './guides.component.html',
  styleUrl: './guides.component.scss',
  // Los estilos de las guías hijas viven aquí (antes había 5 copias casi iguales).
  // Sin encapsulación para que alcancen a las rutas hijas; todo va bajo .guides-page.
  encapsulation: ViewEncapsulation.None,
})
export class GuidesComponent implements AfterViewInit {
  @ViewChild('guidesList', { static: false }) guidesListRef!: ElementRef;
  @ViewChild('guidesOutlet', { static: false }) guidesOutletRef!: ElementRef;

  private readonly destroyRef = inject(DestroyRef);

  readonly guides = [
    { path: 'que-es-meshtastic', icon: 'fa-circle-question', title: '¿Qué es Meshtastic?', text: 'Descubre la tecnología y sus aplicaciones.' },
    { path: 'comprar-nodo', icon: 'fa-cart-shopping', title: '¿Cómo comprar o armar tu primer nodo?', text: 'Guía para adquirir o construir tu propio nodo.' },
    { path: 'primeros-pasos', icon: 'fa-rocket', title: 'Primeros pasos', text: 'Configura y conecta tu nodo fácilmente.' },
    { path: 'apps', icon: 'fa-mobile-screen', title: 'Aplicaciones móviles', text: 'Conoce las apps y cómo usarlas con Meshtastic.' },
    { path: 'mqtt', icon: 'fa-plug', title: 'MQTT', text: 'Conecta Meshtastic con plataformas IoT mediante un broker MQTT.' },
    { path: '/community', icon: 'fa-people-group', title: 'Unirse a la comunidad', text: 'Recursos, soporte y redes sociales.' },
  ];

  constructor(private router: Router) {}

  ngAfterViewInit() {
    this.router.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(event => {
      if (event instanceof NavigationEnd && event.urlAfterRedirects.includes('/guides/')) {
        setTimeout(() => {
          // Si existe el outlet, desplazarse a él; si no, a la lista
          if (this.guidesOutletRef?.nativeElement) {
            this.guidesOutletRef.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
            this.guidesListRef?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }
    });
  }
}
