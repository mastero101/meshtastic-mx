import { Component, HostListener, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MxFlagComponent } from '../mx-flag/mx-flag.component';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MxFlagComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  protected readonly themeService = inject(ThemeService);

  isMobileMenuOpen = false;
  isScrolled = false;

  readonly links = [
    { path: '/', label: 'Inicio', icon: 'fa-house', exact: true },
    { path: '/about', label: 'Acerca de', icon: 'fa-circle-info', exact: false },
    { path: '/community', label: 'Comunidad', icon: 'fa-users', exact: false },
    { path: '/guides', label: 'Guías', icon: 'fa-book-open', exact: false },
    { path: '/network', label: 'Red', icon: 'fa-tower-broadcast', exact: false },
    { path: '/projects', label: 'Proyectos', icon: 'fa-diagram-project', exact: false },
  ];

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled = window.scrollY > 8;
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.closeMobileMenu();
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu() {
    this.isMobileMenuOpen = false;
  }
}
