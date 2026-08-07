import { Injectable, inject, signal } from '@angular/core';
import type { Transaction } from '@caixa-familia/shared-types';
import { TransactionApiService } from '../api/transaction-api.service';
import {
  wireToTransaction,
  transactionToCreateWire,
  transactionToUpdateWire,
} from '../api/transaction.mapper';
import { FailureReporter } from './failure.reporter';
import { ViewContextService } from './view-context.service';

@Injectable({ providedIn: 'root' })
export class TransactionStore {
  private api = inject(TransactionApiService);
  private failure = inject(FailureReporter);
  private view = inject(ViewContextService);

  readonly transactions = signal<Transaction[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  load(): void {
    const { year, month } = this.view.currentMonth();
    this.loading.set(true);
    this.error.set(null);
    this.api.list({ year, month }).subscribe({
      next: (rows) => {
        this.transactions.set(rows.map(wireToTransaction));
        this.loading.set(false);
      },
      error: () => {
        this.failure.report('Falha ao carregar transações', this.error);
        this.loading.set(false);
      },
    });
  }

  create(t: Transaction): void {
    this.api.create(transactionToCreateWire(t)).subscribe({
      next: () => this.load(),
      error: () => this.failure.report('Falha ao criar transação', this.error),
    });
  }

  update(t: Transaction): void {
    this.api.update(t.id, transactionToUpdateWire(t)).subscribe({
      next: () => this.load(),
      error: () => this.failure.report('Falha ao salvar transação', this.error),
    });
  }

  /** Alterna só o campo conferido — não manda o objeto inteiro. */
  setReviewed(id: string, reviewed: boolean): void {
    this.api.update(id, { reviewed }).subscribe({
      next: () => this.load(),
      error: () => this.failure.report('Falha ao marcar como conferido', this.error),
    });
  }

  remove(id: string): void {
    this.api.remove(id).subscribe({
      next: () => this.load(),
      error: () => this.failure.report('Falha ao remover transação', this.error),
    });
  }
}
