import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { DailyPacketCount } from '../../models/mesh.model';

const numberFormat = new Intl.NumberFormat('es-MX');
const dayFormat = new Intl.DateTimeFormat('es-MX', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

const WIDTH = 168;
const HEIGHT = 44;
const GAP = 4;

/**
 * Columnas pequeñas con el conteo diario de paquetes. Una sola serie, sin leyenda:
 * la lectura de abajo muestra el día señalado (puntero o teclado) o el más reciente.
 */
@Component({
  selector: 'app-daily-bars',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      class="bars"
      [attr.viewBox]="'0 0 ' + width + ' ' + height"
      role="group"
      aria-label="Paquetes por día"
      (pointerleave)="active.set(null)"
    >
      @for (bar of bars(); track bar.day) {
        <g
          class="bar"
          [class.bar--active]="bar.index === shownIndex()"
          tabindex="0"
          role="img"
          [attr.aria-label]="bar.label + ': ' + bar.formatted + ' paquetes'"
          (pointerenter)="active.set(bar.index)"
          (focus)="active.set(bar.index)"
          (blur)="active.set(null)"
        >
          <!-- Área de interacción más grande que la columna -->
          <rect [attr.x]="bar.x - gap / 2" y="0" [attr.width]="bar.w + gap" [attr.height]="height" fill="transparent" />
          <path [attr.d]="bar.path" />
        </g>
      }
    </svg>
    @if (shown(); as day) {
      <p class="readout"><strong>{{ day.formatted }}</strong> paquetes · {{ day.label }}</p>
    }
  `,
  styles: `
    :host {
      display: block;
      margin-top: var(--space-3);
    }

    .bars {
      width: 100%;
      height: 44px;
      display: block;
      overflow: visible;
    }

    .bar {
      cursor: default;
      outline: none;

      path {
        fill: var(--chart-line);
        opacity: 0.45;
        transition: opacity 0.15s ease;
      }

      &--active path {
        opacity: 1;
      }

      &:focus-visible path {
        opacity: 1;
        stroke: var(--text);
        stroke-width: 1.5;
      }
    }

    .readout {
      margin-top: var(--space-2);
      font-size: var(--fs-xs);
      color: var(--text-muted);

      strong {
        color: var(--text);
        font-weight: 700;
      }
    }
  `,
})
export class DailyBarsComponent {
  readonly days = input.required<DailyPacketCount[]>();

  protected readonly width = WIDTH;
  protected readonly height = HEIGHT;
  protected readonly gap = GAP;
  protected readonly active = signal<number | null>(null);

  protected readonly bars = computed(() => {
    const days = this.days();
    if (!days.length) return [];
    const max = Math.max(...days.map((d) => d.packet_count), 1);
    const w = Math.min(24, (WIDTH - GAP * (days.length - 1)) / days.length);
    const totalW = w * days.length + GAP * (days.length - 1);
    const offset = (WIDTH - totalW) / 2;
    const todayUtc = new Date().toISOString().slice(0, 10);

    return days.map((d, index) => {
      const h = Math.max(3, (d.packet_count / max) * HEIGHT);
      const x = offset + index * (w + GAP);
      const y = HEIGHT - h;
      const r = Math.min(4, w / 2, h);
      // Extremo de datos redondeado, base recta.
      const path = `M${x},${HEIGHT} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${HEIGHT} Z`;
      return {
        index,
        day: d.day_utc,
        x,
        w,
        path,
        // El día en curso aún no termina: aclararlo para no leerlo como una caída.
        label: d.day_utc === todayUtc ? 'hoy (en curso)' : dayFormat.format(new Date(`${d.day_utc}T00:00:00Z`)),
        formatted: numberFormat.format(d.packet_count),
      };
    });
  });

  protected readonly shownIndex = computed(() => this.active() ?? this.bars().length - 1);
  protected readonly shown = computed(() => this.bars()[this.shownIndex()] ?? null);
}
