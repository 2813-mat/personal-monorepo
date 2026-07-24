import { Injectable, signal, computed, inject, type WritableSignal } from '@angular/core';
import type {
  Card,
  Category,
  FixedExpense,
  Goal,
  HolderFilter,
  Income,
  MonthContext,
  Transaction,
} from '@caixa-familia/shared-types';
import {
  MOCK_HISTORY,
  MOCK_INCOME_HISTORY,
  CURRENT_MONTH,
} from '@caixa-familia/shared-mocks';
import { TransactionApiService } from '../core/api/transaction-api.service';
import { CatalogApiService } from '../core/api/catalog-api.service';
import { IncomeApiService } from '../core/api/income-api.service';
import { FixedApiService } from '../core/api/fixed-api.service';
import { GoalApiService } from '../core/api/goal-api.service';
import { InvoiceApiService } from '../core/api/invoice-api.service';
import { wireToTransaction, transactionToCreateWire } from '../core/api/transaction.mapper';
import { wireToCategory, categoryToCreateWire } from '../core/api/catalog.mapper';
import { wireToIncome, incomeToCreateWire } from '../core/api/income.mapper';
import { wireToFixed, fixedToCreateWire } from '../core/api/fixed.mapper';
import { wireToGoal } from '../core/api/goal.mapper';
import { wireToInvoiceHistory, type InvoiceHistoryEntry } from '../core/api/invoice.mapper';
import { ToastService } from '../ui/toast/toast.service';

@Injectable({ providedIn: 'root' })
export class AppDataService {
  private txApi = inject(TransactionApiService);
  private catApi = inject(CatalogApiService);
  private incApi = inject(IncomeApiService);
  private fixApi = inject(FixedApiService);
  private goalApi = inject(GoalApiService);
  private invApi = inject(InvoiceApiService);
  private toast = inject(ToastService);

  private fail(message: string, errorSignal: WritableSignal<string | null>): void {
    errorSignal.set(message);
    this.toast.show(message, 'neg');
  }

  readonly cards = signal<Card[]>([]);
  readonly transactions = signal<Transaction[]>([]);
  readonly categories = signal<Category[]>([]);

  readonly incomes = signal<Income[]>([]);
  readonly fixed = signal<FixedExpense[]>([]);
  readonly goals = signal<Goal[]>([]);

  // still-mock resources (out of scope for this slice)
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

  readonly incomesLoading = signal(false);
  readonly incomesError = signal<string | null>(null);

  readonly fixedLoading = signal(false);
  readonly fixedError = signal<string | null>(null);

  readonly goalsLoading = signal(false);
  readonly goalsError = signal<string | null>(null);

  readonly categoriesError = signal<string | null>(null);

  readonly invoiceHistory = signal<InvoiceHistoryEntry[]>([]);
  readonly invoiceHistoryLoading = signal(false);
  readonly invoiceHistoryError = signal<string | null>(null);

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
        this.fail('Falha ao carregar transações', this.transactionsError);
        this.transactionsLoading.set(false);
      },
    });
  }

  createTransaction(t: Transaction): void {
    this.txApi.create(transactionToCreateWire(t)).subscribe({
      next: () => this.loadTransactions(),
      error: () => this.fail('Falha ao criar transação', this.transactionsError),
    });
  }

  removeTransaction(id: string): void {
    this.txApi.remove(id).subscribe({
      next: () => this.loadTransactions(),
      error: () => this.fail('Falha ao remover transação', this.transactionsError),
    });
  }

  loadIncomes(): void {
    this.incomesLoading.set(true);
    this.incomesError.set(null);
    this.incApi.list().subscribe({
      next: (rows) => {
        this.incomes.set(rows.map(wireToIncome));
        this.incomesLoading.set(false);
      },
      error: () => {
        this.fail('Falha ao carregar receitas', this.incomesError);
        this.incomesLoading.set(false);
      },
    });
  }

  createIncome(i: Income): void {
    this.incApi.create(incomeToCreateWire(i)).subscribe({
      next: () => this.loadIncomes(),
      error: () => this.fail('Falha ao criar receita', this.incomesError),
    });
  }

  loadFixed(): void {
    const { year, month } = this.currentMonth();
    this.fixedLoading.set(true);
    this.fixedError.set(null);
    this.fixApi.list({ year, month }).subscribe({
      next: (rows) => {
        this.fixed.set(rows.map(wireToFixed));
        this.fixedLoading.set(false);
      },
      error: () => {
        this.fail('Falha ao carregar gastos fixos', this.fixedError);
        this.fixedLoading.set(false);
      },
    });
  }

  createFixed(f: FixedExpense): void {
    this.fixApi.create(fixedToCreateWire(f)).subscribe({
      next: () => this.loadFixed(),
      error: () => this.fail('Falha ao criar gasto fixo', this.fixedError),
    });
  }

  loadGoals(): void {
    this.goalsLoading.set(true);
    this.goalsError.set(null);
    this.goalApi.list().subscribe({
      next: (rows) => {
        this.goals.set(rows.map(wireToGoal));
        this.goalsLoading.set(false);
      },
      error: () => {
        this.fail('Falha ao carregar metas', this.goalsError);
        this.goalsLoading.set(false);
      },
    });
  }

  /**
   * Histórico de faturas fechadas de um cartão. Disparado pela tela de fatura,
   * que é quem conhece o cartão da rota — não entra nos effects do shell.
   */
  loadInvoiceHistory(cardId: string): void {
    this.invoiceHistoryLoading.set(true);
    this.invoiceHistoryError.set(null);
    this.invApi.listByCard(cardId).subscribe({
      next: (rows) => {
        this.invoiceHistory.set(rows.map(wireToInvoiceHistory));
        this.invoiceHistoryLoading.set(false);
      },
      error: () => {
        this.fail('Falha ao carregar o histórico de faturas', this.invoiceHistoryError);
        this.invoiceHistoryLoading.set(false);
      },
    });
  }

  createCategory(c: Category): void {
    this.catApi.createCategory(categoryToCreateWire(c)).subscribe({
      next: () => this.loadCatalog(),
      error: () => this.fail('Falha ao criar categoria', this.categoriesError),
    });
  }

  addContribution(slug: string, amount: number, date: string): void {
    this.goalApi.addContribution(slug, { amount, date }).subscribe({
      next: () => this.loadGoals(),
      error: () => this.fail('Falha ao registrar aporte', this.goalsError),
    });
  }
}
