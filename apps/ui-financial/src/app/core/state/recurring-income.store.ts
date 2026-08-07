import { Injectable, inject, signal } from '@angular/core';
import type { RecurringIncome } from '@caixa-familia/shared-types';
import { RecurringIncomeApiService } from '../api/income-api.service';
import {
  wireToRecurringIncome,
  recurringIncomeToCreateWire,
  recurringIncomeToUpdateWire,
} from '../api/income.mapper';
import { FailureReporter } from './failure.reporter';
import { IncomeStore } from './income.store';

@Injectable({ providedIn: 'root' })
export class RecurringIncomeStore {
  private api = inject(RecurringIncomeApiService);
  private failure = inject(FailureReporter);
  // Mexer no template muda o que o mês visível mostra: criar um materializa a
  // linha do mês na hora, excluir tira o vínculo dela.
  private incomes = inject(IncomeStore);

  readonly templates = signal<RecurringIncome[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.list().subscribe({
      next: (rows) => {
        this.templates.set(rows.map(wireToRecurringIncome));
        this.loading.set(false);
      },
      error: () => {
        this.failure.report('Falha ao carregar receitas recorrentes', this.error);
        this.loading.set(false);
      },
    });
  }

  private reload(): void {
    this.load();
    this.incomes.load();
  }

  create(r: RecurringIncome): void {
    this.api.create(recurringIncomeToCreateWire(r)).subscribe({
      next: () => this.reload(),
      error: () => this.failure.report('Falha ao criar receita recorrente', this.error),
    });
  }

  update(r: RecurringIncome): void {
    this.api.update(r.id, recurringIncomeToUpdateWire(r)).subscribe({
      next: () => this.reload(),
      error: () => this.failure.report('Falha ao salvar receita recorrente', this.error),
    });
  }

  remove(id: string): void {
    this.api.remove(id).subscribe({
      next: () => this.reload(),
      error: () => this.failure.report('Falha ao remover receita recorrente', this.error),
    });
  }
}
