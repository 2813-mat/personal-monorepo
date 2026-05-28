import { Injectable, signal, computed } from '@angular/core';
import type { HolderFilter, MonthContext } from '@caixa-familia/shared-types';
import {
  MOCK_CARDS,
  MOCK_TRANSACTIONS,
  MOCK_CATEGORIES,
  MOCK_GOALS,
  MOCK_INCOMES,
  MOCK_FIXED,
  MOCK_HISTORY,
  MOCK_INCOME_HISTORY,
  CAT_BY,
  CARD_BY,
  CURRENT_MONTH,
} from '@caixa-familia/shared-mocks';

@Injectable({ providedIn: 'root' })
export class AppDataService {
  readonly cards = signal(MOCK_CARDS);
  readonly transactions = signal(MOCK_TRANSACTIONS);
  readonly categories = signal(MOCK_CATEGORIES);
  readonly goals = signal(MOCK_GOALS);
  readonly incomes = signal(MOCK_INCOMES);
  readonly fixed = signal(MOCK_FIXED);
  readonly history = signal(MOCK_HISTORY);
  readonly incomeHistory = signal(MOCK_INCOME_HISTORY);
  readonly catBy = signal(CAT_BY);
  readonly cardBy = signal(CARD_BY);

  readonly currentMonth = signal<MonthContext & { label: string; short: string }>(CURRENT_MONTH);
  readonly holderFilter = signal<HolderFilter>('todos');

  readonly monthLabel = computed(() => this.currentMonth().label);
}
