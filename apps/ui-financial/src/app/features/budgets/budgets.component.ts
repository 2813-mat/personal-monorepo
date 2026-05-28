import { Component, inject, computed } from '@angular/core';
import { AppDataService } from '../../layout/app-data.service';
import { MoneyComponent } from '../../ui/money/money.component';
import { CatDotComponent } from '../../ui/cat-dot/cat-dot.component';
import { ProgressBarComponent } from '../../ui/progress-bar/progress-bar.component';
import { SparkbarsComponent } from '../../ui/sparkbars/sparkbars.component';
import type { BudgetStatus, Category } from '@caixa-familia/shared-types';

interface CatRow {
  cat: Category;
  spent: number;
  remaining: number;
  pct: number;
  status: BudgetStatus;
  history: number[];
  histAvg: number;
}

@Component({
  selector: 'cf-budgets',
  standalone: true,
  imports: [MoneyComponent, CatDotComponent, ProgressBarComponent, SparkbarsComponent],
  template: `
    <!-- KPI Strip -->
    <div class="strip">
      <div class="kpi-item">
        <div class="kpi-label">Orçamento mensal total</div>
        <cf-money [value]="totalBudget()" [negColor]="false" />
      </div>
      <div class="kpi-divider"></div>
      <div class="kpi-item">
        <div class="kpi-label">Gasto até hoje</div>
        <cf-money [value]="totalSpent()" [negColor]="false" />
        <div class="kpi-sub num">{{ budgetPct() }}% do orçamento</div>
      </div>
      <div class="kpi-divider"></div>
      <div class="kpi-item">
        <div class="kpi-label">No vermelho</div>
        <div class="kpi-value num" [style.color]="overCount() > 0 ? 'var(--neg)' : 'var(--ink-1)'">
          {{ overCount() }}
        </div>
        <div class="kpi-sub">categorias estouradas</div>
      </div>
      <div class="kpi-divider"></div>
      <div class="kpi-item">
        <div class="kpi-label">Sobra projetada</div>
        <cf-money [value]="surplus()" [color]="surplus() >= 0 ? 'var(--pos)' : 'var(--neg)'" />
        <div class="kpi-sub">no fim do mês</div>
      </div>
    </div>

    <!-- Table Card -->
    <div class="table-card">
      <div class="table-head">
        <span class="table-title">Orçamento por categoria · {{ data.currentMonth().short }}</span>
      </div>

      <div class="table-scroll">
        <table class="bud-table">
          <thead>
            <tr>
              <th>Categoria</th>
              <th class="r" style="width:110px">Orçamento</th>
              <th class="r" style="width:110px">Gasto</th>
              <th class="r" style="width:110px">Restante</th>
              <th style="width:200px">Progresso</th>
              <th style="width:130px">Tendência (6m)</th>
              <th style="width:90px">Status</th>
            </tr>
          </thead>
          <tbody>
            @for (row of catRows(); track row.cat.id) {
              <tr class="bud-row">
                <td>
                  <div class="cat-cell">
                    <span class="cat-stripe" [style.background]="row.cat.color"></span>
                    <cf-cat-dot [catId]="row.cat.id" [size]="8" />
                    <span class="cat-label">{{ row.cat.label }}</span>
                  </div>
                </td>
                <td class="r num">
                  <cf-money [value]="row.cat.budget" [negColor]="false" size="sm" />
                </td>
                <td class="r num">
                  <cf-money [value]="row.spent" [negColor]="false" size="sm" />
                </td>
                <td class="r num">
                  <cf-money
                    [value]="row.remaining"
                    [color]="row.remaining >= 0 ? 'var(--ink-2)' : 'var(--neg)'"
                    size="sm"
                  />
                </td>
                <td>
                  <div class="prog-cell">
                    <cf-progress-bar
                      [value]="row.spent"
                      [max]="row.cat.budget"
                      [color]="row.pct >= 1 ? 'var(--neg)' : row.cat.color"
                      [height]="5"
                    />
                    <div class="prog-meta">
                      <span class="num">{{ (row.pct * 100).toFixed(0) }}%</span>
                      @if (row.pct < 1) {
                        <span>R$ {{ formatNum(row.remaining) }} restante</span>
                      } @else {
                        <span style="color:var(--neg)">R$ {{ formatNum(-row.remaining) }} acima</span>
                      }
                    </div>
                  </div>
                </td>
                <td>
                  <div class="trend-cell">
                    <cf-sparkbars
                      [data]="row.history"
                      [width]="70"
                      [height]="20"
                      [baseColor]="row.cat.color"
                      [highlightColor]="row.cat.color"
                    />
                    <span class="trend-avg num">méd. {{ formatNum(row.histAvg) }}</span>
                  </div>
                </td>
                <td>
                  <span class="status-pill" [class]="'pill-' + row.status">
                    {{ statusLabel(row.status) }}
                  </span>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <div class="table-foot">
        <span class="legend">
          <span class="legend-item">
            <span class="status-pill pill-folga">Folga</span>
            <span class="legend-range">&lt; 70%</span>
          </span>
          <span class="legend-item">
            <span class="status-pill pill-no-ritmo">No ritmo</span>
            <span class="legend-range">70–90%</span>
          </span>
          <span class="legend-item">
            <span class="status-pill pill-atencao">Atenção</span>
            <span class="legend-range">90–100%</span>
          </span>
          <span class="legend-item">
            <span class="status-pill pill-estourou">Estourou</span>
            <span class="legend-range">&gt; 100%</span>
          </span>
        </span>
        <span class="foot-total num">
          Total: <cf-money [value]="totalSpent()" [negColor]="false" size="sm" /> /
          <cf-money [value]="totalBudget()" [negColor]="false" size="sm" />
        </span>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    /* Strip */
    .strip {
      background: var(--surface);
      border: 1px solid var(--line);
      box-shadow: var(--shadow-sm);
      padding: 12px 16px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 0;
    }
    .kpi-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding-right: 20px;
    }
    .kpi-divider {
      width: 1px;
      height: 36px;
      background: var(--line);
      margin-right: 20px;
      flex-shrink: 0;
    }
    .kpi-label {
      font-size: 10.5px;
      color: var(--ink-3);
      text-transform: uppercase;
      letter-spacing: 0.6px;
      font-weight: 600;
    }
    .kpi-value {
      font-size: 22px;
      font-weight: 600;
      line-height: 1.1;
      color: var(--ink-1);
    }
    .kpi-sub {
      font-size: 11px;
      color: var(--ink-4);
      margin-top: 1px;
    }

    /* Table card */
    .table-card {
      background: var(--surface);
      border: 1px solid var(--line);
      box-shadow: var(--shadow-sm);
    }
    .table-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px 8px;
      border-bottom: 1px solid var(--line-soft);
    }
    .table-title {
      font-size: 11px;
      color: var(--ink-3);
      text-transform: uppercase;
      letter-spacing: 0.7px;
      font-weight: 600;
    }

    .table-scroll { overflow-x: auto; }

    .bud-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12.5px;
    }
    .bud-table thead th {
      text-align: left;
      font-size: 10.5px;
      font-weight: 600;
      color: var(--ink-3);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 8px 12px;
      border-bottom: 1px solid var(--line);
      background: var(--surface-sunk);
      white-space: nowrap;
      position: sticky;
      top: 0;
      z-index: 1;
    }
    .bud-table thead th.r { text-align: right; }

    .bud-row td {
      padding: 8px 12px;
      border-bottom: 1px solid var(--line-soft);
      color: var(--ink-2);
      vertical-align: middle;
    }
    .bud-row:last-child td { border-bottom: 0; }
    .bud-row:hover td { background: var(--surface-alt); }
    .r { text-align: right; }

    .cat-cell {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .cat-stripe {
      width: 3px;
      height: 20px;
      flex-shrink: 0;
    }
    .cat-label {
      font-size: 12.5px;
      font-weight: 500;
      color: var(--ink-1);
    }

    .prog-cell {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .prog-meta {
      display: flex;
      justify-content: space-between;
      font-size: 10.5px;
      color: var(--ink-4);
    }

    .trend-cell {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .trend-avg {
      font-size: 10.5px;
      color: var(--ink-4);
    }

    /* Status pills */
    .status-pill {
      display: inline-block;
      padding: 2px 7px;
      font-size: 10.5px;
      font-weight: 500;
      letter-spacing: 0.2px;
      white-space: nowrap;
    }
    .pill-folga    { background: var(--pos-soft);  color: var(--pos);  }
    .pill-no-ritmo { background: var(--brand-soft); color: var(--brand); }
    .pill-atencao  { background: var(--warn-soft); color: var(--warn); }
    .pill-estourou { background: var(--neg-soft);  color: var(--neg);  }

    /* Footer */
    .table-foot {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 14px;
      border-top: 1px solid var(--line-soft);
    }
    .legend {
      display: flex;
      gap: 12px;
      align-items: center;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .legend-range {
      font-size: 10.5px;
      color: var(--ink-4);
    }
    .foot-total {
      font-size: 11.5px;
      font-weight: 600;
      color: var(--ink-1);
      display: flex;
      align-items: center;
      gap: 4px;
    }
  `],
})
export class BudgetsComponent {
  protected data = inject(AppDataService);

  catRows = computed((): CatRow[] =>
    this.data.categories().map(cat => {
      const spent = this.data.transactions()
        .filter(t => t.cat === cat.id)
        .reduce((s, t) => s + t.value, 0);
      const pct = spent / cat.budget;
      const status: BudgetStatus =
        pct < 0.7 ? 'folga' : pct < 0.9 ? 'no-ritmo' : pct < 1 ? 'atencao' : 'estourou';
      const remaining = cat.budget - spent;
      const history = this.catHistory(cat.id, cat.budget);
      const histAvg = history.reduce((s, v) => s + v, 0) / history.length;
      return { cat, spent, remaining, pct, status, history, histAvg };
    })
  );

  totalBudget = computed(() =>
    this.data.categories().reduce((s, c) => s + c.budget, 0)
  );

  totalSpent = computed(() =>
    this.data.transactions().reduce((s, t) => s + t.value, 0)
  );

  overCount = computed(() =>
    this.catRows().filter(r => r.status === 'estourou').length
  );

  surplus = computed(() => this.totalBudget() - this.totalSpent());

  budgetPct = computed(() =>
    Math.round((this.totalSpent() / this.totalBudget()) * 100)
  );

  statusLabel(status: BudgetStatus): string {
    switch (status) {
      case 'folga':    return 'Folga';
      case 'no-ritmo': return 'No ritmo';
      case 'atencao':  return 'Atenção';
      case 'estourou': return 'Estourou';
    }
  }

  formatNum(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(value));
  }

  private catHistory(catId: string, budget: number): number[] {
    const seed = catId.charCodeAt(0) + (catId.charCodeAt(1) || 0);
    return Array.from({ length: 6 }, (_, i) => {
      const v = budget * (0.6 + ((seed + i * 7) % 90) / 100);
      return Math.round(v * 100) / 100;
    });
  }
}
