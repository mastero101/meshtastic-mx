import { ChangeDetectionStrategy, Component, DestroyRef, PLATFORM_ID, inject, input, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MeshStats, NodeTotals } from '../../models/mesh.model';
import { MeshService } from '../../services/mesh.service';
import { StatTileComponent } from '../stat-tile/stat-tile.component';
import { DailyBarsComponent } from '../daily-bars/daily-bars.component';

/**
 * Cifras en vivo de la red mexicana (MeshView). Sustituye a los números escritos a mano
 * en Inicio, Comunidad y Proyectos, para que todas las páginas digan lo mismo.
 */
@Component({
  selector: 'app-network-stats',
  standalone: true,
  imports: [RouterLink, StatTileComponent, DailyBarsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stats-grid">
      <app-stat-tile
        label="Nodos registrados"
        icon="fa-tower-broadcast"
        hint="Histórico en México"
        [value]="totals()?.total"
        [loading]="loading()"
      />
      <app-stat-tile
        label="Nodos activos"
        icon="fa-signal"
        hint="Últimos 7 días"
        [value]="stats()?.active_nodes"
        [loading]="loading()"
      />
      <app-stat-tile
        label="Routers"
        icon="fa-tower-cell"
        hint="Nodos con rol ROUTER"
        [value]="totals()?.routers"
        [loading]="loading()"
      />
      <app-stat-tile
        label="Paquetes"
        icon="fa-wave-square"
        hint="Últimos 7 días"
        [value]="stats()?.packets_total"
        [loading]="loading()"
      >
        @if (stats()?.daily?.length) {
          <app-daily-bars [days]="stats()!.daily" />
        }
      </app-stat-tile>
    </div>

    <div class="stats-footer">
      @if (failed()) {
        <span class="stats-note"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> No pudimos cargar las cifras en vivo.</span>
      } @else {
        <span class="stats-note"><span class="live-dot" aria-hidden="true"></span> Datos en vivo de MeshView</span>
      }
      @if (showLink()) {
        <a routerLink="/network" class="link-arrow">Ver la red en vivo <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .stats-grid {
      display: grid;
      gap: var(--space-4);
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 210px), 1fr));
    }

    .stats-footer {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      margin-top: var(--space-4);
    }

    .stats-note {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--fs-sm);
      color: var(--text-muted);
    }
  `,
})
export class NetworkStatsComponent {
  /** Muestra el enlace a /network (no tiene sentido dentro de la propia página de Red). */
  readonly showLink = input(true);

  protected readonly stats = signal<MeshStats | null>(null);
  protected readonly totals = signal<NodeTotals | null>(null);
  protected readonly loading = signal(true);
  protected readonly failed = signal(false);

  constructor() {
    const mesh = inject(MeshService);
    const destroyRef = inject(DestroyRef);

    // En el prerender sólo se muestran los skeletons; los datos llegan en el navegador.
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

    forkJoin({ stats: mesh.getStats(), totals: mesh.getNodeTotals() })
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe({
        next: ({ stats, totals }) => {
          this.stats.set(stats);
          this.totals.set(totals);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error fetching network stats:', err);
          this.loading.set(false);
          this.failed.set(true);
        },
      });
  }
}
