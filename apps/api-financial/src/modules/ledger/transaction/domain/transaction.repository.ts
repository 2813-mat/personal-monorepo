export interface TransactionInstallments {
  n: number;
  of: number;
}

export interface TransactionView {
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
  installments: TransactionInstallments | null;
}

export interface TxFilter {
  year?: number;
  month?: number;
  holder?: string;
  categorySlug?: string;
  method?: string;
}

export interface CreateTransactionData {
  date: string;
  label: string;
  value: number;
  categorySlug: string;
  holder?: string;
  method: 'PIX' | 'CARD';
  cardId?: string | null;
  note?: string;
  recurring?: boolean;
  fixedExpenseId?: string;
  installments?: TransactionInstallments | null;
}

export abstract class TransactionRepository {
  abstract findAll(filter: TxFilter): Promise<TransactionView[]>;
  abstract create(data: CreateTransactionData): Promise<TransactionView>;
  abstract remove(id: string): Promise<void>;
}
