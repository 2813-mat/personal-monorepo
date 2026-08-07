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
import { matchesHolder } from '@caixa-familia/shared-utils';

const MONTHS = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

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

  kpis = computed(() => {
    const income = this.incs().reduce((s, i) => s + i.value, 0);
    const spent = this.txs().reduce((s, t) => s + t.value, 0);
    const fixed = this.fixos().reduce((s, f) => s + f.value, 0);
    const sos = this.data.goals().find(g => g.id === 'sos');
    const saldo = income - spent;
    return [
      { label: 'Receita',  value: income,         sub: `${this.incs().length} fontes`, color: 'var(--pos)'   },
      { label: 'Gastos',   value: spent,          sub: `${this.txs().length} lançamentos`, color: 'var(--neg)' },
      { label: 'Fixos',    value: fixed,          sub: `${this.fixos().length} contas`, color: undefined      },
      { label: 'Reserva',  value: sos?.balance ?? 0, sub: `/ R$ ${this.formatShort(sos?.target ?? 0)}`, color: 'var(--brand)' },
      { label: 'Saldo',    value: saldo,          sub: 'livre p/ mês',                 color: saldo > 0 ? 'var(--pos)' : 'var(--neg)' },
    ];
  });

  historyTotals = computed(() => this.data.history().map(h => h.total));
  historyFirst = computed(() => this.data.history()[0]?.m ?? '');
  historyLast = computed(() => { const h = this.data.history(); return h[h.length - 1]?.m ?? ''; });

  topTx = computed(() =>
    [...this.txs()]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 16)
  );

  totalFaturas = computed(() => this.data.cards().reduce((s, c) => s + c.current, 0));

  catSpend = computed(() => {
    const spend: Record<string, number> = {};
    for (const t of this.txs()) {
      spend[t.cat] = (spend[t.cat] ?? 0) + t.value;
    }
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
