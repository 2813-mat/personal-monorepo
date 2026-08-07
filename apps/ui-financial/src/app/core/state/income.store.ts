import { Injectable, inject, signal } from '@angular/core';
import type { Income } from '@caixa-familia/shared-types';
import { IncomeApiService } from '../api/income-api.service';
import { wireToIncome, incomeToCreateWire, incomeToUpdateWire } from '../api/income.mapper';
import { FailureReporter } from './failure.reporter';
import { ViewContextService } from './view-context.service';

@Injectable({ providedIn: 'root' })
export class IncomeStore {
  private api = inject(IncomeApiService);
  private failure = inject(FailureReporter);
  private view = inject(ViewContextService);

  readonly incomes = signal<Income[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  /**
   * Escopado no mês visível, como as transações. Antes trazia tudo, e a
   * "receita do mês" do dashboard era na verdade a receita de todos os tempos.
   */
  load(): void {
    const { year, month } = this.view.currentMonth();
    this.loading.set(true);
    this.error.set(null);
    this.api.list({ year, month }).subscribe({
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

  update(i: Income): void {
    this.api.update(i.id, incomeToUpdateWire(i)).subscribe({
      next: () => this.load(),
      error: () => this.failure.report('Falha ao salvar receita', this.error),
    });
  }

  remove(id: string): void {
    this.api.remove(id).subscribe({
      next: () => this.load(),
      error: () => this.failure.report('Falha ao remover receita', this.error),
    });
  }
}
