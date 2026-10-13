import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NetworkStatsComponent } from '../../components/network-stats/network-stats.component';

interface MeshPoint {
  x: number;
  y: number;
  you?: boolean;
}

// Nodos y enlaces del gráfico decorativo del hero.
const NODES: MeshPoint[] = [
  { x: 60, y: 90 },
  { x: 150, y: 48 },
  { x: 252, y: 80 },
  { x: 342, y: 58 },
  { x: 108, y: 182 },
  { x: 210, y: 160, you: true },
  { x: 312, y: 172 },
  { x: 168, y: 262 },
  { x: 282, y: 258 },
];

const LINKS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [0, 4], [1, 5], [2, 5], [2, 6], [3, 6],
  [4, 5], [5, 6], [4, 7], [5, 7], [5, 8], [6, 8], [7, 8],
];

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, NetworkStatsComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  readonly meshNodes = NODES;
  readonly meshLinks = LINKS.map(([a, b]) => [NODES[a], NODES[b]] as const);

  readonly features = [
    { icon: 'fa-tower-broadcast', title: 'Comunicación descentralizada', text: 'Redes mesh que funcionan sin depender de infraestructura centralizada.' },
    { icon: 'fa-battery-three-quarters', title: 'Bajo consumo', text: 'Dispositivos eficientes que pueden funcionar con baterías por largos períodos.' },
    { icon: 'fa-satellite-dish', title: 'Alcance extendido', text: 'Comunicación a larga distancia sin necesidad de torres celulares.' },
    { icon: 'fa-lock', title: 'Privacidad', text: 'Comunicación encriptada y anónima entre dispositivos.' },
  ];

  readonly projects = [
    { title: 'Red Mesh CDMX', text: 'Implementación de red mesh en la Ciudad de México para comunicación de emergencia.' },
    { title: 'Meshtastic Monterrey', text: 'Desarrollo de aplicaciones locales para la comunidad de Nuevo León.' },
    { title: 'Red Mesh Yucatán', text: 'Implementación de red mesh en la ciudad de Mérida para comunicación de emergencia.' },
  ];
}
