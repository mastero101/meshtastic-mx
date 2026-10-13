import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MxFlagComponent } from '../mx-flag/mx-flag.component';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink, MxFlagComponent],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss'
})
export class FooterComponent {
  readonly year = new Date().getFullYear();
}
