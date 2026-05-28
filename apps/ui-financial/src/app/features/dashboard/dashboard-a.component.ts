import { Component, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppDataService } from '../../layout/app-data.service';
import { MoneyComponent } from '../../ui/money/money.component';
import { AvatarComponent } from '../../ui/avatar/avatar.component';
import { CatDotComponent } from '../../ui/cat-dot/cat-dot.component';
import { CardChipComponent } from '../../ui/card-chip/card-chip.component';
import { ProgressBarComponent } from '../../ui/progress-bar/progress-bar.component';
import { IconComponent } from '../../ui/icon/icon.component';
import { SparkbarsComponent } from '../../ui/sparkbars/sparkbars.component';

const MONTHS = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

@Component({
  selector: 'cf-dashboard-a',
  standalone: true,
  imports: [MoneyComponent, AvatarComponent, CatDotComponent, CardChipComponent, ProgressBarComponent, IconComponent, SparkbarsComponent, RouterLink],
  template: `
    <!-- Header strip: KPIs + sparkline -->
    <div class="header-strip">
      @for (k of kpis(); track k.label) {
      <div class="kpi-inline">
        <div class="ki-label">{{ k.label }}</div>
        <cf-money [value]="k.value" size="lg" [negColor]="false" [color]="k.color" />
        <div class="ki-sub">{{ k.sub }}</div>
      </div>
      }
      <div class="header-spacer"></div>
      <div class="sparkline-block">
        <div class="kpi-label mb4">Gastos · últ. 12 meses</div>
        <cf-sparkbars [data]="historyTotals()" [width]="180" [height]="32" />
        <div class="spark-range">
          <span>{{ historyFirst() }}</span>
          <span>{{ historyLast() }}</span>
        </div>
      </div>
    </div>

    <!-- 2-col: transactions left, side panels right -->
    <div class="main-grid">
      <!-- LEFT: transaction table -->
      <div class="panel">
        <div class="panel-head">
          <div class="panel-head-left">
            <span class="panel-title">Lançamentos · Maio 2026</span>
            <span class="count-pill">{{ data.transactions().length }}</span>
          </div>
          <div class="panel-head-right">
            <span class="panel-meta">Ordenar: Data</span>
            <cf-icon name="filter" [size]="11" color="var(--ink-3)" />
          </div>
        </div>
        <table class="tx-table">
          <thead>
            <tr>
              <th style="width:64px">Data</th>
              <th>Descrição</th>
              <th style="width:110px">Categoria</th>
              <th style="width:96px">Método</th>
              <th style="width:48px">Quem</th>
              <th class="r" style="width:100px">Valor</th>
            </tr>
          </thead>
          <tbody>
            @for (tx of topTx(); track tx.id) {
              <tr class="tx-row">
                <td class="tx-date num">{{ formatDate(tx.date) }}</td>
                <td>
                  <div class="desc-cell">
                    <span>{{ tx.label }}</span>
                    @if (tx.installments) {
                      <span class="mini-pill">{{ tx.installments.n }}/{{ tx.installments.of }}</span>
                    }
                    @if (tx.recurring) {
                      <span class="mini-pill"><cf-icon name="repeat" [size]="9" /> fixo</span>
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
        <div class="panel-foot">
          <span>Mostrando {{ topTx().length }} de {{ data.transactions().length }}</span>
          <a class="foot-link" routerLink="/transactions">Ver todos →</a>
        </div>
      </div>

      <!-- RIGHT column -->
      <div class="col-side">
        <!-- Faturas abertas -->
        <div class="panel">
          <div class="panel-head">
            <span class="panel-title">Faturas abertas</span>
            <span class="panel-meta">{{ data.cards().length }} cartões</span>
          </div>
          <table class="tx-table">
            <tbody>
              @for (card of data.cards(); track card.id) {
                <tr class="tx-row">
                  <td style="width:8px;padding:8px 4px 8px 12px">
                    <span class="card-stripe" [style.background]="card.color"></span>
                  </td>
                  <td>
                    <div class="card-bank">{{ card.bank }}</div>
                    <div class="card-sub">{{ card.holder }} · fecha dia {{ card.closing }}</div>
                  </td>
                  <td style="width:90px">
                    <cf-progress-bar [value]="card.current" [max]="card.limit" [color]="card.color" [height]="3" />
                    <div class="card-pct num">{{ utilPct(card.current, card.limit) }}% do limite</div>
                  </td>
                  <td class="r num" style="width:80px">
                    <cf-money [value]="card.current" [negColor]="false" size="sm" />
                  </td>
                </tr>
              }
            </tbody>
          </table>
          <div class="panel-foot">
            <span>Total acumulado</span>
            <cf-money [value]="totalFaturas()" [negColor]="false" size="sm" />
          </div>
        </div>

        <!-- Categorias -->
        <div class="panel">
          <div class="panel-head">
            <span class="panel-title">Gasto por categoria</span>
            <span class="panel-meta">vs. orçamento</span>
          </div>
          <div class="cat-list">
            @for (item of catSpend(); track item.cat.id) {
              <div class="cat-row">
                <div class="cat-row-top">
                  <div class="cat-cell">
                    <cf-cat-dot [catId]="item.cat.id" [size]="7" />
                    <span class="cat-name">{{ item.cat.label }}</span>
                  </div>
                  <span class="cat-amount num" [style.color]="item.spent > item.cat.budget ? 'var(--neg)' : 'var(--ink-2)'">
                    <cf-money [value]="item.spent" [negColor]="false" size="sm" />
                    <span class="cat-budget"> / {{ formatShort(item.cat.budget) }}</span>
                  </span>
                </div>
                <cf-progress-bar
                  [value]="item.spent"
                  [max]="item.cat.budget"
                  [color]="item.spent > item.cat.budget ? 'var(--neg)' : item.cat.color"
                  [height]="3"
                />
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display:block; }

    /* Header strip */
    .header-strip {
      display:flex; align-items:center; gap:28px;
      background:var(--surface); border:1px solid var(--line);
      box-shadow:var(--shadow-sm); padding:12px 16px; margin-bottom:12px;
    }
    .kpi-inline { display:flex; flex-direction:column; gap:2px; }
    .ki-label { font-size:10.5px; color:var(--ink-3); text-transform:uppercase; letter-spacing:0.6px; font-weight:600; }
    .ki-sub { font-size:11px; color:var(--ink-4); margin-top:1px; }
    .header-spacer { flex:1; }
    .sparkline-block { display:flex; flex-direction:column; align-items:flex-end; }
    .kpi-label { font-size:10.5px; color:var(--ink-3); text-transform:uppercase; letter-spacing:0.6px; font-weight:600; }
    .mb4 { margin-bottom:4px; }
    .spark-range { display:flex; justify-content:space-between; width:100%; font-size:10px; color:var(--ink-4); margin-top:2px; }

    /* Main grid */
    .main-grid { display:grid; grid-template-columns:1.7fr 1fr; gap:12px; }

    /* Panels */
    .panel { background:var(--surface); border:1px solid var(--line); box-shadow:var(--shadow-sm); }
    .panel-head { display:flex; align-items:center; justify-content:space-between; padding:10px 14px 8px; border-bottom:1px solid var(--line-soft); }
    .panel-head-left { display:flex; align-items:center; gap:8px; }
    .panel-head-right { display:flex; align-items:center; gap:6px; }
    .panel-title { font-size:11px; color:var(--ink-3); text-transform:uppercase; letter-spacing:0.7px; font-weight:600; }
    .panel-meta { font-size:11px; color:var(--ink-4); }
    .panel-foot { display:flex; justify-content:space-between; align-items:center; padding:8px 14px; border-top:1px solid var(--line-soft); font-size:11px; color:var(--ink-3); }
    .foot-link { color:var(--ink-4); font-size:11px; }
    .foot-link:hover { color:var(--brand); }
    .count-pill { display:inline-flex; align-items:center; font-size:10.5px; padding:1px 6px; background:var(--surface-alt); border:1px solid var(--line); color:var(--ink-3); }

    /* Table */
    .tx-table { width:100%; border-collapse:collapse; font-size:12.5px; }
    .tx-table thead th { text-align:left; font-size:10.5px; font-weight:600; color:var(--ink-3); text-transform:uppercase; letter-spacing:0.5px; padding:8px 12px; border-bottom:1px solid var(--line); background:var(--surface-sunk); }
    .tx-table thead th.r { text-align:right; }
    .tx-row td { padding:7px 12px; border-bottom:1px solid var(--line-soft); color:var(--ink-2); vertical-align:middle; }
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

    /* Card table rows */
    .card-stripe { display:inline-block; width:3px; height:22px; }
    .card-bank { font-size:12px; font-weight:500; color:var(--ink-1); }
    .card-sub { font-size:11px; color:var(--ink-4); }
    .card-pct { font-size:10.5px; color:var(--ink-4); margin-top:2px; }

    /* Right column */
    .col-side { display:flex; flex-direction:column; gap:12px; }
    .cat-list { padding:4px 14px 8px; }
    .cat-row { padding:6px 0; border-bottom:1px solid var(--line-soft); }
    .cat-row:last-child { border-bottom:none; }
    .cat-row-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; }
    .cat-name { font-size:12px; color:var(--ink-1); }
    .cat-amount { display:flex; align-items:baseline; gap:2px; }
    .cat-budget { color:var(--ink-4); font-size:10.5px; }
  `],
})
export class DashboardAComponent {
  protected data = inject(AppDataService);

  kpis = computed(() => {
    const income = this.data.incomes().reduce((s, i) => s + i.value, 0);
    const spent = this.data.transactions().reduce((s, t) => s + t.value, 0);
    const fixed = this.data.fixed().reduce((s, f) => s + f.value, 0);
    const sos = this.data.goals().find(g => g.id === 'sos');
    const saldo = income - spent;
    return [
      { label: 'Receita',  value: income,         sub: '2 fontes',                     color: 'var(--pos)'   },
      { label: 'Gastos',   value: spent,          sub: `${this.data.transactions().length} lançamentos`, color: 'var(--neg)' },
      { label: 'Fixos',    value: fixed,          sub: '10 contas',                    color: undefined      },
      { label: 'Reserva',  value: sos?.balance ?? 0, sub: `/ R$ ${this.formatShort(sos?.target ?? 0)}`, color: 'var(--brand)' },
      { label: 'Saldo',    value: saldo,          sub: 'livre p/ mês',                 color: saldo > 0 ? 'var(--pos)' : 'var(--neg)' },
    ];
  });

  historyTotals = computed(() => this.data.history().map(h => h.total));
  historyFirst = computed(() => this.data.history()[0]?.m ?? '');
  historyLast = computed(() => { const h = this.data.history(); return h[h.length - 1]?.m ?? ''; });

  topTx = computed(() =>
    [...this.data.transactions()]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 16)
  );

  totalFaturas = computed(() => this.data.cards().reduce((s, c) => s + c.current, 0));

  catSpend = computed(() => {
    const spend: Record<string, number> = {};
    for (const t of this.data.transactions()) {
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
