import { Component, inject, signal } from '@angular/core';
import type { HolderFilter } from '@caixa-familia/shared-types';
import { monthContextOf } from '@caixa-familia/shared-utils';
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

  // `m.month` é 1-based: `m.month - 2` é o mês anterior e `m.month` o seguinte.
  prevMonth() {
    const m = this.data.currentMonth();
    this.data.currentMonth.set(monthContextOf(new Date(m.year, m.month - 2)));
  }

  nextMonth() {
    const m = this.data.currentMonth();
    this.data.currentMonth.set(monthContextOf(new Date(m.year, m.month)));
  }
}
