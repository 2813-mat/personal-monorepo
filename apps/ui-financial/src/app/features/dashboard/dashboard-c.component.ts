import { Component, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppDataService } from '../../layout/app-data.service';
import { MoneyComponent } from '../../ui/money/money.component';
import { AvatarComponent } from '../../ui/avatar/avatar.component';
import { CatDotComponent } from '../../ui/cat-dot/cat-dot.component';
import { ProgressBarComponent } from '../../ui/progress-bar/progress-bar.component';
import { IconComponent } from '../../ui/icon/icon.component';
import { daysUntilClosing } from '@caixa-familia/shared-utils';
import type { Card } from '@caixa-familia/shared-types';

@Component({
  selector: 'cf-dashboard-c',
  standalone: true,
  imports: [MoneyComponent, AvatarComponent, CatDotComponent, ProgressBarComponent, IconComponent, RouterLink],
  templateUrl: './dashboard-c.component.html',
  styleUrl: './dashboard-c.component.scss',
})
export class DashboardCComponent {
  protected data = inject(AppDataService);
  private today = new Date();

  todayStr = this.today.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  daysLeftInMonth = (() => {
    const last = new Date(this.today.getFullYear(), this.today.getMonth() + 1, 0);
    return last.getDate() - this.today.getDate();
  })();

  receita = computed(() =>
    this.data.incomes()
      .filter(i => { const f = this.data.holderFilter(); return f === 'todos' || i.holder === f; })
      .reduce((s, i) => s + i.value, 0)
  );

  gastos = computed(() => {
    const f = this.data.holderFilter();
    return this.data.transactions()
      .filter(t => f === 'todos' || t.holder === f || (f !== 'shared' && t.holder === 'shared'))
      .reduce((s, t) => s + t.value, 0);
  });

  saldo = computed(() => this.receita() - this.gastos());

  totalFaturas = computed(() => this.data.cards().reduce((s, c) => s + c.current, 0));

  // Fix: slice(0, 6) garante grade 2×3 completa
  sortedCards = computed(() =>
    [...this.data.cards()]
      .sort((a, b) => this.daysLeft(a) - this.daysLeft(b))
      .slice(0, 6)
  );

  recentTx = computed(() =>
    [...this.data.transactions()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7)
  );

  daysLeft(card: Card) { return daysUntilClosing(card, this.today); }
  utilPct(card: Card) { return ((card.current / card.limit) * 100).toFixed(0); }
  formatShort(v: number) { return v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
  formatDay(date: string) { return date.split('-')[2]; }
  catLabel(id: string) { return this.data.catBy()[id]?.label ?? id; }
  methodLabel(m: string) { return this.data.cardBy()[m]?.bank ?? 'Pix'; }
  monthsLeft(g: { balance: number; target: number; monthly: number }) { return Math.ceil((g.target - g.balance) / g.monthly); }
  goalPct(g: { balance: number; target: number }) { return ((g.balance / g.target) * 100).toFixed(0); }
}
