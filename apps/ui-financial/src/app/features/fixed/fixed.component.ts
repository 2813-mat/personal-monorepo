import { Component, inject, computed } from '@angular/core';
import { AppDataService } from '../../layout/app-data.service';
import { MoneyComponent } from '../../ui/money/money.component';
import { AvatarComponent } from '../../ui/avatar/avatar.component';
import { CatDotComponent } from '../../ui/cat-dot/cat-dot.component';
import { IconComponent } from '../../ui/icon/icon.component';
import { ProgressBarComponent } from '../../ui/progress-bar/progress-bar.component';

@Component({
  selector: 'cf-fixed',
  standalone: true,
  imports: [MoneyComponent, AvatarComponent, CatDotComponent, IconComponent, ProgressBarComponent],
  template: `
    <!-- KPI Grid: 1 large card + 3 small KPIs -->
    <div class="kpi-grid">
      <div class="card summary-card">
        <div class="summary-header">
          <div class="summary-left">
            <div class="kpi-label">Compromissos fixos do mês</div>
            <cf-money [value]="totalFixed()" [negColor]="false" size="xl" />
          </div>
          <div class="summary-right">
            <span class="pill brand">{{ data.fixed().length }} contas</span>
            <span class="tx-meta">renovam todo mês</span>
          </div>
        </div>
        <cf-progress-bar
          [value]="totalPaid()"
          [max]="totalFixed()"
          color="var(--pos)"
          [height]="6"
        />
        <div class="summary-footer">
          <span class="tx-meta num">
            <cf-money [value]="totalPaid()" [negColor]="false" size="sm" /> pagos
          </span>
          <span class="tx-meta num">
            <cf-money [value]="totalPending()" [negColor]="false" size="sm" /> a vencer
          </span>
        </div>
      </div>

      <div class="kpi">
        <div class="kpi-label">Pagos</div>
        <div class="kpi-value pos">{{ paidItems().length }}</div>
        <div class="kpi-meta">de {{ data.fixed().length }} contas</div>
      </div>

      <div class="kpi">
        <div class="kpi-label">Próx. 7 dias</div>
        <div class="kpi-value warn">{{ upcoming7() }}</div>
        <div class="kpi-meta">vencendo em breve</div>
      </div>

      <div class="kpi">
        <div class="kpi-label">% da receita</div>
        <div class="kpi-value">{{ formatPercent(pctReceita()) }}</div>
        <div class="kpi-meta">renda fixa comprometida</div>
      </div>
    </div>

    <!-- Two tables side by side -->
    <div class="tables-grid">
      <!-- Left: A vencer (pending) -->
      <div class="card">
        <div class="card-head">
          <div class="card-head-left">
            <span class="card-title">A vencer</span>
            <span class="pill warn">{{ pendingItems().length }}</span>
          </div>
          <span class="card-meta">ordenado por vencimento</span>
        </div>

        <table class="tx-table">
          <thead>
            <tr>
              <th style="width:80px">Venc.</th>
              <th>Conta</th>
              <th style="width:110px">Categoria</th>
              <th style="width:60px">Quem</th>
              <th class="r" style="width:100px">Valor</th>
            </tr>
          </thead>
          <tbody>
            @for (f of pendingItems(); track f.id) {
              <tr class="tx-row">
                <td>
                  <div class="due-cell">
                    <span class="num date-label">{{ formatDay(f.due) }}</span>
                    <span class="num days-away">{{ formatDaysAway(f.due) }}</span>
                  </div>
                </td>
                <td>
                  <div class="desc-cell">
                    <cf-icon name="repeat" [size]="11" color="var(--ink-4)" />
                    <span>{{ f.label }}</span>
                    @if (daysAway(f.due) >= 0 && daysAway(f.due) <= 3) {
                      <span class="pill warn">urgente</span>
                    }
                    @if (daysAway(f.due) < 0) {
                      <span class="pill neg">vencido</span>
                    }
                  </div>
                </td>
                <td>
                  <div class="cat-cell">
                    <cf-cat-dot [catId]="f.cat" />
                    <span class="cat-label">{{ catLabel(f.cat) }}</span>
                  </div>
                </td>
                <td>
                  @if (f.holder === 'shared') {
                    <div class="shared-avatars">
                      <cf-avatar holder="Mateus" [size]="16" />
                      <cf-avatar holder="Thais"  [size]="16" />
                    </div>
                  } @else {
                    <cf-avatar [holder]="f.holder" [size]="18" />
                  }
                </td>
                <td class="r num">
                  <cf-money [value]="f.value" [negColor]="false" />
                </td>
              </tr>
            }
            @if (pendingItems().length === 0) {
              <tr>
                <td colspan="5" class="empty-cell">Todos os fixos foram pagos</td>
              </tr>
            }
          </tbody>
        </table>

        <div class="card-foot">
          <span>{{ pendingItems().length }} contas</span>
          <cf-money [value]="totalPending()" [negColor]="false" size="sm" />
        </div>
      </div>

      <!-- Right: Pagos no mês -->
      <div class="card">
        <div class="card-head">
          <div class="card-head-left">
            <span class="card-title">Pagos no mês</span>
            <span class="pill pos">{{ paidItems().length }}</span>
          </div>
          <span class="card-meta">automático via boleto/PIX</span>
        </div>

        <table class="tx-table">
          <thead>
            <tr>
              <th style="width:80px">Pago</th>
              <th>Conta</th>
              <th style="width:110px">Categoria</th>
              <th style="width:60px">Quem</th>
              <th class="r" style="width:100px">Valor</th>
            </tr>
          </thead>
          <tbody>
            @for (f of paidItems(); track f.id) {
              <tr class="tx-row">
                <td>
                  <div class="paid-date">
                    <cf-icon name="check" [size]="11" color="var(--pos)" />
                    <span class="num date-label">{{ formatDay(f.due) }}</span>
                  </div>
                </td>
                <td>
                  <div class="desc-cell">
                    <cf-icon name="repeat" [size]="11" color="var(--ink-4)" />
                    <span>{{ f.label }}</span>
                  </div>
                </td>
                <td>
                  <div class="cat-cell">
                    <cf-cat-dot [catId]="f.cat" />
                    <span class="cat-label">{{ catLabel(f.cat) }}</span>
                  </div>
                </td>
                <td>
                  @if (f.holder === 'shared') {
                    <div class="shared-avatars">
                      <cf-avatar holder="Mateus" [size]="16" />
                      <cf-avatar holder="Thais"  [size]="16" />
                    </div>
                  } @else {
                    <cf-avatar [holder]="f.holder" [size]="18" />
                  }
                </td>
                <td class="r num paid-value">
                  <cf-money [value]="f.value" [negColor]="false" />
                </td>
              </tr>
            }
          </tbody>
        </table>

        <div class="card-foot">
          <span>{{ paidItems().length }} contas</span>
          <cf-money [value]="totalPaid()" [negColor]="false" size="sm" />
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    /* ── KPI grid ───────────────────────────────────── */
    .kpi-grid {
      display: grid;
      grid-template-columns: 1.4fr 1fr 1fr 1fr;
      gap: 12px;
      margin-bottom: 12px;
    }

    .card {
      background: var(--surface);
      border: 1px solid var(--line);
      box-shadow: 0 1px 3px rgba(0,0,0,.08);
    }

    .summary-card { padding: 14px 16px; }

    .summary-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }
    .summary-left  { display: flex; flex-direction: column; gap: 2px; }
    .summary-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
    .summary-footer {
      display: flex;
      justify-content: space-between;
      margin-top: 4px;
    }

    .kpi {
      background: var(--surface);
      border: 1px solid var(--line);
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .kpi-label {
      font-size: 10.5px;
      color: var(--ink-3);
      text-transform: uppercase;
      letter-spacing: 0.6px;
      font-weight: 600;
    }
    .kpi-value {
      font-size: 28px;
      font-weight: 700;
      color: var(--ink-1);
      font-variant-numeric: tabular-nums;
      line-height: 1;
      margin-top: 4px;
    }
    .kpi-value.pos  { color: var(--pos); }
    .kpi-value.warn { color: var(--warn); }
    .kpi-meta { font-size: 11px; color: var(--ink-4); margin-top: 2px; }

    /* ── Tables grid ────────────────────────────────── */
    .tables-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .card-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px 8px;
      border-bottom: 1px solid var(--line-soft);
    }
    .card-head-left { display: flex; align-items: center; gap: 8px; }
    .card-title {
      font-size: 11px;
      color: var(--ink-3);
      text-transform: uppercase;
      letter-spacing: 0.7px;
      font-weight: 600;
    }
    .card-meta { font-size: 10.5px; color: var(--ink-4); }

    .card-foot {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 14px;
      border-top: 1px solid var(--line-soft);
      font-size: 11px;
      color: var(--ink-3);
    }

    /* ── Table ──────────────────────────────────────── */
    .tx-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12.5px;
    }
    .tx-table thead th {
      text-align: left;
      font-size: 10.5px; font-weight: 600; color: var(--ink-3);
      text-transform: uppercase; letter-spacing: 0.5px;
      padding: 8px 12px;
      border-bottom: 1px solid var(--line);
      background: var(--surface-sunk);
      white-space: nowrap;
      position: sticky; top: 0; z-index: 1;
    }
    .tx-table thead th.r { text-align: right; }
    .tx-row td {
      padding: 8px 12px;
      border-bottom: 1px solid var(--line-soft);
      color: var(--ink-2);
      vertical-align: middle;
    }
    .tx-row:hover td { background: var(--surface-alt); }
    .r { text-align: right; }

    /* ── Cell helpers ───────────────────────────────── */
    .due-cell  { display: flex; flex-direction: column; gap: 2px; }
    .paid-date { display: flex; align-items: center; gap: 6px; }
    .desc-cell { display: flex; align-items: center; gap: 6px; }
    .cat-cell  { display: flex; align-items: center; gap: 6px; }

    .date-label { font-size: 12px; color: var(--ink-1); font-weight: 500; }
    .days-away  { font-size: 11px; color: var(--ink-4); }
    .cat-label  { font-size: 11px; color: var(--ink-4); }
    .paid-value { color: var(--ink-3); }

    .shared-avatars { display: flex; align-items: center; }
    .shared-avatars cf-avatar:last-child { margin-left: -5px; opacity: 0.85; }

    .empty-cell {
      padding: 24px 12px;
      text-align: center;
      color: var(--ink-4); font-size: 13px;
    }

    /* ── Pills ──────────────────────────────────────── */
    .pill {
      display: inline-flex; align-items: center;
      font-size: 10px; font-weight: 600;
      padding: 2px 6px;
      text-transform: uppercase; letter-spacing: 0.4px;
    }
    .pill.brand { background: var(--brand-soft); color: var(--brand); }
    .pill.warn  { background: var(--warn-soft);  color: var(--warn);  }
    .pill.pos   { background: var(--pos-soft);   color: var(--pos);   }
    .pill.neg   { background: var(--neg-soft);   color: var(--neg);   }

    /* ── Typography helpers ─────────────────────────── */
    .tx-meta { font-size: 11px; color: var(--ink-4); }
    .num { font-variant-numeric: tabular-nums; font-family: var(--font-mono); }
  `],
})
export class FixedComponent {
  protected data = inject(AppDataService);

  private paidValueSet = computed(() =>
    new Set(this.data.transactions().filter(t => t.recurring).map(t => t.value))
  );

  pendingItems = computed(() =>
    this.data.fixed()
      .filter(f => !this.paidValueSet().has(f.value))
      .sort((a, b) => a.due - b.due)
  );

  paidItems = computed(() =>
    this.data.fixed()
      .filter(f => this.paidValueSet().has(f.value))
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
