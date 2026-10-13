import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeroComponent } from '../../components/page-hero/page-hero.component';
import { MxFlagComponent } from '../../components/mx-flag/mx-flag.component';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [RouterLink, PageHeroComponent, MxFlagComponent],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss'
})
export class AboutComponent {
  readonly features = [
    { icon: 'fa-tower-broadcast', title: 'Comunicación Descentralizada', text: 'No depende de infraestructura centralizada' },
    { icon: 'fa-battery-three-quarters', title: 'Bajo Consumo', text: 'Funciona con baterías por largos períodos' },
    { icon: 'fa-lock', title: 'Encriptación', text: 'Comunicación segura y privada' },
  ];
}
