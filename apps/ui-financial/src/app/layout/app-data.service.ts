import { Injectable, inject } from '@angular/core';
import type {
  Card,
  Category,
  FixedExpense,
  Goal,
  Income,
  RecurringIncome,
  Transaction,
} from '@caixa-familia/shared-types';
import type { NewCard } from '../core/api/card.mapper';
import { CatalogStore } from '../core/state/catalog.store';
import { FixedStore } from '../core/state/fixed.store';
import { GoalStore } from '../core/state/goal.store';
import { IncomeStore } from '../core/state/income.store';
import { RecurringIncomeStore } from '../core/state/recurring-income.store';
import { InvoiceStore } from '../core/state/invoice.store';
import { ReportStore } from '../core/state/report.store';
import { TransactionStore } from '../core/state/transaction.store';
import { ViewContextService } from '../core/state/view-context.service';

/**
 * Fachada única que a UI injeta. Cada recurso mora no seu store em
 * `core/state/`; aqui só há reexportação de sinais e delegação de métodos.
 *
 * A fachada existe porque a superfície é consumida por ~15 componentes e
 * mockada em 15 specs: quebrar isso em injeções separadas espalharia a mudança
 * por todos eles sem ganho. O que doía era a lógica num arquivo só, e essa saiu.
 */
@Injectable({ providedIn: 'root' })
export class AppDataService {
  private catalog = inject(CatalogStore);
  private tx = inject(TransactionStore);
  private income = inject(IncomeStore);
  private recurringIncome = inject(RecurringIncomeStore);
  private fix = inject(FixedStore);
  private goal = inject(GoalStore);
  private invoice = inject(InvoiceStore);
  private report = inject(ReportStore);
  private view = inject(ViewContextService);

  // ─── Catálogo ──────────────────────────────────────────────────────────────
  readonly categories = this.catalog.categories;
  readonly cards = this.catalog.cards;
  readonly activeCards = this.catalog.activeCards;
  readonly catBy = this.catalog.catBy;
  readonly cardBy = this.catalog.cardBy;
  readonly categoriesError = this.catalog.categoriesError;
  readonly cardsError = this.catalog.cardsError;
  readonly cardRemovalConflict = this.catalog.cardRemovalConflict;

  loadCatalog(): void {
    this.catalog.load();
  }
  createCategory(c: Category): void {
    this.catalog.createCategory(c);
  }
  updateCategory(c: Category): void {
    this.catalog.updateCategory(c);
  }
  removeCategory(slug: string): void {
    this.catalog.removeCategory(slug);
  }
  reorderCategories(slugs: string[]): void {
    this.catalog.reorderCategories(slugs);
  }
  createCard(c: NewCard): void {
    this.catalog.createCard(c);
  }
  updateCard(c: Card): void {
    this.catalog.updateCard(c);
  }
  removeCard(id: string): void {
    this.catalog.removeCard(id);
  }
  archiveCard(id: string, archived: boolean): void {
    this.catalog.archiveCard(id, archived);
  }
  clearCardRemovalConflict(): void {
    this.catalog.clearCardRemovalConflict();
  }

  // ─── Contexto de navegação ─────────────────────────────────────────────────
  readonly currentMonth = this.view.currentMonth;
  readonly holderFilter = this.view.holderFilter;
  readonly monthLabel = this.view.monthLabel;

  // ─── Transações ────────────────────────────────────────────────────────────
  readonly transactions = this.tx.transactions;
  readonly transactionsLoading = this.tx.loading;
  readonly transactionsError = this.tx.error;

  loadTransactions(): void {
    this.tx.load();
  }
  createTransaction(t: Transaction): void {
    this.tx.create(t);
  }
  updateTransaction(t: Transaction): void {
    this.tx.update(t);
  }
  setTransactionReviewed(id: string, reviewed: boolean): void {
    this.tx.setReviewed(id, reviewed);
  }
  removeTransaction(id: string): void {
    this.tx.remove(id);
  }

  // ─── Receitas ──────────────────────────────────────────────────────────────
  readonly incomes = this.income.incomes;
  readonly incomesLoading = this.income.loading;
  readonly incomesError = this.income.error;
  readonly recurringIncomes = this.recurringIncome.templates;
  readonly recurringIncomesError = this.recurringIncome.error;

  loadIncomes(): void {
    this.income.load();
  }
  createIncome(i: Income): void {
    this.income.create(i);
  }
  updateIncome(i: Income): void {
    this.income.update(i);
  }
  removeIncome(id: string): void {
    this.income.remove(id);
  }

  loadRecurringIncomes(): void {
    this.recurringIncome.load();
  }
  createRecurringIncome(r: RecurringIncome): void {
    this.recurringIncome.create(r);
  }
  updateRecurringIncome(r: RecurringIncome): void {
    this.recurringIncome.update(r);
  }
  removeRecurringIncome(id: string): void {
    this.recurringIncome.remove(id);
  }

  // ─── Gastos fixos ──────────────────────────────────────────────────────────
  readonly fixed = this.fix.fixed;
  readonly fixedLoading = this.fix.loading;
  readonly fixedError = this.fix.error;

  loadFixed(): void {
    this.fix.load();
  }
  createFixed(f: FixedExpense): void {
    this.fix.create(f);
  }
  updateFixed(f: FixedExpense): void {
    this.fix.update(f);
  }
  removeFixed(id: string): void {
    this.fix.remove(id);
  }

  // ─── Metas ─────────────────────────────────────────────────────────────────
  readonly goals = this.goal.goals;
  readonly goalsLoading = this.goal.loading;
  readonly goalsError = this.goal.error;

  loadGoals(): void {
    this.goal.load();
  }
  updateGoal(g: Goal): void {
    this.goal.update(g);
  }
  addContribution(slug: string, amount: number, date: string): void {
    this.goal.addContribution(slug, amount, date);
  }

  // ─── Faturas ───────────────────────────────────────────────────────────────
  readonly invoiceHistoryByCard = this.invoice.historyByCard;
  readonly invoiceHistory = this.invoice.history;
  readonly invoiceHistoryLoading = this.invoice.historyLoading;
  readonly invoiceHistoryError = this.invoice.historyError;
  readonly openInvoice = this.invoice.open;
  readonly openInvoiceLoading = this.invoice.openLoading;
  readonly openInvoiceError = this.invoice.openError;

  loadOpenInvoice(cardId: string): void {
    this.invoice.loadOpen(cardId);
  }
  loadAllInvoiceHistory(): void {
    this.invoice.loadAllHistory();
  }
  loadInvoiceHistory(cardId: string): void {
    this.invoice.loadHistory(cardId);
  }
  closeInvoice(cardId: string, year: number, month: number): void {
    this.invoice.close(cardId, year, month);
  }

  // ─── Relatórios ────────────────────────────────────────────────────────────
  readonly history = this.report.history;
  readonly incomeHistory = this.report.incomeHistory;
  readonly reportsLoading = this.report.loading;
  readonly reportsError = this.report.error;

  loadMonthlyHistory(): void {
    this.report.loadMonthlyHistory();
  }
  closeMonth(year: number, month: number): void {
    this.report.closeMonth(year, month);
  }
}
