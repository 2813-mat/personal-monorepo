export interface TransactionWire {
  id: string;
  date: string;
  label: string;
  value: number;
  categorySlug: string;
  holder: string;
  method: 'PIX' | 'CARD';
  cardId: string | null;
  note?: string;
  recurring: boolean;
  reviewed: boolean;
  fixedExpenseId?: string;
  installments: { n: number; of: number } | null;
}

export interface CreateTransactionWire {
  date: string;
  label: string;
  value: number;
  categorySlug: string;
  holder: string;
  method: 'PIX' | 'CARD';
  cardId?: string;
  note?: string;
  recurring?: boolean;
  installments?: { n: number; of: number };
}

export interface UpdateTransactionWire {
  date?: string;
  label?: string;
  value?: number;
  categorySlug?: string;
  holder?: string;
  method?: 'PIX' | 'CARD';
  cardId?: string | null;
  note?: string;
  reviewed?: boolean;
}

export interface CategoryWire {
  id: string;
  slug: string;
  label: string;
  color: string;
  budget: number;
  order: number;
}

export interface CreateCategoryWire {
  slug: string;
  label: string;
  color: string;
  budget: number;
}

export interface UpdateCategoryWire {
  label?: string;
  color?: string;
  budget?: number;
}

export interface IncomeWire {
  id: string;
  label: string;
  holder: string;
  value: number;
  date: string;
  recurring: boolean;
  recurringIncomeId?: string;
}

export interface RecurringIncomeWire {
  id: string;
  label: string;
  holder: string;
  value: number;
  day: number;
  startDate: string;
}

export interface CreateRecurringIncomeWire {
  label: string;
  holder: string;
  value: number;
  day: number;
  startDate?: string;
}

export type UpdateRecurringIncomeWire = Partial<
  Pick<CreateRecurringIncomeWire, 'label' | 'holder' | 'value' | 'day'>
>;

export type UpdateIncomeWire = Partial<{
  label: string;
  holder: string;
  value: number;
  date: string;
}>;

export interface OpenInvoiceItemWire {
  id: string;
  date: string;
  label: string;
  value: number;
  categorySlug: string;
  holder: string;
  installments: { n: number; of: number } | null;
}

export interface OpenInvoiceWire {
  total: number;
  items: OpenInvoiceItemWire[];
  closingDate: string;
  /** Coordenadas do fechamento do ciclo — o que o close espera. */
  year: number;
  month: number;
}

export interface MonthlySummaryWire {
  id: string;
  year: number;
  month: number;
  expenseTotal: number;
  incomeTotal: number;
  perCategory: Record<string, number>;
  closed: boolean;
}

export interface InvoiceHistoryWire {
  id: string;
  cardId: string;
  year: number;
  month: number;
  closingDate: string;
  dueDate: string;
  total: number;
  perCategory: Record<string, number>;
  status: 'CLOSED' | 'PAID';
}

export interface GoalWire {
  id: string;
  slug: string;
  label: string;
  target: number;
  monthly: number;
  color: string;
  subtitle: string;
  type: 'SONHO' | 'EMERGENCIA';
  balance: number;
  history: number[];
  contributionCount: number;
}

export interface CreateCardWire {
  name: string;
  bank: string;
  color: string;
  closingDay: number;
  dueDay: number;
  creditLimit: number;
  last4: string;
  holder: string;
}

export interface UpdateCardWire {
  name?: string;
  bank?: string;
  color?: string;
  closingDay?: number;
  dueDay?: number;
  creditLimit?: number;
  last4?: string;
  holder?: string;
}

/** O `slug` fica de fora: a API o deriva do label e desambigua sozinha. */
export interface CreateGoalWire {
  label: string;
  subtitle: string;
  target: number;
  monthly: number;
  color: string;
  type: 'SONHO' | 'EMERGENCIA';
}

export interface UpdateGoalWire {
  label?: string;
  target?: number;
  monthly?: number;
  color?: string;
  subtitle?: string;
  type?: 'SONHO' | 'EMERGENCIA';
}

export interface CreateContributionWire {
  amount: number;
  date: string;
}

export interface FixedExpenseWire {
  id: string;
  label: string;
  value: number;
  dueDay: number;
  categorySlug: string;
  holder: string;
  paidThisMonth: boolean;
}

export interface CreateFixedExpenseWire {
  label: string;
  value: number;
  dueDay: number;
  categorySlug: string;
  holder: string;
}

export interface UpdateFixedExpenseWire {
  label?: string;
  value?: number;
  dueDay?: number;
  categorySlug?: string;
  holder?: string;
}

export interface CreateIncomeWire {
  label: string;
  holder: string;
  value: number;
  date: string;
  recurring: boolean;
}
