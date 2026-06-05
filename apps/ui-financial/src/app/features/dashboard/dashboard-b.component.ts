import { Component, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppDataService } from '../../layout/app-data.service';
import { MoneyComponent } from '../../ui/money/money.component';
import { AvatarComponent } from '../../ui/avatar/avatar.component';
import { CatDotComponent } from '../../ui/cat-dot/cat-dot.component';
import { CardChipComponent } from '../../ui/card-chip/card-chip.component';
import { ProgressBarComponent } from '../../ui/progress-bar/progress-bar.component';
import { IconComponent } from '../../ui/icon/icon.component';
import { DonutComponent } from '../../ui/donut/donut.component';
import type { DonutSegment } from '../../ui/donut/donut.component';

const MONTHS = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

@Component({
  selector: 'cf-dashboard-b',
  standalone: true,
  imports: [MoneyComponent, AvatarComponent, CatDotComponent, CardChipComponent, ProgressBarComponent, IconComponent, DonutComponent, RouterLink],
  templateUrl: './dashboard-b.component.html',
  styleUrl: './dashboard-b.component.scss',
})
export class DashboardBComponent {
  protected data = inject(AppDataService);

  totalSpent = computed(() => this.data.transactions().reduce((s, t) => s + t.value, 0));
  totalFaturas = computed(() => this.data.cards().reduce((s, c) => s + c.current, 0));

  kpiCards = computed(() => {
    const income = this.data.incomes().reduce((s, i) => s + i.value, 0);
    const spent = this.totalSpent();
    const saldo = income - spent;
    const sos = this.data.goals().find(g => g.id === 'sos');
    const sosBalance = sos?.balance ?? 0;
    const sosTarget = sos?.target ?? 1;

    const ih = this.data.incomeHistory();
    const prevIncome = ih[ih.length - 2]?.total ?? income;
    const hist = this.data.history();
    const prevSpent = hist[hist.length - 2]?.total ?? spent;
    const incomeDelta = ((income - prevIncome) / prevIncome * 100).toFixed(1);
    const spentDelta = ((spent - prevSpent) / prevSpent * 100).toFixed(1);

    return [
      {
        label: 'Receita do mês', value: income, color: 'var(--pos)',
        delta: Math.abs(+incomeDelta), deltaUp: +incomeDelta >= 0,
        sub: 'Salários + extras', bar: undefined,
      },
      {
        label: 'Gastos do mês', value: spent, color: 'var(--neg)',
        delta: Math.abs(+spentDelta), deltaUp: +spentDelta < 0,
        sub: `${this.data.transactions().length} lançamentos`, bar: undefined,
      },
      {
        label: 'Saldo livre', value: saldo, color: saldo >= 0 ? 'var(--brand)' : 'var(--neg)',
        delta: undefined, deltaUp: undefined,
        sub: `${((saldo / income) * 100).toFixed(0)}% da receita`, bar: undefined,
      },
      {
        label: 'Reserva S.O.S', value: sosBalance, color: 'var(--ink-1)',
        delta: undefined, deltaUp: undefined,
        sub: `${((sosBalance / sosTarget) * 100).toFixed(0)}% da meta · R$ ${this.formatShort(sosTarget)}`,
        bar: sosBalance / sosTarget,
      },
    ];
  });

  donutSegments = computed((): DonutSegment[] => {
    const spend: Record<string, number> = {};
    for (const t of this.data.transactions()) {
      spend[t.cat] = (spend[t.cat] ?? 0) + t.value;
    }
    return this.data.categories()
      .filter(c => spend[c.id])
      .map(c => ({ value: spend[c.id], color: c.color, label: c.label }))
      .sort((a, b) => b.value - a.value);
  });

  recentTx = computed(() =>
    [...this.data.transactions()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 9)
  );

  pct(value: number) {
    const total = this.totalSpent();
    return total > 0 ? ((value / total) * 100).toFixed(0) : '0';
  }
  catLabel(id: string) { return this.data.catBy()[id]?.label ?? id; }
  cardOf(method: string) { return this.data.cardBy()[method] ?? null; }
  formatDate(date: string) { const d = new Date(date + 'T12:00:00'); return `${String(d.getDate()).padStart(2,'0')}/${MONTHS[d.getMonth()]}`; }
  utilPct(current: number, limit: number) { return ((current / limit) * 100).toFixed(0); }
  formatShort(v: number) { return v.toLocaleString('pt-BR', { minimumFractionDigits:0, maximumFractionDigits:0 }); }
}
