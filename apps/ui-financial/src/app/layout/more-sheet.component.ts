import { Component, inject, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent } from '../ui/icon/icon.component';
import { AuthService } from '../core/auth/auth.service';
import { MORE_IDS, navItem } from './nav-items';

@Component({
  selector: 'cf-more-sheet',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconComponent],
  templateUrl: './more-sheet.component.html',
  styleUrl: './more-sheet.component.scss',
})
export class MoreSheetComponent {
  protected auth = inject(AuthService);
  protected items = MORE_IDS.map(navItem);

  readonly closed = output<void>();
}
