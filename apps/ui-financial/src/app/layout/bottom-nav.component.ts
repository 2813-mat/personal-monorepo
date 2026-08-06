import { Component, inject, output, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent } from '../ui/icon/icon.component';
import { AuthService } from '../core/auth/auth.service';
import { BOTTOM_NAV_IDS, navItem } from './nav-items';
import { MoreSheetComponent } from './more-sheet.component';

/** Rótulos encurtados: a barra tem ~70px por item. */
const SHORT: Record<string, string> = {
  dashboard: 'Início',
  transactions: 'Transaç.',
  cards: 'Cartões',
};

@Component({
  selector: 'cf-bottom-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconComponent, MoreSheetComponent],
  templateUrl: './bottom-nav.component.html',
  styleUrl: './bottom-nav.component.scss',
})
export class BottomNavComponent {
  protected auth = inject(AuthService);
  protected items = BOTTOM_NAV_IDS.map(id => ({ ...navItem(id), label: SHORT[id] }));
  protected moreOpen = signal(false);

  readonly newExpense = output<void>();
}
