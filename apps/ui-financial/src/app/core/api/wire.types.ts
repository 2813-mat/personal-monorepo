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

export interface CategoryWire {
  id: string;
  slug: string;
  label: string;
  color: string;
  budget: number;
}

export interface CreateCategoryWire {
  slug: string;
  label: string;
  color: string;
  budget: number;
}

export interface IncomeWire {
  id: string;
  label: string;
  holder: string;
  value: number;
  date: string;
  recurring: boolean;
}

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

export interface CreateIncomeWire {
  label: string;
  holder: string;
  value: number;
  date: string;
  recurring: boolean;
}
