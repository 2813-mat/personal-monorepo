import { Component, Input, computed, inject } from '@angular/core';
import { AppDataService } from '../../layout/app-data.service';
import { MoneyComponent } from '../../ui/money/money.component';
import { CatDotComponent } from '../../ui/cat-dot/cat-dot.component';
import { ProgressBarComponent } from '../../ui/progress-bar/progress-bar.component';
import { IconComponent } from '../../ui/icon/icon.component';
import type { Category } from '@caixa-familia/shared-types';

function fmtNum(v: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(v));
}

// ─── Chart geometry types ─────────────────────────────────────────────────────

interface ChartBar {
  m: string;
  incX: number;
  incY: number;
  incH: number;
  expX: number;
  expY: number;
  expH: number;
  labelX: number;
  opacity: number;
}

interface ChartModel {
  bars: ChartBar[];
  barW: number;
  gridlines: { y: number }[];
  polyline: string;
  points: { x: number; y: number }[];
}

// ─── ReportChart (private subcomponent: inline SVG, no chart lib) ──────────────

@Component({
  selector: 'cf-report-chart',
  standalone: true,
  template: `
    <svg
      width="100%"
      [attr.height]="H"
      viewBox="0 0 1100 200"
      preserveAspectRatio="none"
    >
      <!-- Gridlines -->
      @for (g of model.gridlines; track g.y) {
        <line x1="0" [attr.y1]="g.y" x2="1100" [attr.y2]="g.y" stroke="var(--line-soft)" stroke-width="1" />
      }

      <!-- Bars -->
      @for (b of model.bars; track b.m) {
        <rect
          [attr.x]="b.incX"
          [attr.y]="b.incY"
          [attr.width]="model.barW"
          [attr.height]="b.incH"
          fill="var(--pos)"
          [attr.opacity]="b.opacity"
        />
        <rect
          [attr.x]="b.expX"
          [attr.y]="b.expY"
          [attr.width]="model.barW"
          [attr.height]="b.expH"
          fill="var(--neg)"
          [attr.opacity]="b.opacity"
        />
      }

      <!-- Savings polyline -->
      <polyline
        [attr.points]="model.polyline"
        fill="none"
        stroke="var(--brand)"
        stroke-width="2"
        vector-effect="non-scaling-stroke"
      />
      @for (p of model.points; track $index) {
        <circle [attr.cx]="p.x" [attr.cy]="p.y" r="3" fill="var(--brand)" />
      }

      <!-- Month labels -->
      @for (b of model.bars; track b.m) {
        <text
          [attr.x]="b.labelX"
          [attr.y]="labelY"
          font-size="9"
          fill="var(--ink-3)"
          text-anchor="middle"
        >{{ b.m.slice(0, 3) }}</text>
      }
    </svg>
  `,
  styles: [`
    :host { display: block; }
    svg { display: block; }
  `],
})
export class ReportChartComponent {
  @Input({ required: true }) model!: ChartModel;

  protected readonly H = 200;
  protected readonly labelY = 200 - 6;
}

// ─── ReportsComponent (exported) ──────────────────────────────────────────────

interface KpiCard {
  label: string;
  value: number | null;
  display: string | null;
  color: string;
  sub: string;
  arrow?: 'up' | 'down';
  arrowColor?: string;
}

interface TopCatRow {
  cat: Category;
  current: number;
  histMean: number;
  delta: number;
}

interface SplitLine {
  label: string;
  value: number;
  color: string;
}

interface HolderBlock {
  key: 'Mateus' | 'Thais' | 'shared';
  name: string;
  total: number;
  pct: number;
  mark: string;
  markBg: string;
  splits: SplitLine[];
  maxSplit: number;
}

@Component({
  selector: 'cf-reports',
  standalone: true,
  imports: [MoneyComponent, CatDotComponent, ProgressBarComponent, IconComponent, ReportChartComponent],
  template: `
    <!-- 1. KPI strip -->
    <div class="kpi-grid">
      @for (k of kpis(); track k.label) {
        <div class="kpi-box">
          <div class="kpi-label">{{ k.label }}</div>
          @if (k.display !== null) {
            <div class="kpi-value-row">
              @if (k.arrow) {
                <cf-icon [name]="k.arrow === 'down' ? 'arrowDown' : 'arrowUp'" [size]="16" [color]="k.arrowColor!" />
              }
              <div class="kpi-text" [style.color]="k.color">{{ k.display }}</div>
            </div>
          } @else {
            <cf-money [value]="k.value!" [color]="k.color" size="lg" [cents]="false" />
          }
          <div class="kpi-sub">{{ k.sub }}</div>
        </div>
      }
    </div>

    <!-- 2. Big chart card -->
    <div class="panel chart-panel">
      <div class="panel-head">
        <span class="panel-title">Receita vs. Despesa · 12 meses</span>
        <div class="legend">
          <span class="legend-item"><span class="legend-swatch" style="background:var(--pos)"></span>Receita</span>
          <span class="legend-item"><span class="legend-swatch" style="background:var(--neg)"></span>Despesa</span>
          <span class="legend-item"><span class="legend-line" style="background:var(--brand)"></span>Sobra</span>
        </div>
      </div>
      <div class="chart-body">
        <cf-report-chart [model]="chartModel()" />
      </div>
      <div class="panel-foot">
        <span class="foot-stat">média de sobra: <cf-money [value]="avgSavings()" [color]="avgSavings() >= 0 ? 'var(--pos)' : 'var(--neg)'" size="sm" [cents]="false" /></span>
        <span class="foot-stat">melhor mês: <strong>{{ bestSavingsMonth().m }}</strong> · <cf-money [value]="bestSavingsMonth().total" [color]="'var(--pos)'" size="sm" [cents]="false" /></span>
      </div>
    </div>

    <!-- 3 + 4. Bottom grid -->
    <div class="bottom-grid">
      <!-- LEFT: top categorias -->
      <div class="panel">
        <div class="panel-head">
          <span class="panel-title">Top categorias · {{ short() }}</span>
        </div>
        <table class="rep-table">
          <thead>
            <tr>
              <th>Categoria</th>
              <th class="r" style="width:90px">{{ short() }}</th>
              <th class="r" style="width:120px">Média histórica</th>
              <th class="r" style="width:90px">Δ%</th>
            </tr>
          </thead>
          <tbody>
            @for (row of topCats(); track row.cat.id) {
              <tr class="rep-row">
                <td>
                  <div class="cat-cell">
                    <cf-cat-dot [catId]="row.cat.id" [size]="8" />
                    <span class="cat-label">{{ row.cat.label }}</span>
                  </div>
                </td>
                <td class="r num">
                  <cf-money [value]="row.current" [negColor]="false" size="sm" [cents]="false" />
                </td>
                <td class="r num hist">R$ {{ fmt(row.histMean) }}</td>
                <td class="r">
                  <span class="delta-pill" [class.under]="row.delta <= 0" [class.over]="row.delta > 0">
                    <cf-icon
                      [name]="row.delta <= 0 ? 'arrowDown' : 'arrowUp'"
                      [size]="10"
                      [color]="row.delta <= 0 ? 'var(--pos)' : 'var(--neg)'"
                    />
                    <span class="num">{{ deltaLabel(row.delta) }}</span>
                  </span>
                </td>
              </tr>
            }
          </tbody>
        </table>
        <div class="panel-foot">
          <span class="foot-stat">{{ topCats().length }} categorias com gasto</span>
          <span class="foot-stat">vs. média histórica estimada</span>
        </div>
      </div>

      <!-- RIGHT: quem gasta o quê -->
      <div class="panel">
        <div class="panel-head">
          <span class="panel-title">Quem gasta o quê · {{ short() }}</span>
        </div>
        <div class="holder-list">
          @for (h of holderBlocks(); track h.key) {
            <div class="holder-block">
              <div class="holder-head">
                <span class="holder-mark" [style.background]="h.markBg">{{ h.mark }}</span>
                <span class="holder-name">{{ h.name }}</span>
                <span class="holder-spacer"></span>
                <cf-money [value]="h.total" [negColor]="false" size="sm" [cents]="false" />
                <span class="holder-pct num">· {{ h.pct.toFixed(0) }}%</span>
              </div>
              <div class="splits">
                @for (s of h.splits; track s.label) {
                  <div class="split-line">
                    <div class="split-top">
                      <span class="split-label">{{ s.label }}</span>
                      <span class="split-val num">R$ {{ fmt(s.value) }}</span>
                    </div>
                    <cf-progress-bar [value]="s.value" [max]="h.maxSplit" [color]="s.color" [height]="4" />
                  </div>
                }
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    /* 1. KPI strip */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 12px;
      margin-bottom: 12px;
    }
    .kpi-box {
      background: var(--surface);
      border: 1px solid var(--line);
      box-shadow: var(--shadow-sm);
      padding: 12px 16px;
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
    .kpi-value-row {
      display: flex;
      align-items: center;
      gap: 4px;
      min-height: 22px;
    }
    .kpi-text {
      font-size: 18px;
      font-weight: 600;
      line-height: 1.1;
      letter-spacing: -0.2px;
      color: var(--ink-1);
    }
    .kpi-sub {
      font-size: 11px;
      color: var(--ink-4);
      margin-top: 1px;
    }

    /* Panels (shared) */
    .panel {
      background: var(--surface);
      border: 1px solid var(--line);
      box-shadow: var(--shadow-sm);
    }
    .panel-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px 8px;
      border-bottom: 1px solid var(--line-soft);
    }
    .panel-title {
      font-size: 11px;
      color: var(--ink-3);
      text-transform: uppercase;
      letter-spacing: 0.7px;
      font-weight: 600;
    }
    .panel-foot {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 14px;
      border-top: 1px solid var(--line-soft);
      font-size: 11px;
      color: var(--ink-3);
    }
    .foot-stat {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .foot-stat strong { color: var(--ink-1); font-weight: 600; }

    /* 2. Chart */
    .chart-panel { margin-bottom: 12px; }
    .legend { display: flex; gap: 14px; align-items: center; }
    .legend-item {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      color: var(--ink-3);
    }
    .legend-swatch { width: 9px; height: 9px; border-radius: 2px; display: inline-block; }
    .legend-line { width: 14px; height: 2px; display: inline-block; border-radius: 1px; }
    .chart-body { padding: 8px 12px 4px; }

    /* 3 + 4. Bottom grid */
    .bottom-grid {
      display: grid;
      grid-template-columns: 1.4fr 1fr;
      gap: 12px;
    }

    /* Table */
    .rep-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
    .rep-table thead th {
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
    }
    .rep-table thead th.r { text-align: right; }
    .rep-row td {
      padding: 8px 12px;
      border-bottom: 1px solid var(--line-soft);
      color: var(--ink-2);
      vertical-align: middle;
    }
    .rep-row:last-child td { border-bottom: 0; }
    .rep-row:hover td { background: var(--surface-alt); }
    .r { text-align: right; }
    .cat-cell { display: flex; align-items: center; gap: 8px; }
    .cat-label { font-size: 12.5px; font-weight: 500; color: var(--ink-1); }
    .hist { color: var(--ink-3); }

    .delta-pill {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      padding: 2px 7px;
      font-size: 10.5px;
      font-weight: 600;
    }
    .delta-pill.under { background: var(--pos-soft); color: var(--pos); }
    .delta-pill.over { background: var(--neg-soft); color: var(--neg); }

    /* 4. Holder breakdown */
    .holder-list { padding: 4px 14px 10px; }
    .holder-block { padding: 10px 0; border-bottom: 1px solid var(--line-soft); }
    .holder-block:last-child { border-bottom: 0; }
    .holder-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .holder-mark {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      color: #fff;
      font-size: 8px;
      font-weight: 700;
      flex-shrink: 0;
    }
    .holder-name { font-size: 12.5px; font-weight: 600; color: var(--ink-1); }
    .holder-spacer { flex: 1; }
    .holder-pct { font-size: 11px; color: var(--ink-4); }

    .splits { display: flex; flex-direction: column; gap: 6px; }
    .split-line { display: flex; flex-direction: column; gap: 3px; }
    .split-top { display: flex; justify-content: space-between; align-items: center; }
    .split-label { font-size: 11.5px; color: var(--ink-2); }
    .split-val { font-size: 11px; color: var(--ink-4); }
  `],
})
export class ReportsComponent {
  protected data = inject(AppDataService);

  protected readonly fmt = fmtNum;

  protected short = computed(() => this.data.currentMonth().short);

  // ── Year-bucket helpers ─────────────────────────────────────────────────────

  private sum2026 = (entries: { m: string; total: number }[]) =>
    entries.filter(e => e.m.endsWith('/26')).reduce((s, e) => s + e.total, 0);

  private receita2026 = computed(() => this.sum2026(this.data.incomeHistory()));
  private despesa2026 = computed(() => this.sum2026(this.data.history()));
  private sobra2026 = computed(() => this.receita2026() - this.despesa2026());

  // Largest category by summed transaction value (current-month tx).
  private topCategory = computed(() => {
    const spend: Record<string, number> = {};
    let total = 0;
    for (const t of this.data.transactions()) {
      spend[t.cat] = (spend[t.cat] ?? 0) + t.value;
      total += t.value;
    }
    let topId = '';
    let topVal = -Infinity;
    for (const id of Object.keys(spend)) {
      if (spend[id] > topVal) {
        topVal = spend[id];
        topId = id;
      }
    }
    const cat = this.data.catBy()[topId];
    return {
      label: cat?.label ?? '—',
      value: topVal === -Infinity ? 0 : topVal,
      pct: total > 0 ? (topVal / total) * 100 : 0,
    };
  });

  // Avg monthly expense 2025 vs 2026, signed delta %.
  private vs2025 = computed(() => {
    const hist = this.data.history();
    const y25 = hist.filter(e => e.m.endsWith('/25'));
    const y26 = hist.filter(e => e.m.endsWith('/26'));
    const avg25 = y25.length ? y25.reduce((s, e) => s + e.total, 0) / y25.length : 0;
    const avg26 = y26.length ? y26.reduce((s, e) => s + e.total, 0) / y26.length : 0;
    const delta = avg25 > 0 ? ((avg26 - avg25) / avg25) * 100 : 0;
    return { delta, lower: delta <= 0 };
  });

  kpis = computed((): KpiCard[] => {
    const receita = this.receita2026();
    const sobra = this.sobra2026();
    const taxa = receita > 0 ? (sobra / receita) * 100 : 0;
    const top = this.topCategory();
    const v = this.vs2025();
    return [
      {
        label: 'Receita 2026 YTD',
        value: receita,
        display: null,
        color: 'var(--pos)',
        sub: 'acumulado YTD',
      },
      {
        label: 'Despesa 2026 YTD',
        value: this.despesa2026(),
        display: null,
        color: 'var(--neg)',
        sub: 'acumulado YTD',
      },
      {
        label: 'Sobra 2026',
        value: sobra,
        display: null,
        color: 'var(--brand)',
        sub: `taxa de poupança ${taxa.toFixed(0)}%`,
      },
      {
        label: 'Maior categoria',
        value: null,
        display: top.label,
        color: 'var(--ink-1)',
        sub: `${top.pct.toFixed(0)}% do gasto total`,
      },
      {
        label: 'vs. 2025',
        value: null,
        display: this.deltaLabel(v.delta),
        color: v.lower ? 'var(--pos)' : 'var(--neg)',
        sub: 'média mensal',
        arrow: v.lower ? 'down' : 'up',
        arrowColor: v.lower ? 'var(--pos)' : 'var(--neg)',
      },
    ];
  });

  // ── 2. Chart model ───────────────────────────────────────────────────────────

  private savings = computed(() => {
    const inc = this.data.incomeHistory();
    const exp = this.data.history();
    return inc.map((e, i) => e.total - (exp[i]?.total ?? 0));
  });

  avgSavings = computed(() => {
    const s = this.savings();
    return s.length ? s.reduce((a, b) => a + b, 0) / s.length : 0;
  });

  bestSavingsMonth = computed(() => {
    const s = this.savings();
    const exp = this.data.history();
    let bestIdx = 0;
    for (let i = 1; i < s.length; i++) {
      if (s[i] > s[bestIdx]) bestIdx = i;
    }
    return { m: exp[bestIdx]?.m ?? '', total: s[bestIdx] ?? 0 };
  });

  chartModel = computed((): ChartModel => {
    const incomes = this.data.incomeHistory().map(e => e.total);
    const expenses = this.data.history().map(e => e.total);
    const months = this.data.history().map(e => e.m);
    const sav = this.savings();
    const n = months.length;
    const lastIdx = n - 1;

    const W = 1100;
    const H = 200;
    const padTop = 10;
    const padBottom = 22;
    const chartH = H - padTop - padBottom;
    const max = Math.max(...incomes, ...expenses) * 1.15 || 1;
    const groupW = W / 12;
    const barW = (groupW - 8) / 2 - 1;

    const bars: ChartBar[] = months.map((m, i) => {
      const incH = (incomes[i] / max) * chartH;
      const expH = (expenses[i] / max) * chartH;
      const incX = i * groupW + 4;
      const expX = i * groupW + 4 + barW + 2;
      return {
        m,
        incX,
        incH,
        incY: padTop + chartH - incH,
        expX,
        expH,
        expY: padTop + chartH - expH,
        labelX: i * groupW + groupW / 2,
        opacity: i === lastIdx ? 1 : 0.85,
      };
    });

    const points = sav.map((s, i) => ({
      x: i * groupW + groupW / 2,
      y: padTop + chartH - (s / max) * chartH,
    }));
    const polyline = 'M ' + points.map(p => `${p.x},${p.y}`).join(' L ');

    const gridlines = [0.25, 0.5, 0.75, 1].map(f => ({ y: padTop + chartH - f * chartH }));

    return { bars, barW, gridlines, polyline, points };
  });

  // ── 3. Top categorias ─────────────────────────────────────────────────────────

  topCats = computed((): TopCatRow[] => {
    const cats = this.data.categories();
    const sumBudgets = cats.reduce((s, c) => s + c.budget, 0) || 1;
    const hist = this.data.history();
    const meanHistTotal = hist.length
      ? hist.reduce((s, h) => s + h.total, 0) / hist.length
      : 0;

    const spend: Record<string, number> = {};
    for (const t of this.data.transactions()) {
      spend[t.cat] = (spend[t.cat] ?? 0) + t.value;
    }

    return cats
      .map(cat => {
        const current = spend[cat.id] ?? 0;
        const histMean = Math.round(meanHistTotal * (cat.budget / sumBudgets));
        const delta = histMean > 0 ? ((current - histMean) / histMean) * 100 : 0;
        return { cat, current, histMean, delta };
      })
      .filter(r => r.current > 0)
      .sort((a, b) => b.current - a.current)
      .slice(0, 9);
  });

  // ── 4. Quem gasta o quê ─────────────────────────────────────────────────────

  holderBlocks = computed((): HolderBlock[] => {
    const txs = this.data.transactions();
    const grandTotal = txs.reduce((s, t) => s + t.value, 0) || 1;
    const catBy = this.data.catBy();

    const defs: { key: 'Mateus' | 'Thais' | 'shared'; name: string; mark: string; markBg: string }[] = [
      { key: 'Mateus', name: 'Mateus', mark: 'M', markBg: '#1F4E79' },
      { key: 'Thais', name: 'Thais', mark: 'T', markBg: '#7A1F3D' },
      { key: 'shared', name: 'Compartilhado', mark: 'M+T', markBg: '#0F2D4F' },
    ];

    return defs.map(def => {
      const own = txs.filter(t => t.holder === def.key);
      const total = own.reduce((s, t) => s + t.value, 0);

      const byCat: Record<string, number> = {};
      for (const t of own) {
        byCat[t.cat] = (byCat[t.cat] ?? 0) + t.value;
      }
      const sorted = Object.keys(byCat)
        .map(id => ({ id, value: byCat[id] }))
        .sort((a, b) => b.value - a.value);

      const top5 = sorted.slice(0, 5);
      const rest = sorted.slice(5);
      const splits: SplitLine[] = top5.map(s => ({
        label: catBy[s.id]?.label ?? s.id,
        value: s.value,
        color: catBy[s.id]?.color ?? 'var(--ink-4)',
      }));
      if (rest.length) {
        splits.push({
          label: 'Outros',
          value: rest.reduce((s, r) => s + r.value, 0),
          color: 'var(--ink-4)',
        });
      }

      const maxSplit = splits.reduce((m, s) => Math.max(m, s.value), 0) || 1;

      return {
        key: def.key,
        name: def.name,
        total,
        pct: (total / grandTotal) * 100,
        mark: def.mark,
        markBg: def.markBg,
        splits,
        maxSplit,
      };
    });
  });

  // ── Formatting helpers ────────────────────────────────────────────────────────

  deltaLabel(delta: number): string {
    const sign = delta <= 0 ? '−' : '+'; // U+2212 minus
    return `${sign}${Math.abs(Math.round(delta))}%`;
  }
}
