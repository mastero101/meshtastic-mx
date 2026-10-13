import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Bandera de México simplificada. Decorativa: se oculta a lectores de pantalla. */
@Component({
  selector: 'app-mx-flag',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg viewBox="0 0 42 28" [attr.width]="width()" [attr.height]="width() * 2 / 3" aria-hidden="true" focusable="false">
      <rect width="14" height="28" fill="#006847" />
      <rect x="14" width="14" height="28" fill="#ffffff" />
      <rect x="28" width="14" height="28" fill="#ce1126" />
      <circle cx="21" cy="14" r="4.2" fill="none" stroke="#8a5a2b" stroke-width="1.2" />
      <circle cx="21" cy="14" r="2.2" fill="#b07a36" />
      <path d="M17.6 16.6 Q21 19.4 24.4 16.6" fill="none" stroke="#3f7d3a" stroke-width="1" stroke-linecap="round" />
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      line-height: 0;
    }

    svg {
      border-radius: 3px;
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.15);
    }
  `,
})
export class MxFlagComponent {
  readonly width = input(30);
}
