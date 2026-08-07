import { Component, inject, computed, signal } from '@angular/core';
import type { FixedExpense } from '@caixa-familia/shared-types';
import { AppDataService } from '../../layout/app-data.service';
import { ViewportService } from '../../core/viewport.service';
import { AuthService } from '../../core/auth/auth.service';
import { MoneyComponent } from '../../ui/money/money.component';
import { AvatarComponent } from '../../ui/avatar/avatar.component';
import { CatDotComponent } from '../../ui/cat-dot/cat-dot.component';
import { IconComponent } from '../../ui/icon/icon.component';
import { ProgressBarComponent } from '../../ui/progress-bar/progress-bar.component';
import { FixedEditDrawerComponent } from './fixed-edit-drawer.component';

@Component({
  selector: 'cf-fixed',
  standalone: true,
  imports: [
    MoneyComponent,
    AvatarComponent,
    CatDotComponent,
    IconComponent,
    ProgressBarComponent,
    FixedEditDrawerComponent,
  ],
  templateUrl: './fixed.component.html',
  styleUrl: './fixed.component.scss',
})
export class FixedComponent {
  protected data = inject(AppDataService);
  protected vp = inject(ViewportService);
  protected auth = inject(AuthService);

  protected editingFixed = signal<FixedExpense | null>(null);

  pendingItems = computed(() =>
    this.data.fixed()
      .filter(f => !f.paidThisMonth)
      .sort((a, b) => a.due - b.due)
  );

  paidItems = computed(() =>
    this.data.fixed()
      .filter(f => f.paidThisMonth)
      .sort((a, b) => a.due - b.due)
  );

  totalFixed   = computed(() => this.data.fixed().reduce((s, f) => s + f.value, 0));
  totalPaid    = computed(() => this.paidItems().reduce((s, f) => s + f.value, 0));
  totalPending = computed(() => this.pendingItems().reduce((s, f) => s + f.value, 0));

  upcoming7 = computed(() => {
    const today = new Date().getDate();
    return this.pendingItems().filter(f => f.due >= today && f.due <= today + 7).length;
  });

  pctReceita = computed(() => {
    const totalIncome = this.data.incomes().reduce((s, i) => s + i.value, 0);
    return totalIncome > 0 ? this.totalFixed() / totalIncome : 0;
  });

  formatPercent(ratio: number): string {
    return Math.round(ratio * 100) + '%';
  }

  formatDay(due: number): string {
    return String(due).padStart(2, '0') + '/mai';
  }

  daysAway(due: number): number {
    return due - new Date().getDate();
  }

  formatDaysAway(due: number): string {
    const d = this.daysAway(due);
    return d < 0 ? `${Math.abs(d)}d atrás` : `${d}d`;
  }

  catLabel(catId: string): string {
    return this.data.catBy()[catId]?.label ?? catId;
  }
}
