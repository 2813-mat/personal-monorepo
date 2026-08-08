import { Component, computed, inject, signal } from '@angular/core';
import { AppDataService } from '../../layout/app-data.service';
import { AuthService } from '../../core/auth/auth.service';
import { MoneyComponent } from '../../ui/money/money.component';
import { ProgressBarComponent } from '../../ui/progress-bar/progress-bar.component';
import { IconComponent } from '../../ui/icon/icon.component';
import { EmptyStateComponent } from '../../ui/empty-state/empty-state.component';
import type { Goal } from '@caixa-familia/shared-types';
import { GoalCardComponent } from './goal-card.component';
import { GoalEditDrawerComponent } from './goal-edit-drawer.component';
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
  imports: [
    MoneyComponent,
    ProgressBarComponent,
    IconComponent,
    EmptyStateComponent,
    GoalCardComponent,
    GoalEditDrawerComponent,
  ],
  templateUrl: './goals.component.html',
  styleUrl: './goals.component.scss',
})
export class GoalsComponent {
  protected readonly fmtShort = fmtShort;

  private readonly data = inject(AppDataService);
  protected readonly auth = inject(AuthService);
  readonly goals = this.data.goals;

  protected readonly creating = signal(false);

  readonly isEmpty = computed(() => this.goals().length === 0);

  /** Quem só lê vê o estado vazio, mas sem o convite para criar. */
  protected readonly emptyActions = computed(() =>
    this.auth.canWrite() ? [{ label: 'Criar primeira meta', icon: 'plus' }] : [],
  );

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
  /** Sem meta nenhuma o objetivo total é 0, e a divisão daria NaN%. */
  readonly totalPct     = computed(() => {
    const target = this.totalTarget();
    return target ? this.totalSaved() / target * 100 : 0;
  });

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
