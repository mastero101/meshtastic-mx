import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface ChartPoint {
  time: Date;
  value: number;
}

const HEIGHT = 150;
const PAD = { top: 12, right: 14, bottom: 26, left: 44 };
/** Con pocas lecturas se marca cada punto; con muchas, sólo el último. */
const MAX_MARKERS = 40;

const timeFormat = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/**
 * Gráfica de línea de una sola serie (sin leyenda: el título la nombra).
 * Crosshair + tooltip con puntero; flechas ← → con teclado.
 */
@Component({
  selector: 'app-telemetry-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <figure class="chart">
      <figcaption class="chart__head">
        <span class="chart__title">{{ title() }}</span>
        @if (latest(); as last) {
          <span class="chart__current">{{ format(last.value) }}</span>
        }
      </figcaption>

      @if (points().length >= 2) {
        <div class="chart__plot">
          <svg
            [attr.viewBox]="'0 0 ' + width() + ' ' + height"
            [attr.width]="width()"
            [attr.height]="height"
            tabindex="0"
            role="img"
            [attr.aria-label]="ariaLabel()"
            (pointermove)="onPointer($event)"
            (pointerleave)="active.set(null)"
            (keydown)="onKey($event)"
            (focus)="active.set(points().length - 1)"
            (blur)="active.set(null)"
          >
            <!-- Rejilla y eje Y -->
            @for (tick of yTicks(); track tick.value) {
              <line class="grid" [attr.x1]="pad.left" [attr.x2]="width() - pad.right" [attr.y1]="tick.y" [attr.y2]="tick.y" />
              <text class="axis" [attr.x]="pad.left - 8" [attr.y]="tick.y" text-anchor="end" dominant-baseline="middle">{{ tick.label }}</text>
            }
            <!-- Eje X: inicio y fin del rango -->
            <text class="axis" [attr.x]="pad.left" [attr.y]="height - 6" text-anchor="start">{{ xLabels().start }}</text>
            <text class="axis" [attr.x]="width() - pad.right" [attr.y]="height - 6" text-anchor="end">{{ xLabels().end }}</text>

            <path class="area" [attr.d]="geometry().area" />
            <path class="line" [attr.d]="geometry().line" />

            @for (p of markers(); track p.i) {
              <circle class="marker" [attr.cx]="p.x" [attr.cy]="p.y" r="4" />
            }

            @if (activePoint(); as a) {
              <line class="crosshair" [attr.x1]="a.x" [attr.x2]="a.x" [attr.y1]="pad.top" [attr.y2]="height - pad.bottom" />
              <circle class="marker marker--active" [attr.cx]="a.x" [attr.cy]="a.y" r="5" />
            }
          </svg>

          @if (activePoint(); as a) {
            <div class="tooltip" [style.left.px]="a.x" [class.tooltip--left]="a.x > width() * 0.6" role="status">
              <strong>{{ format(a.value) }}</strong>
              <span>{{ a.label }}</span>
            </div>
          }
        </div>
      } @else {
        <p class="chart__empty">Sin lecturas suficientes para graficar.</p>
      }
    </figure>
  `,
  styles: `
    :host {
      display: block;
    }

    .chart {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: var(--space-4) var(--space-4) var(--space-2);
      height: 100%;
    }

    .chart__head {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: var(--space-3);
      margin-bottom: var(--space-2);
    }

    .chart__title {
      font-size: var(--fs-sm);
      font-weight: 650;
      color: var(--text-muted);
    }

    .chart__current {
      font-size: var(--fs-xl);
      font-weight: 750;
      color: var(--text);
    }

    .chart__plot {
      position: relative;
    }

    svg {
      display: block;
      max-width: 100%;
      overflow: visible;
      outline: none;
      touch-action: pan-y;

      &:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 4px;
        border-radius: var(--radius-sm);
      }
    }

    .grid {
      stroke: var(--chart-grid);
      stroke-width: 1;
    }

    .axis {
      fill: var(--text-subtle);
      font-size: 11px;
      font-variant-numeric: tabular-nums;
    }

    .area {
      fill: var(--chart-area);
    }

    .line {
      fill: none;
      stroke: var(--chart-line);
      stroke-width: 2;
      stroke-linejoin: round;
      stroke-linecap: round;
    }

    .marker {
      fill: var(--chart-line);
      stroke: var(--surface);
      stroke-width: 2;
    }

    .crosshair {
      stroke: var(--text-subtle);
      stroke-width: 1;
    }

    .tooltip {
      position: absolute;
      top: 0;
      transform: translateX(10px);
      display: flex;
      flex-direction: column;
      padding: 6px 10px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      box-shadow: var(--shadow-md);
      pointer-events: none;
      white-space: nowrap;
      font-size: var(--fs-xs);
      color: var(--text-muted);

      strong {
        font-size: var(--fs-sm);
        color: var(--text);
      }

      &--left {
        transform: translateX(calc(-100% - 10px));
      }
    }

    .chart__empty {
      padding: var(--space-6) 0;
      text-align: center;
      font-size: var(--fs-sm);
      color: var(--text-subtle);
    }
  `,
})
export class TelemetryChartComponent {
  readonly title = input.required<string>();
  readonly points = input.required<ChartPoint[]>();
  readonly unit = input('');
  readonly decimals = input(0);
  /** Dominio fijo opcional (p. ej. 0–100 para porcentajes). */
  readonly min = input<number | undefined>(undefined);
  readonly max = input<number | undefined>(undefined);

  protected readonly height = HEIGHT;
  protected readonly pad = PAD;
  protected readonly width = signal(320);
  protected readonly active = signal<number | null>(null);

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef);
    const destroyRef = inject(DestroyRef);
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

    // El ancho real del contenedor define la escala X (los textos no se deforman).
    afterNextRender(() => {
      const observer = new ResizeObserver(([entry]) => {
        const w = Math.floor(entry.contentRect.width) - 32; // padding de .chart
        if (w > 0) this.width.set(Math.max(200, w));
      });
      observer.observe(host.nativeElement);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  protected readonly latest = computed(() => this.points().at(-1) ?? null);

  private readonly domain = computed(() => {
    const values = this.points().map((p) => p.value);
    let lo = this.min() ?? Math.min(...values);
    let hi = this.max() ?? Math.max(...values);
    if (lo === hi) {
      const pad = Math.abs(lo) * 0.05 || 1;
      lo -= pad;
      hi += pad;
    }
    return niceDomain(lo, hi, this.min() !== undefined, this.max() !== undefined);
  });

  private readonly scaled = computed(() => {
    const pts = this.points();
    const { lo, hi } = this.domain();
    const t0 = pts[0]?.time.getTime() ?? 0;
    const t1 = pts.at(-1)?.time.getTime() ?? 1;
    const span = Math.max(1, t1 - t0);
    const innerW = this.width() - PAD.left - PAD.right;
    const innerH = HEIGHT - PAD.top - PAD.bottom;

    return pts.map((p, i) => ({
      i,
      x: PAD.left + ((p.time.getTime() - t0) / span) * innerW,
      y: PAD.top + (1 - (p.value - lo) / (hi - lo)) * innerH,
      value: p.value,
      label: timeFormat.format(p.time),
    }));
  });

  protected readonly geometry = computed(() => {
    const pts = this.scaled();
    if (pts.length < 2) return { line: '', area: '' };
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const base = HEIGHT - PAD.bottom;
    const area = `${line} L${pts.at(-1)!.x.toFixed(1)},${base} L${pts[0].x.toFixed(1)},${base} Z`;
    return { line, area };
  });

  protected readonly markers = computed(() => {
    const pts = this.scaled();
    return pts.length <= MAX_MARKERS ? pts : pts.slice(-1);
  });

  protected readonly yTicks = computed(() => {
    const { lo, hi, step } = this.domain();
    const innerH = HEIGHT - PAD.top - PAD.bottom;
    const ticks = [];
    for (let v = lo; v <= hi + step / 2; v += step) {
      ticks.push({ value: v, y: PAD.top + (1 - (v - lo) / (hi - lo)) * innerH, label: formatTick(v, step) });
    }
    return ticks;
  });

  protected readonly xLabels = computed(() => {
    const pts = this.scaled();
    return { start: pts[0]?.label ?? '', end: pts.at(-1)?.label ?? '' };
  });

  protected readonly activePoint = computed(() => {
    const index = this.active();
    return index == null ? null : (this.scaled()[index] ?? null);
  });

  protected readonly ariaLabel = computed(() => {
    const pts = this.points();
    const values = pts.map((p) => p.value);
    return `${this.title()}: ${pts.length} lecturas, mínimo ${this.format(Math.min(...values))}, ` +
      `máximo ${this.format(Math.max(...values))}, última ${this.format(pts.at(-1)?.value ?? 0)}. ` +
      'Usa las flechas para recorrer las lecturas.';
  });

  format(value: number): string {
    const unit = this.unit();
    const text = value.toLocaleString('es-MX', {
      minimumFractionDigits: this.decimals(),
      maximumFractionDigits: this.decimals(),
    });
    return unit === '%' ? `${text}%` : unit ? `${text} ${unit}` : text;
  }

  protected onPointer(event: PointerEvent): void {
    const svg = event.currentTarget as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * this.width();
    // El crosshair busca la X: se ajusta a la lectura más cercana.
    let nearest = 0;
    let best = Infinity;
    for (const p of this.scaled()) {
      const d = Math.abs(p.x - x);
      if (d < best) {
        best = d;
        nearest = p.i;
      }
    }
    this.active.set(nearest);
  }

  protected onKey(event: KeyboardEvent): void {
    const last = this.points().length - 1;
    const current = this.active() ?? last;
    if (event.key === 'ArrowLeft') this.active.set(Math.max(0, current - 1));
    else if (event.key === 'ArrowRight') this.active.set(Math.min(last, current + 1));
    else if (event.key === 'Home') this.active.set(0);
    else if (event.key === 'End') this.active.set(last);
    else return;
    event.preventDefault();
  }
}

/** Ajusta el dominio a números "redondos" con 3–5 marcas. */
function niceDomain(lo: number, hi: number, fixedLo: boolean, fixedHi: boolean) {
  const rough = (hi - lo) / 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
  const residual = rough / magnitude;
  const step = (residual > 5 ? 10 : residual > 2 ? 5 : residual > 1 ? 2 : 1) * magnitude;
  return {
    lo: fixedLo ? lo : Math.floor(lo / step) * step,
    hi: fixedHi ? hi : Math.ceil(hi / step) * step,
    step,
  };
}

function formatTick(value: number, step: number): string {
  const decimals = step >= 1 ? 0 : Math.min(3, Math.ceil(-Math.log10(step)));
  return value.toLocaleString('es-MX', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
