import { Component, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppDataService } from '../../layout/app-data.service';
import { ViewportService } from '../../core/viewport.service';
import { MoneyComponent } from '../../ui/money/money.component';
import { AvatarComponent } from '../../ui/avatar/avatar.component';
import { CatDotComponent } from '../../ui/cat-dot/cat-dot.component';
import { CardChipComponent } from '../../ui/card-chip/card-chip.component';
import { ProgressBarComponent } from '../../ui/progress-bar/progress-bar.component';
import { IconComponent } from '../../ui/icon/icon.component';
import { DonutComponent } from '../../ui/donut/donut.component';
import type { DonutSegment } from '../../ui/donut/donut.component';
import {
  committedTotal,
  matchesHolder,
  monthRows,
  pendingFixed,
  spendByCategory,
} from '@caixa-familia/shared-utils';

const MONTHS = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

/** Quantas linhas o painel de lançamentos do mês mostra. */
const ROW_LIMIT = 9;

@Component({
  selector: 'cf-dashboard-b',
  standalone: true,
  imports: [MoneyComponent, AvatarComponent, CatDotComponent, CardChipComponent, ProgressBarComponent, IconComponent, DonutComponent, RouterLink],
  templateUrl: './dashboard-b.component.html',
  styleUrl: './dashboard-b.component.scss',
})
export class DashboardBComponent {
  protected data = inject(AppDataService);
  protected vp = inject(ViewportService);

  // O segmento da topbar vale para todo número desta aba: filtrar o gasto sem
  // filtrar a receita afunda o saldo de quem está selecionado.
  private txs = computed(() =>
    this.data.transactions().filter(t => matchesHolder(this.data.holderFilter(), t.holder)),
  );
  private incs = computed(() =>
    this.data.incomes().filter(i => matchesHolder(this.data.holderFilter(), i.holder)),
  );
  private pendentes = computed(() =>
    pendingFixed(this.data.fixed().filter(f => matchesHolder(this.data.holderFilter(), f.holder))),
  );

  /** Só os lançamentos — a base honesta para comparar com um mês fechado. */
  totalRealized = computed(() => this.txs().reduce((s, t) => s + t.value, 0));
  /** Realizado mais os fixos que ainda vão sair: o compromisso do mês. */
  totalCommitted = computed(() => committedTotal(this.txs(), this.pendentes()));
  totalFaturas = computed(() => this.data.cards().reduce((s, c) => s + c.current, 0));

  kpiCards = computed(() => {
    const income = this.incs().reduce((s, i) => s + i.value, 0);
    const realizado = this.totalRealized();
    const comprometido = this.totalCommitted();
    const aPagar = comprometido - realizado;
    const saldo = income - comprometido;
    const sos = this.data.goals().find(g => g.id === 'sos');
    const sosBalance = sos?.balance ?? 0;
    const sosTarget = sos?.target ?? 1;

    const ih = this.data.incomeHistory();
    const prevIncome = ih[ih.length - 2]?.total ?? income;
    const hist = this.data.history();
    const prevSpent = hist[hist.length - 2]?.total ?? realizado;
    const incomeDelta = this.deltaPct(income, prevIncome);
    // Contra o realizado, nunca contra o comprometido: o fechamento de mês soma
    // só transações, e um fixo pendente nunca entrou naquele total. Comparar os
    // dois inflaria a variação todo dia 1º.
    const spentDelta = this.deltaPct(realizado, prevSpent);

    // O histórico mensal vem agregado por household, sem recorte por titular.
    // Comparar um mês filtrado contra um mês inteiro daria uma variação
    // inventada, então sob filtro o delta some em vez de mentir.
    const comparavel = this.data.holderFilter() === 'todos';

    return [
      {
        label: 'Receita do mês', value: income, color: 'var(--pos)',
        delta: comparavel ? Math.abs(incomeDelta) : undefined,
        deltaUp: comparavel ? incomeDelta >= 0 : undefined,
        sub: 'Salários + extras', bar: undefined,
      },
      {
        label: 'Gastos do mês', value: comprometido, color: 'var(--neg)',
        delta: comparavel ? Math.abs(spentDelta) : undefined,
        deltaUp: comparavel ? spentDelta < 0 : undefined,
        sub: `R$ ${this.formatShort(realizado)} realizado + R$ ${this.formatShort(aPagar)} a pagar`,
        bar: undefined,
      },
      {
        label: 'Saldo livre', value: saldo, color: saldo >= 0 ? 'var(--brand)' : 'var(--neg)',
        delta: undefined, deltaUp: undefined,
        sub: income > 0 ? `${((saldo / income) * 100).toFixed(0)}% da receita` : 'sem receita no mês',
        bar: undefined,
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
    const spend = spendByCategory(this.txs(), this.pendentes());
    return this.data.categories()
      .filter(c => spend[c.id])
      .map(c => ({ value: spend[c.id], color: c.color, label: c.label }))
      .sort((a, b) => b.value - a.value);
  });

  /** Lançamentos do mês e fixos a pagar na mesma lista. */
  recentRows = computed(() =>
    monthRows(this.txs(), this.pendentes(), this.data.currentMonth()).slice(0, ROW_LIMIT),
  );

  pct(value: number) {
    // Denominador é o comprometido porque os segmentos incluem os fixos a pagar;
    // dividir pelo realizado passaria de 100%.
    const total = this.totalCommitted();
    return total > 0 ? ((value / total) * 100).toFixed(0) : '0';
  }

  /** Variação percentual protegida: mês anterior zerado não vira Infinity. */
  private deltaPct(atual: number, anterior: number): number {
    return anterior > 0 ? ((atual - anterior) / anterior) * 100 : 0;
  }
  catLabel(id: string) { return this.data.catBy()[id]?.label ?? id; }
  cardOf(method: string) { return this.data.cardBy()[method] ?? null; }
  formatDate(date: string) { const d = new Date(date + 'T12:00:00'); return `${String(d.getDate()).padStart(2,'0')}/${MONTHS[d.getMonth()]}`; }
  utilPct(current: number, limit: number) { return ((current / limit) * 100).toFixed(0); }
  formatShort(v: number) { return v.toLocaleString('pt-BR', { minimumFractionDigits:0, maximumFractionDigits:0 }); }
}
