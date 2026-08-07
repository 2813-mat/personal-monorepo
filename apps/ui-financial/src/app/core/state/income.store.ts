import { Injectable, inject, signal } from '@angular/core';
import type { Income } from '@caixa-familia/shared-types';
import { IncomeApiService } from '../api/income-api.service';
import { wireToIncome, incomeToCreateWire } from '../api/income.mapper';
import { FailureReporter } from './failure.reporter';

@Injectable({ providedIn: 'root' })
export class IncomeStore {
  private api = inject(IncomeApiService);
  private failure = inject(FailureReporter);

  readonly incomes = signal<Income[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.list().subscribe({
      next: (rows) => {
        this.incomes.set(rows.map(wireToIncome));
        this.loading.set(false);
      },
      error: () => {
        this.failure.report('Falha ao carregar receitas', this.error);
        this.loading.set(false);
      },
    });
  }

  create(i: Income): void {
    this.api.create(incomeToCreateWire(i)).subscribe({
      next: () => this.load(),
      error: () => this.failure.report('Falha ao criar receita', this.error),
    });
  }
}
