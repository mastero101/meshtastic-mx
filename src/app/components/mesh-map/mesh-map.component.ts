import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import type * as Leaflet from 'leaflet';
import { MeshNode } from '../../models/mesh.model';
import { Theme, ThemeService } from '../../services/theme.service';
import { NodeStatus, STATUS_LABELS, nodeCoords, nodeHex, nodeStatus, roleLabel, timeAgo } from '../../utils/node-utils';

const MEXICO_CENTER: Leaflet.LatLngTuple = [23.6345, -102.5528];

const TILES: Record<Theme, { url: string; attribution: string }> = {
  light: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
};

/** Rectángulo aproximado que contiene el territorio mexicano. */
function insideMexico(lat: number, lng: number): boolean {
  return lat >= 14 && lat <= 33 && lng >= -118.5 && lng <= -86.5;
}

/** Orden de dibujo: los nodos en línea quedan encima. */
const DRAW_ORDER: NodeStatus[] = ['offline', 'idle', 'online'];

/**
 * Mapa Leaflet de nodos. Modo red: todos los nodos con posición, coloreados por actividad,
 * con popup y enlace a su página. Modo `single`: un nodo centrado, sin popups.
 */
@Component({
  selector: 'app-mesh-map',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="map-frame" [style]="'--map-h: ' + height() + 'px'">
      <div #mapEl class="map" [attr.aria-label]="single() ? 'Mapa con la ubicación del nodo' : 'Mapa de nodos'" role="region"></div>
      @if (!single()) {
        <ul class="legend" aria-label="Leyenda">
          @for (s of legend(); track s.status) {
            <li><span class="status" [attr.data-status]="s.status">{{ s.label }}</span> <strong>{{ s.count }}</strong></li>
          }
        </ul>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .map-frame {
      position: relative;
      border-radius: var(--radius-lg);
      overflow: hidden;
      border: 1px solid var(--border);
      background: var(--surface-2);
    }

    .map {
      height: min(var(--map-h), 72vh);
      min-height: 220px;
      width: 100%;
      z-index: 0;
    }

    .legend {
      position: absolute;
      left: 12px;
      bottom: 12px;
      z-index: 500;
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 8px 12px;
      background: var(--surface-glass);
      backdrop-filter: blur(8px);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-md);

      li {
        display: flex;
        justify-content: space-between;
        gap: var(--space-4);
        font-size: var(--fs-xs);
      }

      strong {
        color: var(--text);
        font-variant-numeric: tabular-nums;
      }
    }
  `,
})
export class MeshMapComponent {
  readonly nodes = input.required<MeshNode[]>();
  readonly single = input(false);
  readonly height = input(560);
  /** Cambiarlo vuelve a encuadrar el mapa (p. ej. al cambiar filtros). Un refresco con la misma clave no mueve la vista. */
  readonly fitKey = input('');

  private readonly mapEl = viewChild.required<ElementRef<HTMLDivElement>>('mapEl');
  private readonly theme = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly zone = inject(NgZone);

  private L?: typeof Leaflet;
  private map?: Leaflet.Map;
  private tiles?: Leaflet.TileLayer;
  private markers?: Leaflet.LayerGroup;
  private renderer?: Leaflet.Renderer;
  private tileTheme?: Theme;
  private lastFitKey?: string;
  private readonly ready = signal(false);

  protected readonly legend = computed(() => {
    const counts: Record<NodeStatus, number> = { online: 0, idle: 0, offline: 0 };
    const now = Date.now();
    for (const node of this.nodes()) {
      if (nodeCoords(node)) counts[nodeStatus(node.last_seen_us, now)]++;
    }
    return (['online', 'idle', 'offline'] as NodeStatus[]).map((status) => ({
      status,
      label: STATUS_LABELS[status],
      count: counts[status],
    }));
  });

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      this.zone.runOutsideAngular(async () => {
        const module = await import('leaflet');
        this.L = ((module as any).default ?? module) as typeof Leaflet;
        const el = this.mapEl().nativeElement;

        this.renderer = this.L.canvas({ padding: 0.5 });
        this.map = this.L.map(el, {
          center: MEXICO_CENTER,
          zoom: 5,
          zoomControl: true,
          scrollWheelZoom: !this.single(),
          preferCanvas: true,
          renderer: this.renderer,
        });
        this.markers = this.L.layerGroup().addTo(this.map);

        // El contenedor puede cambiar de tamaño (pestañas, rotación del móvil).
        const observer = new ResizeObserver(() => this.map?.invalidateSize());
        observer.observe(el);
        destroyRef.onDestroy(() => {
          observer.disconnect();
          this.map?.remove();
        });

        this.zone.run(() => this.ready.set(true));
      });
    });

    effect(() => {
      if (!this.ready()) return;
      const theme = this.theme.theme();
      const nodes = this.nodes();
      const fitKey = this.fitKey();
      this.zone.runOutsideAngular(() => {
        this.applyTiles(theme);
        this.drawMarkers(nodes, fitKey);
      });
    });
  }

  private applyTiles(theme: Theme): void {
    if (!this.L || !this.map || this.tileTheme === theme) return;
    this.tiles?.remove();
    const { url, attribution } = TILES[theme];
    this.tiles = this.L.tileLayer(url, { attribution, maxZoom: 19, crossOrigin: true }).addTo(this.map);
    this.tileTheme = theme;
  }

  private drawMarkers(nodes: MeshNode[], fitKey: string): void {
    const L = this.L;
    if (!L || !this.map || !this.markers) return;

    // Los colores salen de los tokens del tema activo (canvas no entiende var()).
    const css = getComputedStyle(document.documentElement);
    const color = (status: NodeStatus) => css.getPropertyValue(`--status-${status}`).trim();
    const ring = css.getPropertyValue('--surface').trim() || '#ffffff';

    this.markers.clearLayers();
    const now = Date.now();
    const placed = nodes
      .map((node) => ({ node, coords: nodeCoords(node), status: nodeStatus(node.last_seen_us, now) }))
      .filter((item) => item.coords)
      .sort((a, b) => DRAW_ORDER.indexOf(a.status) - DRAW_ORDER.indexOf(b.status));

    for (const { node, coords, status } of placed) {
      const marker = L.circleMarker([coords!.lat, coords!.lng], {
        renderer: this.renderer,
        radius: this.single() ? 9 : 6,
        fillColor: this.single() ? css.getPropertyValue('--accent').trim() : color(status),
        fillOpacity: 0.92,
        color: ring,
        weight: 2,
      });
      if (!this.single()) {
        marker.bindPopup(() => this.buildPopup(node, status, now), { className: 'mesh-popup', closeButton: true });
      }
      marker.addTo(this.markers);
    }

    const shouldFit = this.lastFitKey === undefined || this.lastFitKey !== fitKey;
    if (!shouldFit || placed.length === 0) return;
    this.lastFitKey = fitKey;

    if (this.single()) {
      this.map.setView([placed[0].coords!.lat, placed[0].coords!.lng], 13);
    } else {
      // Algunos nodos reportan posiciones en otros continentes (GPS sin fijar o nodos
      // extranjeros vía MQTT). Encuadrar con ellos alejaría el mapa hasta ver el mundo,
      // así que se priorizan los que están en México.
      const inMexico = placed.filter((p) => insideMexico(p.coords!.lat, p.coords!.lng));
      const framed = inMexico.length ? inMexico : placed;
      const bounds = L.latLngBounds(framed.map((p) => [p.coords!.lat, p.coords!.lng] as Leaflet.LatLngTuple));
      this.map.fitBounds(bounds.pad(0.08), { maxZoom: 12 });
    }
  }

  /** Contenido del popup con nodos DOM y textContent: los nombres de nodo no se interpretan como HTML. */
  private buildPopup(node: MeshNode, status: NodeStatus, now: number): HTMLElement {
    const root = document.createElement('div');

    const title = root.appendChild(document.createElement('strong'));
    title.className = 'mesh-popup__title';
    title.textContent = node.long_name || node.id;

    const meta = root.appendChild(document.createElement('span'));
    meta.className = 'mesh-popup__meta';
    meta.textContent = [node.hw_model, roleLabel(node.role)].filter(Boolean).join(' · ');

    const row = root.appendChild(document.createElement('div'));
    row.className = 'mesh-popup__row';
    const statusEl = row.appendChild(document.createElement('span'));
    statusEl.className = 'status';
    statusEl.dataset['status'] = status;
    statusEl.textContent = STATUS_LABELS[status];
    const seen = row.appendChild(document.createElement('span'));
    seen.className = 'mesh-popup__meta';
    seen.textContent = timeAgo(node.last_seen_us, now);

    const link = root.appendChild(document.createElement('a'));
    const hex = nodeHex(node);
    link.className = 'btn btn-primary btn--sm mesh-popup__link';
    link.href = `/network/node/${hex}`;
    link.textContent = 'Ver página del nodo';
    link.addEventListener('click', (event) => {
      event.preventDefault();
      this.zone.run(() => this.router.navigate(['/network/node', hex]));
    });

    return root;
  }
}
