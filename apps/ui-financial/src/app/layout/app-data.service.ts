import { Injectable, signal, computed, inject, type WritableSignal } from '@angular/core';
import type {
  Card,
  Category,
  FixedExpense,
  Goal,
  HolderFilter,
  Income,
  Transaction,
} from '@caixa-familia/shared-types';
import { monthContextOf, type MonthView } from '@caixa-familia/shared-utils';
import { TransactionApiService } from '../core/api/transaction-api.service';
import { CatalogApiService } from '../core/api/catalog-api.service';
import { IncomeApiService } from '../core/api/income-api.service';
import { FixedApiService } from '../core/api/fixed-api.service';
import { GoalApiService } from '../core/api/goal-api.service';
import { InvoiceApiService } from '../core/api/invoice-api.service';
import { ReportApiService } from '../core/api/report-api.service';
import { wireToTransaction, transactionToCreateWire } from '../core/api/transaction.mapper';
import { wireToCategory, categoryToCreateWire } from '../core/api/catalog.mapper';
import { wireToIncome, incomeToCreateWire } from '../core/api/income.mapper';
import { wireToFixed, fixedToCreateWire } from '../core/api/fixed.mapper';
import { wireToGoal } from '../core/api/goal.mapper';
import {
  wireToInvoiceHistory,
  wireToOpenInvoiceItem,
  type InvoiceHistoryEntry,
  type OpenInvoiceState,
} from '../core/api/invoice.mapper';
import {
  wireToExpenseHistory,
  wireToIncomeHistory,
  type MonthEntry,
} from '../core/api/report.mapper';
import { ToastService } from '../ui/toast/toast.service';

@Injectable({ providedIn: 'root' })
export class AppDataService {
  private txApi = inject(TransactionApiService);
  private catApi = inject(CatalogApiService);
  private incApi = inject(IncomeApiService);
  private fixApi = inject(FixedApiService);
  private goalApi = inject(GoalApiService);
  private invApi = inject(InvoiceApiService);
  private repApi = inject(ReportApiService);
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
  readonly history = signal<MonthEntry[]>([]);
  readonly incomeHistory = signal<MonthEntry[]>([]);

  readonly catBy = computed<Record<string, Category>>(() =>
    Object.fromEntries(this.categories().map((c) => [c.id, c])),
  );
  readonly cardBy = computed<Record<string, Card>>(() =>
    Object.fromEntries(this.cards().map((c) => [c.id, c])),
  );

  readonly currentMonth = signal<MonthView>(monthContextOf());
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
  readonly cardsError = signal<string | null>(null);

  readonly reportsLoading = signal(false);
  readonly reportsError = signal<string | null>(null);

  readonly invoiceHistory = signal<InvoiceHistoryEntry[]>([]);
  readonly invoiceHistoryLoading = signal(false);
  readonly invoiceHistoryError = signal<string | null>(null);

  readonly openInvoice = signal<OpenInvoiceState>({
    total: 0,
    items: [],
    closingDate: '',
    year: 0,
    month: 0,
  });
  readonly openInvoiceLoading = signal(false);
  readonly openInvoiceError = signal<string | null>(null);

  loadCatalog(): void {
    this.categoriesError.set(null);
    this.cardsError.set(null);
    this.catApi.listCategories().subscribe({
      next: (rows) => this.categories.set(rows.map(wireToCategory)),
      error: () => this.fail('Falha ao carregar categorias', this.categoriesError),
    });
    this.catApi.listCards().subscribe({
      next: (rows) => this.cards.set(rows),
      error: () => this.fail('Falha ao carregar cartões', this.cardsError),
    });
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
   * Fecha o mês (admin). O backend faz upsert: refazer recalcula em vez de
   * duplicar. Invalida a série de meses fechados.
   */
  closeMonth(year: number, month: number): void {
    this.repApi.closeMonth(year, month).subscribe({
      next: () => this.loadMonthlyHistory(),
      error: () => this.fail('Falha ao fechar o mês', this.reportsError),
    });
  }

  /**
   * Fecha a fatura de um cartão (admin). `year`/`month` são as coordenadas do
   * **fechamento** do ciclo, que vêm de `openInvoice()` — não use `currentMonth()`.
   */
  closeInvoice(cardId: string, year: number, month: number): void {
    this.invApi.closeInvoice(cardId, year, month).subscribe({
      next: () => {
        this.loadInvoiceHistory(cardId);
        this.loadOpenInvoice(cardId);
      },
      error: () => this.fail('Falha ao fechar a fatura', this.invoiceHistoryError),
    });
  }

  /**
   * Série de meses fechados. Uma chamada alimenta as duas projeções — despesa e
   * receita saem do mesmo summary.
   */
  loadMonthlyHistory(): void {
    this.reportsLoading.set(true);
    this.reportsError.set(null);
    this.repApi.listMonthly().subscribe({
      next: (rows) => {
        this.history.set(wireToExpenseHistory(rows));
        this.incomeHistory.set(wireToIncomeHistory(rows));
        this.reportsLoading.set(false);
      },
      error: () => {
        this.fail('Falha ao carregar o histórico mensal', this.reportsError);
        this.reportsLoading.set(false);
      },
    });
  }

  /**
   * Fatura aberta de um cartão, pelo ciclo de faturamento real. Não deriva de
   * `transactions()`: um ciclo atravessa dois meses-calendário e a UI só carrega
   * um mês por vez, então o client não teria os dados para acertar.
   */
  loadOpenInvoice(cardId: string): void {
    this.openInvoiceLoading.set(true);
    this.openInvoiceError.set(null);
    this.invApi.getOpen(cardId).subscribe({
      next: (wire) => {
        this.openInvoice.set({
          total: wire.total,
          items: wire.items.map(wireToOpenInvoiceItem),
          closingDate: wire.closingDate,
          year: wire.year,
          month: wire.month,
        });
        this.openInvoiceLoading.set(false);
      },
      error: () => {
        this.fail('Falha ao carregar a fatura', this.openInvoiceError);
        this.openInvoiceLoading.set(false);
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
