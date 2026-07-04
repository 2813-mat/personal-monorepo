import { Component, inject, signal } from '@angular/core';
import type { HolderFilter } from '@caixa-familia/shared-types';
import { AppDataService } from './app-data.service';
import { AuthService } from '../core/auth/auth.service';
import { IconComponent } from '../ui/icon/icon.component';
import { AvatarComponent } from '../ui/avatar/avatar.component';
import { ExpenseDrawerComponent } from '../features/expense-drawer/expense-drawer.component';

@Component({
  selector: 'cf-topbar',
  standalone: true,
  imports: [IconComponent, AvatarComponent, ExpenseDrawerComponent],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
})
export class TopBarComponent {
  protected data = inject(AppDataService);
  protected auth = inject(AuthService);

  protected drawerOpen = signal(false);

  filter() {
    return this.data.holderFilter();
  }

  setFilter(f: HolderFilter) {
    this.data.holderFilter.set(f);
  }

  prevMonth() {
    const m = this.data.currentMonth();
    const date = new Date(m.year, m.month - 2);
    this.data.currentMonth.set({
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      label: date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
        .replace(/^./, s => s.toUpperCase()),
      short: date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
    });
  }

  nextMonth() {
    const m = this.data.currentMonth();
    const date = new Date(m.year, m.month);
    this.data.currentMonth.set({
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      label: date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
        .replace(/^./, s => s.toUpperCase()),
      short: date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
    });
  }
}
