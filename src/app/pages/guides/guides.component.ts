import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-guides',
  imports: [RouterModule],
  templateUrl: './guides.component.html',
  styleUrl: './guides.component.scss'
})
export class GuidesComponent implements AfterViewInit {
  @ViewChild('guidesList', { static: false }) guidesListRef!: ElementRef;
  @ViewChild('guidesOutlet', { static: false }) guidesOutletRef!: ElementRef;

  constructor(private router: Router) {}

  ngAfterViewInit() {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd && event.urlAfterRedirects.includes('/guides/')) {
        setTimeout(() => {
          // Si existe el outlet, desplazarse a él; si no, a la lista
          if (this.guidesOutletRef?.nativeElement) {
            this.guidesOutletRef.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
            this.guidesListRef?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }
    });
  }
}
