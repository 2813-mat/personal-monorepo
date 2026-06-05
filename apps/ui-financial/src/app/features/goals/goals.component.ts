import { Component, computed, inject } from '@angular/core';
import { AppDataService } from '../../layout/app-data.service';
import { MoneyComponent } from '../../ui/money/money.component';
import { ProgressBarComponent } from '../../ui/progress-bar/progress-bar.component';
import type { Goal } from '@caixa-familia/shared-types';
import { GoalCardComponent } from './goal-card.component';
import { fmtShort, MONTH_ABBR } from './goal-format.utils';

// ─── GoalsComponent (exported) ────────────────────────────────────────────────

type ProjectionRow = {
  label: string;
  goalAccs: Array<{ goal: Goal; acc: number; reached: boolean }>;
  total: number;
};

@Component({
  selector: 'cf-goals',
  standalone: true,
  imports: [MoneyComponent, ProgressBarComponent, GoalCardComponent],
  templateUrl: './goals.component.html',
  styleUrl: './goals.component.scss',
})
export class GoalsComponent {
  protected readonly fmtShort = fmtShort;

  private readonly data = inject(AppDataService);
  readonly goals = this.data.goals;

  readonly goalsSubtitle = computed(() => {
    const goals = this.goals();
    const e = goals.filter(g => g.type === 'emergencia').length;
    const s = goals.filter(g => g.type === 'sonho').length;
    const parts: string[] = [];
    if (e) parts.push(`${e} emergência`);
    if (s) parts.push(`${s} sonho`);
    return parts.join(' · ');
  });

  readonly totalSaved   = computed(() => this.goals().reduce((s, g) => s + g.balance, 0));
  readonly totalTarget  = computed(() => this.goals().reduce((s, g) => s + g.target, 0));
  readonly totalMonthly = computed(() => this.goals().reduce((s, g) => s + g.monthly, 0));
  readonly totalPct     = computed(() => this.totalSaved() / this.totalTarget() * 100);

  readonly projectionRows = computed((): ProjectionRow[] => {
    const goals = this.goals();
    return Array.from({ length: 12 }, (_, i) => {
      const date = new Date(2026, 4 + i, 1);
      const label = MONTH_ABBR[date.getMonth()] + '/' + String(date.getFullYear()).slice(2);
      const goalAccs = goals.map(goal => {
        const acc = Math.min(goal.target, goal.balance + goal.monthly * (i + 1));
        return { goal, acc, reached: goal.balance + goal.monthly * (i + 1) >= goal.target };
      });
      const total = goalAccs.reduce((s, item) => s + item.acc, 0);
      return { label, goalAccs, total };
    });
  });
}
