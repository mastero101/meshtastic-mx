import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

/**
 * Tema claro/oscuro. Sin preferencia guardada sigue al sistema operativo;
 * al alternar, la elección se guarda en localStorage y se refleja en <html data-theme>.
 * El script en index.html aplica el valor guardado antes del primer pintado.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly media = this.isBrowser ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  readonly theme = signal<Theme>(this.resolveInitial());

  constructor() {
    // Si la persona no eligió tema, seguimos los cambios del sistema.
    this.media?.addEventListener('change', (e) => {
      if (!this.storedTheme()) {
        this.theme.set(e.matches ? 'dark' : 'light');
      }
    });
  }

  toggle(): void {
    const next: Theme = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(next);
    this.document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Almacenamiento bloqueado: el tema sólo dura esta sesión.
    }
  }

  private resolveInitial(): Theme {
    if (!this.isBrowser) return 'light';
    return this.storedTheme() ?? (this.media?.matches ? 'dark' : 'light');
  }

  private storedTheme(): Theme | null {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return value === 'light' || value === 'dark' ? value : null;
    } catch {
      return null;
    }
  }
}
