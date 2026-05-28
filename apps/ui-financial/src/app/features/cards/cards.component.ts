import { Component, inject, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppDataService } from '../../layout/app-data.service';
import { MoneyComponent } from '../../ui/money/money.component';
import { AvatarComponent } from '../../ui/avatar/avatar.component';
import { ProgressBarComponent } from '../../ui/progress-bar/progress-bar.component';
import { SparkbarsComponent } from '../../ui/sparkbars/sparkbars.component';
import { IconComponent } from '../../ui/icon/icon.component';
import { daysUntilClosing } from '@caixa-familia/shared-utils';
import type { Card } from '@caixa-familia/shared-types';

type SortMode = 'closing' | 'value' | 'holder';

// Gera histórico mock determinístico por cartão (6 meses)
function cardHistory(card: Card): number[] {
  const seed = card.id.charCodeAt(0) + card.id.charCodeAt(1);
  return Array.from({ length: 6 }, (_, i) => {
    const v = card.current * (0.55 + ((seed + i * 11) % 80) / 100);
    return Math.round(v);
  });
}

// Dias até o próximo vencimento (due date) a partir de hoje
function daysUntilDue(card: Card, ref: Date): number {
  const due = new Date(ref.getFullYear(), ref.getMonth(), card.due);
  if (ref.getDate() >= card.due) {
    due.setMonth(due.getMonth() + 1);
  }
  return Math.ceil((due.getTime() - ref.getTime()) / (1000 * 60 * 60 * 24));
}

const FUTURE_MONTHS = ['Jun/26', 'Jul/26', 'Ago/26', 'Set/26', 'Out/26', 'Nov/26'];

@Component({
  selector: 'cf-cards',
  standalone: true,
  imports: [MoneyComponent, AvatarComponent, ProgressBarComponent, SparkbarsComponent, IconComponent, RouterLink],
  template: `
    <!-- Summary strip: 4 KPI blocks -->
    <div class="summary-grid">
      <!-- Total aberto (card largo) -->
      <div class="kpi-wide">
        <div class="kpi-wide-row">
          <div>
            <div class="kpi-label">Total em faturas abertas</div>
            <cf-money [value]="totalOpen()" size="xl" [negColor]="false" />
          </div>
          <div class="kpi-wide-right">
            <div class="kpi-label">Limite consolidado</div>
            <cf-money [value]="totalLimit()" size="lg" [negColor]="false" />
            <span class="kpi-sub num">{{ utilizationPct() }}% utilizado</span>
          </div>
        </div>
        <cf-progress-bar
          [value]="totalOpen()"
          [max]="totalLimit()"
          [color]="utilizationPct() > 70 ? 'var(--warn)' : 'var(--brand)'"
          [height]="6"
        />
      </div>

      <!-- Cartões ativos -->
      <div class="kpi-box">
        <div class="kpi-label">Cartões ativos</div>
        <div class="kpi-value">{{ data.cards().length }}</div>
        <div class="kpi-sub">{{ mateusCount() }} do Mateus · {{ thaisCount() }} da Thais</div>
      </div>

      <!-- Fecham em ≤ 7 dias -->
      <div class="kpi-box">
        <div class="kpi-label">Fecham em ≤ 7 dias</div>
        <div class="kpi-value" [style.color]="closingSoon() > 0 ? 'var(--warn)' : 'var(--ink-1)'">
          {{ closingSoon() }}
        </div>
        <div class="kpi-sub">{{ closingSoon() === 1 ? 'cartão prestes a fechar' : 'cartões prestes a fechar' }}</div>
      </div>

      <!-- Próximo vencimento -->
      <div class="kpi-box">
        <div class="kpi-label">Próx. vencimento</div>
        <div class="kpi-value num" style="font-size:18px">{{ nextDueLabel() }}</div>
        <div class="kpi-sub">
          {{ nextDueCard()?.bank }} ·
          <cf-money [value]="nextDueCard()?.current ?? 0" size="sm" [negColor]="false" />
        </div>
      </div>
    </div>

    <!-- Cards table -->
    <div class="panel">
      <div class="panel-head">
        <span class="panel-title">Meus cartões</span>
        <div class="sort-seg">
          <span class="panel-meta">Ordenar:</span>
          <div class="seg">
            <button class="seg-btn" [class.active]="sortMode() === 'closing'" (click)="sortMode.set('closing')">Fechamento</button>
            <button class="seg-btn" [class.active]="sortMode() === 'value'"   (click)="sortMode.set('value')">Valor</button>
            <button class="seg-btn" [class.active]="sortMode() === 'holder'"  (click)="sortMode.set('holder')">Pessoa</button>
          </div>
        </div>
      </div>

      <table class="cards-table">
        <thead>
          <tr>
            <th>Cartão</th>
            <th style="width:100px">Quem</th>
            <th style="width:120px">Fechamento</th>
            <th style="width:110px">Vencimento</th>
            <th style="width:210px">Utilização</th>
            <th style="width:100px">Hist. 6m</th>
            <th class="r" style="width:130px">Fatura aberta</th>
          </tr>
        </thead>
        <tbody>
          @for (card of sortedCards(); track card.id) {
            <tr class="card-row" [routerLink]="['/cards', card.id, 'invoice']">
              <!-- Cartão -->
              <td>
                <div class="card-name-cell">
                  <span class="card-badge" [style.background]="card.color">
                    {{ card.bank.slice(0,4).toUpperCase() }}
                  </span>
                  <div>
                    <div class="card-bank">{{ card.bank }}</div>
                    <div class="card-number num">···· ···· ···· {{ card.last4 }}</div>
                  </div>
                </div>
              </td>
              <!-- Quem -->
              <td>
                <div class="holder-cell">
                  <cf-avatar [holder]="card.holder" [size]="16" />
                  <span class="holder-label">{{ card.holder }}</span>
                </div>
              </td>
              <!-- Fechamento -->
              <td>
                <div class="date-cell">
                  <span class="date-day num">dia {{ card.closing }}</span>
                  <span class="date-sub" [class.warn]="daysLeft(card) <= 7">
                    {{ daysLeft(card) === 0 ? 'fecha hoje' : daysLeft(card) <= 7 ? 'em ' + daysLeft(card) + 'd' : 'em ' + daysLeft(card) + ' dias' }}
                  </span>
                </div>
              </td>
              <!-- Vencimento -->
              <td>
                <div class="date-cell">
                  <span class="date-day num">dia {{ card.due }}</span>
                  <span class="date-sub">mês seguinte</span>
                </div>
              </td>
              <!-- Utilização -->
              <td>
                <div class="util-header">
                  <span class="util-values num">
                    R$ {{ fmtShort(card.current) }} / R$ {{ fmtShort(card.limit) }}
                  </span>
                  <span class="util-pct num" [class.over]="utilPct(card) > 80">
                    {{ utilPct(card) }}%
                  </span>
                </div>
                <cf-progress-bar [value]="card.current" [max]="card.limit" [color]="card.color" [height]="4" />
              </td>
              <!-- Histórico -->
              <td>
                <cf-sparkbars
                  [data]="historyOf(card)"
                  [width]="80"
                  [height]="22"
                  [baseColor]="card.color"
                  [highlightColor]="card.color"
                />
              </td>
              <!-- Fatura -->
              <td class="r">
                <cf-money [value]="card.current" [negColor]="false" />
                <div class="invoice-sub">{{ hasActivity(card.id) ? 'movimentação ativa' : 'sem compras' }}</div>
              </td>
            </tr>
          }
        </tbody>
      </table>

      <div class="panel-foot">
        <span class="foot-add">
          <cf-icon name="plus" [size]="11" color="var(--ink-3)" />
          Adicionar novo cartão
        </span>
        <span class="foot-total num">
          Total: <cf-money [value]="totalOpen()" size="sm" [negColor]="false" />
        </span>
      </div>
    </div>

    <!-- Compromissos futuros -->
    <div class="panel commitments-panel">
      <div class="panel-head">
        <span class="panel-title">Compromissos futuros · parcelas</span>
        <span class="panel-meta">próximos 6 meses, somando todos os cartões</span>
      </div>
      <div class="commitments-grid">
        @for (month of futureMonths(); track month.label) {
          <div class="commitment-cell" [class.highlight]="month.isFirst">
            <div class="commit-label">{{ month.label }}</div>
            <cf-money [value]="month.total" [negColor]="false" [cents]="false" />
            <div class="commit-sub num">{{ month.count }} {{ month.count === 1 ? 'parcela' : 'parcelas' }}</div>
            @if (month.total > 1200) {
              <span class="commit-pill-warn">pico</span>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    /* Summary grid */
    .summary-grid {
      display: grid;
      grid-template-columns: 1.5fr 1fr 1fr 1fr;
      gap: 12px;
      margin-bottom: 12px;
    }

    .kpi-wide {
      background: var(--surface);
      border: 1px solid var(--line);
      box-shadow: var(--shadow-sm);
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .kpi-wide-row { display: flex; justify-content: space-between; align-items: flex-start; }
    .kpi-wide-right { text-align: right; }

    .kpi-box {
      background: var(--surface);
      border: 1px solid var(--line);
      box-shadow: var(--shadow-sm);
      padding: 12px 14px;
    }
    .kpi-label {
      font-size: 10.5px; color: var(--ink-3);
      text-transform: uppercase; letter-spacing: 0.6px; font-weight: 600;
    }
    .kpi-value {
      font-size: 22px; font-weight: 600; color: var(--ink-1);
      letter-spacing: -0.4px; margin-top: 4px;
      font-variant-numeric: tabular-nums;
    }
    .kpi-sub { font-size: 11px; color: var(--ink-4); margin-top: 4px; }

    /* Panel */
    .panel {
      background: var(--surface);
      border: 1px solid var(--line);
      box-shadow: var(--shadow-sm);
      margin-bottom: 12px;
    }
    .panel-head {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 14px 8px;
      border-bottom: 1px solid var(--line-soft);
    }
    .panel-title {
      font-size: 11px; color: var(--ink-3);
      text-transform: uppercase; letter-spacing: 0.7px; font-weight: 600;
    }
    .panel-meta { font-size: 11px; color: var(--ink-4); }
    .sort-seg { display: flex; align-items: center; gap: 8px; }
    .seg { display: inline-flex; border: 1px solid var(--line); height: 22px; }
    .seg-btn {
      padding: 0 8px; font-size: 11px; color: var(--ink-2);
      border-right: 1px solid var(--line); background: none;
      border-top: 0; border-bottom: 0; border-left: 0; cursor: pointer;
      font-family: inherit;
    }
    .seg-btn:last-child { border-right: 0; }
    .seg-btn.active { background: var(--ink-1); color: #fff; }

    /* Cards table */
    .cards-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
    .cards-table thead th {
      text-align: left; font-size: 10.5px; font-weight: 600; color: var(--ink-3);
      text-transform: uppercase; letter-spacing: 0.5px;
      padding: 8px 14px;
      border-bottom: 1px solid var(--line);
      background: var(--surface-sunk);
    }
    .cards-table thead th.r { text-align: right; }

    .card-row td {
      padding: 10px 14px;
      border-bottom: 1px solid var(--line-soft);
      vertical-align: middle;
    }
    .card-row:last-child td { border-bottom: none; }
    .card-row { cursor: pointer; }
    .card-row:hover td { background: var(--surface-alt); }
    .r { text-align: right; }

    .card-name-cell { display: flex; align-items: center; gap: 10px; }
    .card-badge {
      width: 36px; height: 22px;
      display: flex; align-items: center; justify-content: center;
      font-size: 9px; font-weight: 700; color: #fff;
      letter-spacing: 0.5px; flex-shrink: 0;
    }
    .card-bank { font-size: 13px; font-weight: 500; color: var(--ink-1); }
    .card-number { font-size: 11px; color: var(--ink-4); }

    .holder-cell { display: flex; align-items: center; gap: 6px; }
    .holder-label { font-size: 11.5px; color: var(--ink-3); }

    .date-cell { display: flex; flex-direction: column; gap: 2px; }
    .date-day { font-size: 12px; font-weight: 500; color: var(--ink-1); }
    .date-sub { font-size: 11px; color: var(--ink-4); }
    .date-sub.warn { color: var(--warn); font-weight: 500; }

    .util-header { display: flex; justify-content: space-between; margin-bottom: 4px; }
    .util-values { font-size: 11px; color: var(--ink-3); }
    .util-pct { font-size: 11px; color: var(--ink-2); }
    .util-pct.over { color: var(--neg); font-weight: 600; }

    .invoice-sub { font-size: 11px; color: var(--ink-4); margin-top: 2px; }

    .panel-foot {
      display: flex; justify-content: space-between; align-items: center;
      padding: 8px 14px;
      border-top: 1px solid var(--line-soft);
      font-size: 11px; color: var(--ink-3);
    }
    .foot-add { display: flex; align-items: center; gap: 6px; cursor: default; }
    .foot-total { color: var(--ink-1); font-weight: 600; }

    /* Commitments */
    .commitments-panel { margin-bottom: 0; }
    .commitments-grid {
      display: flex;
      gap: 8px;
      padding: 12px 14px;
    }
    .commitment-cell {
      flex: 1;
      padding: 10px 12px;
      background: var(--surface-sunk);
      border: 1px solid var(--line);
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .commitment-cell.highlight { background: var(--brand-soft); }
    .commit-label {
      font-size: 10.5px; font-weight: 600; color: var(--ink-3);
      text-transform: uppercase; letter-spacing: 0.6px;
    }
    .commit-sub { font-size: 11px; color: var(--ink-4); margin-top: 2px; }
    .commit-pill-warn {
      display: inline-block; margin-top: 4px;
      font-size: 10px; font-weight: 500; padding: 1px 6px;
      background: var(--warn-soft); color: var(--warn);
      text-transform: uppercase; letter-spacing: 0.4px;
      width: fit-content;
    }
  `],
})
export class CardsComponent {
  protected data = inject(AppDataService);

  sortMode = signal<SortMode>('closing');

  private today = new Date();

  // ── KPI computeds ─────────────────────────────────────────────────────────

  totalOpen  = computed(() => this.data.cards().reduce((s, c) => s + c.current, 0));
  totalLimit = computed(() => this.data.cards().reduce((s, c) => s + c.limit, 0));

  utilizationPct = computed(() =>
    this.totalLimit() > 0
      ? Math.round((this.totalOpen() / this.totalLimit()) * 100)
      : 0
  );

  mateusCount = computed(() => this.data.cards().filter(c => c.holder === 'Mateus').length);
  thaisCount  = computed(() => this.data.cards().filter(c => c.holder === 'Thais').length);

  closingSoon = computed(() =>
    this.data.cards().filter(c => daysUntilClosing(c, this.today) <= 7).length
  );

  nextDueCard = computed(() => {
    return [...this.data.cards()].sort(
      (a, b) => daysUntilDue(a, this.today) - daysUntilDue(b, this.today)
    )[0] ?? null;
  });

  nextDueLabel = computed(() => {
    const card = this.nextDueCard();
    if (!card) return '—';
    const days = daysUntilDue(card, this.today);
    const d = new Date(this.today.getTime() + days * 86_400_000);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  });

  // ── Table ─────────────────────────────────────────────────────────────────

  sortedCards = computed(() => {
    const cards = [...this.data.cards()];
    switch (this.sortMode()) {
      case 'closing': return cards.sort((a, b) => daysUntilClosing(a, this.today) - daysUntilClosing(b, this.today));
      case 'value':   return cards.sort((a, b) => b.current - a.current);
      case 'holder':  return cards.sort((a, b) => a.holder.localeCompare(b.holder));
    }
  });

  private cardActivity = computed(() => {
    const act = new Set<string>();
    for (const t of this.data.transactions()) {
      if (this.data.cardBy()[t.method]) act.add(t.method);
    }
    return act;
  });

  // ── Compromissos futuros ──────────────────────────────────────────────────

  futureMonths = computed(() => {
    const installmentTx = this.data.transactions().filter(t => t.installments !== null);

    return FUTURE_MONTHS.map((label, monthOffset) => {
      // monthOffset 0 = Jun/26, 1 = Jul/26, etc. (current = May = offset -1)
      const futureMonthIndex = monthOffset + 1; // parcelas que ainda faltam: >= futureMonthIndex
      let total = 0;
      let count = 0;
      for (const tx of installmentTx) {
        const remaining = tx.installments!.of - tx.installments!.n;
        if (remaining >= futureMonthIndex) {
          total += tx.value;
          count++;
        }
      }
      return { label, total, count, isFirst: monthOffset === 0 };
    });
  });

  // ── Helpers ───────────────────────────────────────────────────────────────

  daysLeft(card: Card) { return daysUntilClosing(card, this.today); }
  utilPct(card: Card)  { return Math.round((card.current / card.limit) * 100); }
  historyOf(card: Card) { return cardHistory(card); }
  hasActivity(cardId: string) { return this.cardActivity().has(cardId); }
  fmtShort(v: number)  { return v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
}
