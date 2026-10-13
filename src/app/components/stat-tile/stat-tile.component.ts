import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const numberFormat = new Intl.NumberFormat('es-MX');

/** Cifra destacada con etiqueta. Muestra un skeleton mientras `loading` es true. */
@Component({
  selector: 'app-stat-tile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stat-tile">
      <div class="stat-tile__head">
        @if (icon()) {
          <span class="stat-tile__icon" aria-hidden="true"><i class="fa-solid" [class]="icon()"></i></span>
        }
        <span class="stat-tile__label">{{ label() }}</span>
      </div>
      @if (loading()) {
        <span class="skeleton stat-tile__skeleton" aria-hidden="true"></span>
        <span class="visually-hidden">Cargando</span>
      } @else {
        <span class="stat-tile__value">{{ formatted() }}</span>
      }
      @if (hint()) {
        <span class="stat-tile__hint">{{ hint() }}</span>
      }
      <ng-content />
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .stat-tile {
      height: 100%;
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
      padding: var(--space-5);
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-sm);
    }

    .stat-tile__head {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .stat-tile__icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: var(--radius-sm);
      background: var(--accent-soft);
      color: var(--accent);
      font-size: 0.85rem;
    }

    .stat-tile__label {
      font-size: var(--fs-sm);
      font-weight: 600;
      color: var(--text-muted);
    }

    .stat-tile__value {
      font-size: clamp(1.75rem, 1.4rem + 1.2vw, 2.25rem);
      font-weight: 750;
      letter-spacing: -0.02em;
      line-height: 1.15;
      color: var(--text);
    }

    .stat-tile__skeleton {
      height: 2.4rem;
      width: 60%;
      margin: 0.1rem 0;
    }

    .stat-tile__hint {
      font-size: var(--fs-xs);
      color: var(--text-subtle);
    }
  `,
})
export class StatTileComponent {
  readonly label = input.required<string>();
  readonly value = input<number | string | null | undefined>(null);
  readonly icon = input('');
  readonly hint = input('');
  readonly loading = input(false);

  readonly formatted = computed(() => {
    const value = this.value();
    if (value == null || value === '') return '—';
    return typeof value === 'number' ? numberFormat.format(value) : value;
  });
}
