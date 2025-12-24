import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'about',
    loadComponent: () => import('./pages/about/about.component').then(m => m.AboutComponent)
  },
  {
    path: 'community',
    loadComponent: () => import('./pages/community/community.component').then(m => m.CommunityComponent)
  },
  {
    path: 'projects',
    loadComponent: () => import('./pages/projects/projects.component').then(m => m.ProjectsComponent)
  },
  {
    path: 'guides',
    loadComponent: () => import('./pages/guides/guides.component').then(m => m.GuidesComponent),
    children: [
      {
        path: 'que-es-meshtastic',
        loadComponent: () => import('./pages/guides/que-es-meshtastic/que-es-meshtastic.component').then(m => m.QueEsMeshtasticComponent)
      },
      {
        path: 'comprar-nodo',
        loadComponent: () => import('./pages/guides/comprar-nodo/comprar-nodo.component').then(m => m.ComprarNodoComponent)
      },
      {
        path: 'primeros-pasos',
        loadComponent: () => import('./pages/guides/primeros-pasos/primeros-pasos.component').then(m => m.PrimerosPasosComponent)
      },
      {
        path: 'apps',
        loadComponent: () => import('./pages/guides/apps/apps.component').then(m => m.AppsComponent)
      },
      {
        path: 'mqtt',
        loadComponent: () => import('./pages/guides/mqtt/mqtt.component').then(m => m.MqttComponent)
      },
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
