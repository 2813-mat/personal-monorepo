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
import { SparkbarsComponent } from '../../ui/sparkbars/sparkbars.component';
import {
  committedTotal,
  matchesHolder,
  monthRows,
  pendingFixed,
  spendByCategory,
} from '@caixa-familia/shared-utils';

const MONTHS = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

/** Quantas linhas a tabela do mês mostra antes do "Ver todos". */
const ROW_LIMIT = 16;

@Component({
  selector: 'cf-dashboard-a',
  standalone: true,
  imports: [MoneyComponent, AvatarComponent, CatDotComponent, CardChipComponent, ProgressBarComponent, IconComponent, SparkbarsComponent, RouterLink],
  templateUrl: './dashboard-a.component.html',
  styleUrl: './dashboard-a.component.scss',
})
export class DashboardAComponent {
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
  private fixos = computed(() =>
    this.data.fixed().filter(f => matchesHolder(this.data.holderFilter(), f.holder)),
  );
  private pendentes = computed(() => pendingFixed(this.fixos()));

  kpis = computed(() => {
    const income = this.incs().reduce((s, i) => s + i.value, 0);
    const realizado = this.txs().reduce((s, t) => s + t.value, 0);
    const pendentes = this.pendentes();
    const aPagar = pendentes.reduce((s, f) => s + f.value, 0);
    // Só os pendentes entram: o fixo já pago virou transação e está no realizado.
    const comprometido = committedTotal(this.txs(), pendentes);
    const totalFixos = this.fixos().reduce((s, f) => s + f.value, 0);
    const sos = this.data.goals().find(g => g.id === 'sos');
    const saldo = income - comprometido;
    return [
      { label: 'Receita',  value: income,      sub: `${this.incs().length} fontes`, color: 'var(--pos)'   },
      {
        label: 'Gastos', value: comprometido, color: 'var(--neg)',
        sub: `R$ ${this.formatShort(realizado)} realizado + R$ ${this.formatShort(aPagar)} a pagar`,
      },
      {
        label: 'Fixos a pagar', value: aPagar, color: undefined,
        sub: `${pendentes.length} de ${this.fixos().length} contas · R$ ${this.formatShort(totalFixos)} no total`,
      },
      { label: 'Reserva',  value: sos?.balance ?? 0, sub: `/ R$ ${this.formatShort(sos?.target ?? 0)}`, color: 'var(--brand)' },
      { label: 'Saldo',    value: saldo,       sub: 'livre p/ mês',                 color: saldo > 0 ? 'var(--pos)' : 'var(--neg)' },
    ];
  });

  historyTotals = computed(() => this.data.history().map(h => h.total));
  historyFirst = computed(() => this.data.history()[0]?.m ?? '');
  historyLast = computed(() => { const h = this.data.history(); return h[h.length - 1]?.m ?? ''; });

  /** Lançamentos do mês e fixos a pagar na mesma lista. */
  private allRows = computed(() =>
    monthRows(this.txs(), this.pendentes(), this.data.currentMonth()),
  );
  topRows = computed(() => this.allRows().slice(0, ROW_LIMIT));
  rowCount = computed(() => this.allRows().length);

  totalFaturas = computed(() => this.data.cards().reduce((s, c) => s + c.current, 0));

  catSpend = computed(() => {
    const spend = spendByCategory(this.txs(), this.pendentes());
    return this.data.categories()
      .filter(c => spend[c.id])
      .map(c => ({ cat: c, spent: spend[c.id] }))
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 7);
  });

  catLabel(id: string) { return this.data.catBy()[id]?.label ?? id; }
  cardOf(method: string) { return this.data.cardBy()[method] ?? null; }
  formatDate(date: string) { const d = new Date(date + 'T12:00:00'); return `${String(d.getDate()).padStart(2,'0')} ${MONTHS[d.getMonth()]}`; }
  utilPct(current: number, limit: number) { return ((current / limit) * 100).toFixed(0); }
  formatShort(v: number) { return v.toLocaleString('pt-BR', { minimumFractionDigits:0, maximumFractionDigits:0 }); }
}
