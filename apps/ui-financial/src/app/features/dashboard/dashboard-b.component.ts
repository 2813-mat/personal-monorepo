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
  template: `
    <!-- 4 KPI cards -->
    <div class="kpi-grid">
      @for (k of kpiCards(); track k.label) {
        <div class="kpi-card">
          <div class="kpi-card-top">
            <div class="kpi-card-label">{{ k.label }}</div>
            @if (k.delta !== undefined) {
              <div class="kpi-delta" [class.up]="k.deltaUp" [class.down]="!k.deltaUp">
                <cf-icon [name]="k.deltaUp ? 'arrowUp' : 'arrowDown'" [size]="10" />
                {{ k.delta }}%
              </div>
            }
          </div>
          <div class="kpi-card-value" [style.color]="k.color">
            <cf-money [value]="k.value" size="lg" [negColor]="false" [color]="k.color" />
          </div>
          @if (k.bar !== undefined) {
            <cf-progress-bar [value]="k.bar" [max]="1" [color]="k.color" [height]="3" />
          }
          <div class="kpi-card-sub">{{ k.sub }}</div>
        </div>
      }
    </div>

    <!-- Cards + Donut -->
    <div class="mid-grid">
      <!-- Open invoices -->
      <div class="panel">
        <div class="panel-head">
          <div>
            <div class="panel-title">Faturas em aberto</div>
            <div class="panel-subtitle">Cada cartão até o fechamento</div>
          </div>
          <span class="panel-meta">
            Total <cf-money [value]="totalFaturas()" size="sm" [negColor]="false" />
          </span>
        </div>
        <div class="invoices-list">
          @for (card of data.cards(); track card.id) {
            <div class="invoice-row">
              <span class="inv-stripe" [style.background]="card.color"></span>
              <div class="inv-info">
                <div class="inv-name-row">
                  <span class="inv-bank">{{ card.bank }}</span>
                  <span class="inv-last4">···{{ card.last4 }}</span>
                </div>
                <div class="inv-holder">{{ card.holder }}</div>
              </div>
              <div class="inv-close">
                <div class="inv-meta-label">Fecha</div>
                <div class="inv-close-day num">dia {{ card.closing }}</div>
              </div>
              <div class="inv-bar-col">
                <div class="inv-bar-top">
                  <span class="inv-meta-label">limite</span>
                  <span class="inv-pct num">{{ utilPct(card.current, card.limit) }}%</span>
                </div>
                <cf-progress-bar [value]="card.current" [max]="card.limit" [color]="card.color" [height]="4" />
              </div>
              <div class="inv-value">
                <cf-money [value]="card.current" [negColor]="false" />
                <span class="inv-limit num">/ R$ {{ formatShort(card.limit) }}</span>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Category donut -->
      <div class="panel">
        <div class="panel-head">
          <span class="panel-title">Onde foi o dinheiro</span>
          <span class="panel-meta">Mai 2026</span>
        </div>
        <div class="donut-section">
          <div class="donut-wrap">
            <cf-donut [segments]="donutSegments()" [size]="110" [stroke]="18" />
            <div class="donut-center">
              <div class="kpi-label-sm">Total</div>
              <cf-money [value]="totalSpent()" [negColor]="false" [cents]="false" />
            </div>
          </div>
          <div class="donut-legend">
            @for (seg of donutSegments().slice(0, 6); track seg.label) {
              <div class="legend-row">
                <div class="legend-left">
                  <span class="legend-dot" [style.background]="seg.color"></span>
                  <span class="legend-label">{{ seg.label }}</span>
                </div>
                <span class="legend-pct num">{{ pct(seg.value) }}% · <cf-money [value]="seg.value" [negColor]="false" size="sm" /></span>
              </div>
            }
          </div>
        </div>
      </div>
    </div>

    <!-- Recent transactions -->
    <div class="panel">
      <div class="panel-head">
        <span class="panel-title">Últimos lançamentos</span>
        <a class="panel-meta" routerLink="/transactions">Ver todos →</a>
      </div>
      <table class="tx-table">
        <thead>
          <tr>
            <th style="width:60px">Data</th>
            <th>Descrição</th>
            <th style="width:130px">Categoria</th>
            <th style="width:120px">Método</th>
            <th style="width:52px">Quem</th>
            <th class="r" style="width:110px">Valor</th>
          </tr>
        </thead>
        <tbody>
          @for (tx of recentTx(); track tx.id) {
            <tr class="tx-row">
              <td class="tx-date num">{{ formatDate(tx.date) }}</td>
              <td>
                <div class="desc-cell">
                  <span>{{ tx.label }}</span>
                  @if (tx.installments) {
                    <span class="mini-pill">{{ tx.installments.n }}/{{ tx.installments.of }}</span>
                  }
                  @if (tx.recurring) {
                    <span class="mini-pill"><cf-icon name="repeat" [size]="9" /></span>
                  }
                </div>
              </td>
              <td>
                <div class="cat-cell">
                  <cf-cat-dot [catId]="tx.cat" [size]="6" />
                  <span class="cat-label">{{ catLabel(tx.cat) }}</span>
                </div>
              </td>
              <td>
                @if (cardOf(tx.method)) {
                  <div class="method-cell">
                    <cf-card-chip [cardId]="tx.method" size="sm" />
                    <span class="last4">···{{ cardOf(tx.method)!.last4 }}</span>
                  </div>
                } @else {
                  <div class="method-cell">
                    <cf-icon name="pix" [size]="11" color="var(--ink-3)" />
                    <span class="last4">Pix</span>
                  </div>
                }
              </td>
              <td>
                <cf-avatar [holder]="tx.holder === 'shared' ? 'Mateus' : tx.holder" [size]="16" />
              </td>
              <td class="r num tx-val">
                <cf-money [value]="tx.value" [negColor]="false" />
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    :host { display:block; }

    .kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:12px; }
    .kpi-card { background:var(--surface); border:1px solid var(--line); box-shadow:var(--shadow-sm); padding:12px 14px; }
    .kpi-card-top { display:flex; justify-content:space-between; align-items:flex-start; }
    .kpi-card-label { font-size:10.5px; color:var(--ink-3); text-transform:uppercase; letter-spacing:0.6px; font-weight:600; }
    .kpi-delta { display:inline-flex; align-items:center; gap:3px; font-size:11px; }
    .kpi-delta.up { color:var(--pos); }
    .kpi-delta.down { color:var(--neg); }
    .kpi-card-value { margin:4px 0; }
    .kpi-card-sub { font-size:11px; color:var(--ink-4); margin-top:4px; }

    .mid-grid { display:grid; grid-template-columns:1.4fr 1fr; gap:12px; margin-bottom:12px; }

    .panel { background:var(--surface); border:1px solid var(--line); box-shadow:var(--shadow-sm); }
    .panel-head { display:flex; align-items:flex-start; justify-content:space-between; padding:10px 14px 8px; border-bottom:1px solid var(--line-soft); }
    .panel-title { font-size:11px; color:var(--ink-3); text-transform:uppercase; letter-spacing:0.7px; font-weight:600; }
    .panel-subtitle { font-size:11px; color:var(--ink-4); margin-top:2px; }
    .panel-meta { font-size:11px; color:var(--ink-4); display:flex; align-items:center; gap:4px; }
    .panel-meta:hover { color:var(--brand); }

    /* Invoices */
    .invoices-list { padding:4px 14px 8px; }
    .invoice-row { display:flex; align-items:center; gap:12px; padding:7px 0; border-bottom:1px solid var(--line-soft); }
    .invoice-row:last-child { border-bottom:none; }
    .inv-stripe { width:4px; height:28px; flex-shrink:0; }
    .inv-info { width:120px; flex-shrink:0; }
    .inv-name-row { display:flex; align-items:center; gap:6px; }
    .inv-bank { font-size:12.5px; font-weight:500; color:var(--ink-1); }
    .inv-last4 { font-size:11px; color:var(--ink-4); }
    .inv-holder { font-size:11px; color:var(--ink-4); }
    .inv-close { width:64px; flex-shrink:0; }
    .inv-meta-label { font-size:10.5px; color:var(--ink-4); }
    .inv-close-day { font-size:12px; color:var(--ink-1); }
    .inv-bar-col { flex:1; }
    .inv-bar-top { display:flex; justify-content:space-between; margin-bottom:4px; }
    .inv-pct { font-size:11px; color:var(--ink-3); }
    .inv-value { width:96px; text-align:right; flex-shrink:0; }
    .inv-limit { display:block; font-size:11px; color:var(--ink-4); }

    /* Donut */
    .donut-section { display:flex; gap:16px; align-items:flex-start; padding:12px 14px; }
    .donut-wrap { position:relative; flex-shrink:0; }
    .donut-center { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; }
    .kpi-label-sm { font-size:10px; color:var(--ink-3); text-transform:uppercase; letter-spacing:0.5px; font-weight:600; }
    .donut-legend { flex:1; display:flex; flex-direction:column; gap:4px; }
    .legend-row { display:flex; justify-content:space-between; align-items:center; font-size:11.5px; }
    .legend-left { display:flex; align-items:center; gap:6px; }
    .legend-dot { width:7px; height:7px; border-radius:2px; flex-shrink:0; }
    .legend-label { color:var(--ink-2); }
    .legend-pct { color:var(--ink-3); display:flex; align-items:center; gap:3px; }

    /* Table */
    .tx-table { width:100%; border-collapse:collapse; font-size:12.5px; }
    .tx-table thead th { text-align:left; font-size:10.5px; font-weight:600; color:var(--ink-3); text-transform:uppercase; letter-spacing:0.5px; padding:8px 12px; border-bottom:1px solid var(--line); background:var(--surface-sunk); }
    .tx-table thead th.r { text-align:right; }
    .tx-row td { padding:8px 12px; border-bottom:1px solid var(--line-soft); color:var(--ink-2); vertical-align:middle; }
    .tx-row:hover td { background:var(--surface-alt); }
    .r { text-align:right; }
    .tx-date { color:var(--ink-4); font-size:11px; }
    .tx-val { color:var(--ink-1); }
    .desc-cell { display:flex; align-items:center; gap:5px; }
    .mini-pill { display:inline-flex; align-items:center; gap:2px; font-size:10px; padding:1px 4px; background:var(--surface-alt); border:1px solid var(--line); color:var(--ink-3); }
    .cat-cell { display:flex; align-items:center; gap:6px; }
    .cat-label { font-size:11.5px; color:var(--ink-3); }
    .method-cell { display:flex; align-items:center; gap:5px; }
    .last4 { font-size:11px; color:var(--ink-4); }
  `],
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
