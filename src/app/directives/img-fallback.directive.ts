import { Directive, ElementRef, HostListener, inject } from '@angular/core';

/**
 * Para imágenes remotas que pueden desaparecer (tiendas, catálogos externos):
 * si fallan, se ocultan y el contenedor muestra un icono genérico (.img-failed).
 */
@Directive({
  selector: 'img[appImgFallback]',
  standalone: true,
})
export class ImgFallbackDirective {
  private readonly el = inject<ElementRef<HTMLImageElement>>(ElementRef);

  @HostListener('error')
  onError(): void {
    const img = this.el.nativeElement;
    img.style.visibility = 'hidden';
    img.parentElement?.classList.add('img-failed');
  }
}
