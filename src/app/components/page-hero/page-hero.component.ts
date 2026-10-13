import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Hero común a las páginas interiores: fondo verde sólido con patrón de malla
 * y franja tricolor. El contenido proyectado se coloca debajo del subtítulo.
 */
@Component({
  selector: 'app-page-hero',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page-hero" [class.page-hero--center]="center()">
      <div class="container">
        @if (eyebrow()) {
          <span class="eyebrow">{{ eyebrow() }}</span>
        }
        <h1>{{ title() }}</h1>
        @if (subtitle()) {
          <p class="page-hero__subtitle">{{ subtitle() }}</p>
        }
        <ng-content />
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }

    .page-hero--center {
      text-align: center;

      .page-hero__subtitle {
        margin: 0 auto;
      }
    }
  `,
})
export class PageHeroComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
  readonly eyebrow = input<string>('');
  readonly center = input(false);
}
