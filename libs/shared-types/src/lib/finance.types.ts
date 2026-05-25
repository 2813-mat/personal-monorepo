export type IsoDate = string;

export type Id = string;

export type Holder = 'Mateus' | 'Thais' | 'shared';

export type HolderFilter = Holder | 'todos';

export interface Card {
  id: Id;
  name: string;
  holder: Holder;
  bank: string;
  color: string;
  closing: number;
  due: number;
  current: number;
  limit: number;
  last4: string;
}

export interface Income {
  id: Id;
  label: string;
  holder: Holder;
  value: number;
  date: IsoDate;
  recurring: boolean;
}

export interface Category {
  id: Id;
  label: string;
  color: string;
  budget: number;
}

export interface FixedExpense {
  id: Id;
  label: string;
  value: number;
  due: number;
  cat: Id;
  holder: Holder;
}

export interface Goal {
  id: Id;
  label: string;
  target: number;
  balance: number;
  monthly: number;
  color: string;
}

export interface Installments {
  n: number;
  of: number;
}

export type PaymentMethod = Id | 'pix';

export interface Transaction {
  id: Id;
  date: IsoDate;
  label: string;
  value: number;
  cat: Id;
  holder: Holder;
  method: PaymentMethod;
  installments: Installments | null;
  note?: string;
  recurring?: boolean;
  fixedRef?: Id;
}

export interface MonthContext {
  year: number;
  month: number;
}

export type BudgetStatus = 'folga' | 'no-ritmo' | 'atencao' | 'estourou';
