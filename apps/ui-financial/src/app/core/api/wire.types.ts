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

export interface IncomeWire {
  id: string;
  label: string;
  holder: string;
  value: number;
  date: string;
  recurring: boolean;
}

export interface CreateIncomeWire {
  label: string;
  holder: string;
  value: number;
  date: string;
  recurring: boolean;
}
