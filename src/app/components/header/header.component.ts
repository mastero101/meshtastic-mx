import { Component, HostListener } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  isMobileMenuOpen = false;
  isLogoHovered = false;
  isLogoClicked = false;

  @HostListener('document:animationend', ['$event'])
  onAnimationEnd(event: AnimationEvent) {
    if ((event.target as HTMLElement).classList.contains('mexico-flag')) {
      this.isLogoClicked = false;
    }
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu() {
    this.isMobileMenuOpen = false;
  }
}
