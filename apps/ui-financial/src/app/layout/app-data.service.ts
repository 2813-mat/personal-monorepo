import { Injectable, signal, computed, inject } from '@angular/core';
import type { Card, Category, HolderFilter, MonthContext, Transaction } from '@caixa-familia/shared-types';
import {
  MOCK_GOALS,
  MOCK_INCOMES,
  MOCK_FIXED,
  MOCK_HISTORY,
  MOCK_INCOME_HISTORY,
  CURRENT_MONTH,
} from '@caixa-familia/shared-mocks';
import { TransactionApiService } from '../core/api/transaction-api.service';
import { CatalogApiService } from '../core/api/catalog-api.service';
import { wireToTransaction, transactionToCreateWire } from '../core/api/transaction.mapper';
import { wireToCategory } from '../core/api/catalog.mapper';
import { ToastService } from '../ui/toast/toast.service';

@Injectable({ providedIn: 'root' })
export class AppDataService {
  private txApi = inject(TransactionApiService);
  private catApi = inject(CatalogApiService);
  private toast = inject(ToastService);

  private fail(message: string): void {
    this.transactionsError.set(message);
    this.toast.show(message, 'neg');
  }

  readonly cards = signal<Card[]>([]);
  readonly transactions = signal<Transaction[]>([]);
  readonly categories = signal<Category[]>([]);

  // still-mock resources (out of scope for this slice)
  readonly goals = signal(MOCK_GOALS);
  readonly incomes = signal(MOCK_INCOMES);
  readonly fixed = signal(MOCK_FIXED);
  readonly history = signal(MOCK_HISTORY);
  readonly incomeHistory = signal(MOCK_INCOME_HISTORY);

  readonly catBy = computed<Record<string, Category>>(() =>
    Object.fromEntries(this.categories().map((c) => [c.id, c])),
  );
  readonly cardBy = computed<Record<string, Card>>(() =>
    Object.fromEntries(this.cards().map((c) => [c.id, c])),
  );

  readonly currentMonth = signal<MonthContext & { label: string; short: string }>(CURRENT_MONTH);
  readonly holderFilter = signal<HolderFilter>('todos');
  readonly monthLabel = computed(() => this.currentMonth().label);

  readonly transactionsLoading = signal(false);
  readonly transactionsError = signal<string | null>(null);

  loadCatalog(): void {
    this.catApi.listCategories().subscribe((rows) => this.categories.set(rows.map(wireToCategory)));
    this.catApi.listCards().subscribe((rows) => this.cards.set(rows));
  }

  loadTransactions(): void {
    const { year, month } = this.currentMonth();
    this.transactionsLoading.set(true);
    this.transactionsError.set(null);
    this.txApi.list({ year, month }).subscribe({
      next: (rows) => {
        this.transactions.set(rows.map(wireToTransaction));
        this.transactionsLoading.set(false);
      },
      error: () => {
        this.fail('Falha ao carregar transações');
        this.transactionsLoading.set(false);
      },
    });
  }

  createTransaction(t: Transaction): void {
    this.txApi.create(transactionToCreateWire(t)).subscribe({
      next: () => this.loadTransactions(),
      error: () => this.fail('Falha ao criar transação'),
    });
  }

  removeTransaction(id: string): void {
    this.txApi.remove(id).subscribe({
      next: () => this.loadTransactions(),
      error: () => this.fail('Falha ao remover transação'),
    });
  }
}
