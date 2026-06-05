import { Component, Input } from '@angular/core';
import type { Goal } from '@caixa-familia/shared-types';
import { MoneyComponent } from '../../ui/money/money.component';
import { ProgressBarComponent } from '../../ui/progress-bar/progress-bar.component';
import { SparkbarsComponent } from '../../ui/sparkbars/sparkbars.component';
import { IconComponent } from '../../ui/icon/icon.component';
import { fmtShort } from './goal-format.utils';

// ─── GoalCard (private subcomponent) ─────────────────────────────────────────

@Component({
  selector: 'cf-goal-card',
  standalone: true,
  imports: [MoneyComponent, ProgressBarComponent, SparkbarsComponent, IconComponent],
  templateUrl: './goal-card.component.html',
  styleUrl: './goal-card.component.scss',
})
export class GoalCardComponent {
  @Input() goal!: Goal;

  protected readonly fmtShort = fmtShort;

  get pct()       { return this.goal.balance / this.goal.target * 100; }
  get remaining() { return this.goal.target - this.goal.balance; }
  get months()    { return Math.ceil(this.remaining / this.goal.monthly); }
  get softColor() { return this.goal.type === 'sonho' ? '#FBF1E1' : '#E0F0E7'; }
  get typeLabel() { return this.goal.type === 'sonho' ? 'Sonho' : 'Emergência'; }
}
