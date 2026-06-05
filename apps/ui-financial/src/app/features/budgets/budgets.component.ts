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
  templateUrl: './budgets.component.html',
  styleUrl: './budgets.component.scss',
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
