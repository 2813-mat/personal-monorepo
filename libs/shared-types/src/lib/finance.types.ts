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
  /** Cartão fora de uso: some dos seletores, continua no histórico. */
  archived: boolean;
}

export interface Income {
  id: Id;
  label: string;
  holder: Holder;
  value: number;
  date: IsoDate;
  recurring: boolean;
  /** Presente quando a linha nasceu de um template de receita recorrente. */
  recurringIncomeId?: Id;
}

/**
 * Salário e afins: o cadastro perene que gera uma linha de `Income` por mês.
 * Editar aqui vale do mês corrente em diante — o histórico já materializado
 * guarda o valor que o mês de fato recebeu.
 */
export interface RecurringIncome {
  id: Id;
  label: string;
  holder: Holder;
  value: number;
  /** Dia do mês em que cai. Meses curtos truncam para o último dia. */
  day: number;
  startDate: IsoDate;
}

export interface Category {
  id: Id;
  label: string;
  color: string;
  budget: number;
  /** Posição de exibição, ditada pelo backend. */
  order: number;
}

export interface FixedExpense {
  id: Id;
  label: string;
  value: number;
  due: number;
  cat: Id;
  holder: Holder;
  paidThisMonth: boolean;
}

export interface Goal {
  id: Id;
  label: string;
  target: number;
  balance: number;
  monthly: number;
  color: string;
  subtitle: string;
  type: 'sonho' | 'emergencia';
  history: number[];
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
  reviewed: boolean;
  fixedRef?: Id;
}

export interface MonthContext {
  year: number;
  month: number;
}

export type BudgetStatus = 'folga' | 'no-ritmo' | 'atencao' | 'estourou';
