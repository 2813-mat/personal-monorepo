import { Component, inject, computed } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AppDataService } from '../../layout/app-data.service';
import { MoneyComponent } from '../../ui/money/money.component';
import { AvatarComponent } from '../../ui/avatar/avatar.component';
import { CatDotComponent } from '../../ui/cat-dot/cat-dot.component';
import { ProgressBarComponent } from '../../ui/progress-bar/progress-bar.component';
import { SparkbarsComponent } from '../../ui/sparkbars/sparkbars.component';
import { DonutComponent, type DonutSegment } from '../../ui/donut/donut.component';
import { IconComponent } from '../../ui/icon/icon.component';
import type { Transaction } from '@caixa-familia/shared-types';

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

interface CatBreakdown {
  catId: string;
  label: string;
  color: string;
  total: number;
}

interface FutureInstallment {
  txId: string;
  label: string;
  k: number;
  of: number;
  monthLabel: string;
  value: number;
}

@Component({
  selector: 'cf-invoice',
  standalone: true,
  imports: [
    MoneyComponent,
    AvatarComponent,
    CatDotComponent,
    ProgressBarComponent,
    SparkbarsComponent,
    DonutComponent,
    IconComponent,
  ],
  template: `
    @if (card(); as c) {
      <!-- Breadcrumb -->
      <div class="crumbs">
        <span class="crumb-muted">Cartões</span>
        <cf-icon name="chevRight" [size]="9" color="var(--ink-4)" />
        <span class="crumb-muted">{{ c.bank }}</span>
        <cf-icon name="chevRight" [size]="9" color="var(--ink-4)" />
        <span class="crumb-current">Fatura {{ data.currentMonth().short }}</span>
      </div>

      <!-- Header card -->
      <div class="head-card">
        <div class="head-stripe" [style.background]="c.color"></div>
        <div class="head-row">
          <!-- Identity -->
          <div class="head-col">
            <div class="head-bank-row">
              <span class="head-bank">{{ c.bank }}</span>
              <span class="head-last4 num">···{{ c.last4 }}</span>
            </div>
            <div class="head-holder-row">
              <cf-avatar [holder]="c.holder" [size]="14" />
              <span class="head-meta">{{ c.holder }} · cartão de crédito</span>
            </div>
          </div>

          <div class="vdiv"></div>

          <!-- Total -->
          <div class="head-stat">
            <div class="stat-label">Total da fatura</div>
            <cf-money [value]="c.current" size="xl" [negColor]="false" />
          </div>

          <!-- Limite -->
          <div class="head-stat">
            <div class="stat-label">Limite</div>
            <cf-money [value]="c.limit" size="md" [negColor]="false" />
            <div class="limit-bar">
              <cf-progress-bar [value]="c.current" [max]="c.limit" [color]="c.color" [height]="4" />
            </div>
            <span class="stat-sub num">{{ (c.current / c.limit * 100).toFixed(0) }}% utilizado</span>
          </div>

          <!-- Fecha em -->
          <div class="head-stat">
            <div class="stat-label">Fecha em</div>
            <div class="stat-big num">dia {{ c.closing }}</div>
          </div>

          <!-- Vence em -->
          <div class="head-stat">
            <div class="stat-label">Vence em</div>
            <div class="stat-big num">dia {{ c.due }}</div>
          </div>

          <div class="spacer"></div>

          <!-- Actions (disabled) -->
          <div class="head-actions">
            <button class="btn-ghost" disabled>
              <cf-icon name="download" [size]="11" /> Boleto
            </button>
            <button class="btn-primary" disabled>
              <cf-icon name="pix" [size]="11" /> Pagar agora
            </button>
          </div>
        </div>
      </div>

      <!-- Main grid -->
      <div class="grid">
        <!-- Left: purchases -->
        <div class="panel">
          <div class="panel-head">
            <span class="panel-title">Compras nesta fatura</span>
            <span class="panel-meta">{{ items().length }} lançamentos · fechamento dia {{ c.closing }}</span>
          </div>

          <div class="table-scroll">
            <table class="tbl">
              <thead>
                <tr>
                  <th style="width:70px">Data</th>
                  <th>Estabelecimento</th>
                  <th style="width:120px">Categoria</th>
                  <th style="width:96px">Parcela</th>
                  <th style="width:60px">Quem</th>
                  <th class="r" style="width:100px">Valor</th>
                </tr>
              </thead>
              <tbody>
                @for (tx of items(); track tx.id) {
                  <tr class="row">
                    <td class="muted num">{{ fmtDate(tx.date) }}</td>
                    <td>
                      <div class="estab-cell">
                        <span class="estab-label">{{ tx.label }}</span>
                        @if (tx.installments) {
                          <span class="estab-sub num">parcela {{ tx.installments.n }} de {{ tx.installments.of }}</span>
                        }
                      </div>
                    </td>
                    <td>
                      <div class="cat-cell">
                        <cf-cat-dot [catId]="tx.cat" [size]="7" />
                        <span class="cat-label">{{ catLabel(tx.cat) }}</span>
                      </div>
                    </td>
                    <td>
                      @if (tx.installments) {
                        <div class="inst-cell">
                          <span class="inst-label num">{{ tx.installments.n }}/{{ tx.installments.of }}</span>
                          <cf-progress-bar
                            [value]="tx.installments.n"
                            [max]="tx.installments.of"
                            [color]="c.color"
                            [height]="2"
                          />
                        </div>
                      } @else {
                        <span class="avista">À vista</span>
                      }
                    </td>
                    <td>
                      @if (tx.holder !== 'shared') {
                        <cf-avatar [holder]="tx.holder" [size]="18" />
                      } @else {
                        <div class="shared-avatars">
                          <cf-avatar holder="Mateus" [size]="15" />
                          <cf-avatar holder="Thais" [size]="15" />
                        </div>
                      }
                    </td>
                    <td class="r num value-cell">
                      <cf-money [value]="tx.value" [negColor]="false" />
                    </td>
                  </tr>
                }
                @if (items().length === 0) {
                  <tr>
                    <td colspan="6" class="empty-cell">Nenhuma compra nesta fatura</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="panel-foot">
            <span>{{ items().length }} compras nesta fatura</span>
            <span class="foot-total num">
              Subtotal: <cf-money [value]="total()" [negColor]="false" size="sm" />
            </span>
          </div>
        </div>

        <!-- Right column -->
        <div class="side-col">
          <!-- By category -->
          <div class="panel">
            <div class="panel-head">
              <span class="panel-title">Por categoria</span>
            </div>
            <div class="cat-body">
              @if (breakdown().length > 0) {
                <div class="donut-wrap">
                  <cf-donut [segments]="donutSegments()" [size]="96" [stroke]="14" />
                </div>
              }
              @for (b of breakdown(); track b.catId) {
                <div class="cat-line">
                  <div class="cat-line-top">
                    <span class="cat-line-name">
                      <cf-cat-dot [catId]="b.catId" [size]="7" />
                      <span class="cat-line-label">{{ b.label }}</span>
                    </span>
                    <cf-money [value]="b.total" [negColor]="false" size="sm" />
                  </div>
                  <cf-progress-bar [value]="b.total" [max]="total()" [color]="b.color" [height]="3" />
                </div>
              }
              @if (breakdown().length === 0) {
                <div class="empty-mini">Sem categorias</div>
              }
            </div>
          </div>

          <!-- History -->
          <div class="panel">
            <div class="panel-head">
              <span class="panel-title">Histórico desta fatura</span>
              <span class="panel-meta">9 meses</span>
            </div>
            <div class="hist-body">
              <cf-sparkbars
                [data]="history()"
                [width]="320"
                [height]="48"
                [baseColor]="c.color"
                [highlightColor]="c.color"
                [highlightIndex]="8"
              />
              <hr class="hr" />
              <div class="hist-stats">
                <div class="stat-col">
                  <span class="stat-label">Média</span>
                  <cf-money [value]="histAvg()" [negColor]="false" size="sm" />
                </div>
                <div class="stat-col">
                  <span class="stat-label">Maior</span>
                  <cf-money [value]="histMax()" [negColor]="false" size="sm" />
                </div>
                <div class="stat-col">
                  <span class="stat-label">Menor</span>
                  <cf-money [value]="histMin()" [negColor]="false" size="sm" />
                </div>
              </div>
            </div>
          </div>

          <!-- Future installments -->
          <div class="panel">
            <div class="panel-head">
              <span class="panel-title">Parcelas futuras desta fatura</span>
              <span class="panel-meta">próximos meses</span>
            </div>
            <table class="tbl">
              <tbody>
                @for (f of futureInstallments(); track f.txId + '-' + f.k) {
                  <tr class="row">
                    <td class="future-label">{{ f.label }}</td>
                    <td class="muted num future-meta">{{ f.k }}/{{ f.of }} · {{ f.monthLabel }}</td>
                    <td class="r num future-value">
                      <cf-money [value]="f.value" [negColor]="false" size="sm" />
                    </td>
                  </tr>
                }
                @if (futureInstallments().length === 0) {
                  <tr>
                    <td colspan="3" class="empty-cell">Nenhuma parcela a vencer</td>
                  </tr>
                }
              </tbody>
            </table>
            @if (futureInstallments().length > 0) {
              <div class="panel-foot">
                <span>{{ futureInstallments().length }} {{ futureInstallments().length === 1 ? 'parcela a vencer' : 'parcelas a vencer' }}</span>
                <span class="foot-total num">
                  <cf-money [value]="futureTotal()" [negColor]="false" size="sm" />
                </span>
              </div>
            }
          </div>
        </div>
      </div>
    } @else {
      <div class="not-found">
        <div class="nf-title">Cartão não encontrado</div>
        <div class="nf-note">O cartão solicitado não existe ou foi removido. Volte para a lista de cartões.</div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }

    /* Breadcrumb */
    .crumbs {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 10px;
    }
    .crumb-muted { font-size: 11px; color: var(--ink-4); }
    .crumb-current { font-size: 12px; color: var(--ink-1); font-weight: 500; }

    /* Header card */
    .head-card {
      background: var(--surface);
      border: 1px solid var(--line);
      box-shadow: var(--shadow-sm);
      margin-bottom: 12px;
      overflow: hidden;
    }
    .head-stripe { height: 6px; }
    .head-row {
      display: flex;
      align-items: center;
      gap: 24px;
      padding: 14px 16px;
      flex-wrap: wrap;
    }
    .head-col { display: flex; flex-direction: column; gap: 4px; }
    .head-bank-row { display: flex; align-items: center; gap: 8px; }
    .head-bank { font-size: 18px; font-weight: 600; letter-spacing: -0.3px; color: var(--ink-1); }
    .head-last4 { font-size: 11px; color: var(--ink-4); }
    .head-holder-row { display: flex; align-items: center; gap: 6px; }
    .head-meta { font-size: 11px; color: var(--ink-4); }

    .vdiv { width: 1px; height: 40px; background: var(--line); flex-shrink: 0; }

    .head-stat { display: flex; flex-direction: column; gap: 3px; }
    .stat-label {
      font-size: 10.5px; color: var(--ink-3);
      text-transform: uppercase; letter-spacing: 0.6px; font-weight: 600;
    }
    .stat-sub { font-size: 11px; color: var(--ink-4); }
    .stat-big { font-size: 18px; font-weight: 600; color: var(--ink-1); }
    .limit-bar { width: 130px; margin-top: 1px; }

    .spacer { flex: 1; }

    .head-actions { display: flex; flex-direction: column; gap: 6px; }
    .btn-ghost, .btn-primary {
      display: inline-flex; align-items: center; gap: 6px;
      height: 28px; padding: 0 12px;
      font-size: 12px; font-family: inherit;
      cursor: not-allowed; opacity: 0.55;
      white-space: nowrap;
    }
    .btn-ghost {
      border: 1px solid var(--line); background: var(--surface); color: var(--ink-1);
    }
    .btn-primary {
      border: 1px solid var(--brand); background: var(--brand); color: #fff;
    }

    /* Main grid */
    .grid { display: grid; grid-template-columns: 1.6fr 1fr; gap: 12px; }
    .side-col { display: flex; flex-direction: column; gap: 12px; }

    /* Panels */
    .panel {
      background: var(--surface);
      border: 1px solid var(--line);
      box-shadow: var(--shadow-sm);
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

    .table-scroll { overflow-x: auto; }

    /* Tables */
    .tbl { width: 100%; border-collapse: collapse; font-size: 12.5px; }
    .tbl thead th {
      text-align: left;
      font-size: 10.5px; font-weight: 600; color: var(--ink-3);
      text-transform: uppercase; letter-spacing: 0.5px;
      padding: 8px 12px;
      border-bottom: 1px solid var(--line);
      background: var(--surface-sunk);
      white-space: nowrap;
    }
    .tbl thead th.r { text-align: right; }

    .row td {
      padding: 8px 12px;
      border-bottom: 1px solid var(--line-soft);
      color: var(--ink-2);
      vertical-align: middle;
    }
    .row:last-child td { border-bottom: 0; }
    .row:hover td { background: var(--surface-alt); }
    .r { text-align: right; }
    .muted { color: var(--ink-4); font-size: 11px; }

    .estab-cell { display: flex; flex-direction: column; gap: 1px; }
    .estab-label { color: var(--ink-1); }
    .estab-sub { font-size: 10.5px; color: var(--ink-4); }

    .cat-cell { display: flex; align-items: center; gap: 6px; }
    .cat-label { font-size: 12px; color: var(--ink-2); }

    .inst-cell { display: flex; flex-direction: column; gap: 2px; width: 72px; }
    .inst-label { font-size: 11px; color: var(--ink-4); }
    .avista { color: var(--ink-4); font-size: 11px; }

    .shared-avatars { display: flex; align-items: center; }
    .shared-avatars cf-avatar:last-child { margin-left: -5px; opacity: 0.85; }

    .value-cell { color: var(--ink-1); }

    .empty-cell {
      padding: 28px 12px; text-align: center;
      color: var(--ink-4); font-size: 13px;
    }
    .empty-mini { padding: 10px 0; text-align: center; color: var(--ink-4); font-size: 12px; }

    .panel-foot {
      display: flex; justify-content: space-between; align-items: center;
      padding: 8px 14px;
      border-top: 1px solid var(--line-soft);
      font-size: 11px; color: var(--ink-3);
    }
    .foot-total { color: var(--ink-1); font-weight: 600; display: flex; align-items: center; gap: 4px; }

    /* By category */
    .cat-body { padding: 8px 14px 10px; }
    .donut-wrap { display: flex; justify-content: center; padding: 6px 0 12px; }
    .cat-line { padding: 6px 0; border-bottom: 1px solid var(--line-soft); }
    .cat-line:last-child { border-bottom: 0; }
    .cat-line-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
    .cat-line-name { display: flex; align-items: center; gap: 6px; }
    .cat-line-label { font-size: 12px; color: var(--ink-2); }

    /* History */
    .hist-body { padding: 12px 14px; }
    .hr { border: 0; border-top: 1px solid var(--line-soft); margin: 10px 0; }
    .hist-stats { display: flex; justify-content: space-between; }
    .stat-col { display: flex; flex-direction: column; gap: 2px; }

    /* Future */
    .future-label { color: var(--ink-1); padding-left: 14px; }
    .future-meta { white-space: nowrap; }
    .future-value { color: var(--ink-1); padding-right: 14px; }

    /* Not found */
    .not-found {
      background: var(--surface);
      border: 1px solid var(--line);
      box-shadow: var(--shadow-sm);
      padding: 40px 24px;
      text-align: center;
    }
    .nf-title { font-size: 16px; font-weight: 600; color: var(--ink-1); margin-bottom: 6px; }
    .nf-note { font-size: 13px; color: var(--ink-4); }
  `],
})
export class InvoiceComponent {
  protected data = inject(AppDataService);
  private route = inject(ActivatedRoute);

  private cardId = this.route.snapshot.params['cardId'] as string;

  card = computed(() => this.data.cardBy()[this.cardId]);

  // Purchases on this invoice, newest first.
  items = computed((): Transaction[] =>
    this.data.transactions()
      .filter(t => t.method === this.cardId)
      .sort((a, b) => b.date.localeCompare(a.date))
  );

  total = computed(() => this.items().reduce((s, t) => s + t.value, 0));

  // Category breakdown, descending by total.
  breakdown = computed((): CatBreakdown[] => {
    const sums: Record<string, number> = {};
    for (const t of this.items()) {
      sums[t.cat] = (sums[t.cat] ?? 0) + t.value;
    }
    const catBy = this.data.catBy();
    return Object.entries(sums)
      .map(([catId, totalVal]) => ({
        catId,
        label: catBy[catId]?.label ?? catId,
        color: catBy[catId]?.color ?? '#9CA3AF',
        total: totalVal,
      }))
      .sort((a, b) => b.total - a.total);
  });

  donutSegments = computed((): DonutSegment[] =>
    this.breakdown().map(b => ({ value: b.total, color: b.color, label: b.label }))
  );

  // Synthetic 9-month history (no per-card history stored): card.current ±20%,
  // seeded from the card id char codes so it's stable; last entry == current.
  history = computed((): number[] => {
    const c = this.card();
    if (!c) return [];
    const seed = this.cardId.charCodeAt(0) + (this.cardId.charCodeAt(1) || 0);
    return Array.from({ length: 9 }, (_, i) =>
      i === 8 ? c.current : Math.round(c.current * (0.8 + ((seed + i * 13) % 40) / 100))
    );
  });

  histAvg = computed(() => {
    const h = this.history();
    if (h.length === 0) return 0;
    return h.reduce((s, v) => s + v, 0) / h.length;
  });
  histMax = computed(() => (this.history().length ? Math.max(...this.history()) : 0));
  histMin = computed(() => (this.history().length ? Math.min(...this.history()) : 0));

  // Remaining installments projected forward month-by-month from currentMonth().
  futureInstallments = computed((): FutureInstallment[] => {
    const { year, month } = this.data.currentMonth();
    const out: FutureInstallment[] = [];
    for (const tx of this.items()) {
      const inst = tx.installments;
      if (!inst || inst.n >= inst.of) continue;
      for (let k = inst.n + 1; k <= inst.of; k++) {
        // offset 1 = month after current, etc.
        const offset = k - inst.n;
        const d = new Date(year, (month - 1) + offset, 1);
        const monthLabel = `${MONTHS[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
        out.push({ txId: tx.id, label: tx.label, k, of: inst.of, monthLabel, value: tx.value });
      }
    }
    return out;
  });

  futureTotal = computed(() => this.futureInstallments().reduce((s, f) => s + f.value, 0));

  fmtDate(date: string): string {
    const d = new Date(date + 'T12:00:00');
    const day = String(d.getDate()).padStart(2, '0');
    return `${day} ${MONTHS[d.getMonth()]}`;
  }

  catLabel(catId: string): string {
    return this.data.catBy()[catId]?.label ?? catId;
  }
}
