import { Component, computed, inject } from '@angular/core';
import { AppDataService } from '../../layout/app-data.service';
import { MoneyComponent } from '../../ui/money/money.component';
import { CatDotComponent } from '../../ui/cat-dot/cat-dot.component';
import { ProgressBarComponent } from '../../ui/progress-bar/progress-bar.component';
import { IconComponent } from '../../ui/icon/icon.component';
import type { Category } from '@caixa-familia/shared-types';
import { ReportChartComponent, ChartBar, ChartModel } from './report-chart.component';

function fmtNum(v: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(v));
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
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss',
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
