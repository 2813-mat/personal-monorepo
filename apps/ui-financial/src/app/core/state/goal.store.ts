import { Injectable, inject, signal } from '@angular/core';
import type { Goal } from '@caixa-familia/shared-types';
import { GoalApiService } from '../api/goal-api.service';
import { wireToGoal, goalToUpdateWire } from '../api/goal.mapper';
import { FailureReporter } from './failure.reporter';

@Injectable({ providedIn: 'root' })
export class GoalStore {
  private api = inject(GoalApiService);
  private failure = inject(FailureReporter);

  readonly goals = signal<Goal[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.list().subscribe({
      next: (rows) => {
        this.goals.set(rows.map(wireToGoal));
        this.loading.set(false);
      },
      error: () => {
        this.failure.report('Falha ao carregar metas', this.error);
        this.loading.set(false);
      },
    });
  }

  update(g: Goal): void {
    this.api.update(g.id, goalToUpdateWire(g)).subscribe({
      next: () => this.load(),
      error: () => this.failure.report('Falha ao salvar meta', this.error),
    });
  }

  addContribution(slug: string, amount: number, date: string): void {
    this.api.addContribution(slug, { amount, date }).subscribe({
      next: () => this.load(),
      error: () => this.failure.report('Falha ao registrar aporte', this.error),
    });
  }
}
