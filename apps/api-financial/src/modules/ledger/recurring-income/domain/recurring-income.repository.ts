import { RecurringIncome } from './recurring-income.entity';

export interface CreateRecurringIncomeData {
  label: string;
  holder: string;
  value: number;
  day: number;
  /** Primeiro mês que o template gera. Ausente = mês corrente. */
  startDate?: string;
}

export interface UpdateRecurringIncomeData {
  label?: string;
  holder?: string;
  value?: number;
  day?: number;
}

export abstract class RecurringIncomeRepository {
  abstract findAll(): Promise<RecurringIncome[]>;
  abstract create(data: CreateRecurringIncomeData): Promise<RecurringIncome>;
  abstract update(id: string, data: UpdateRecurringIncomeData): Promise<RecurringIncome | null>;
  abstract remove(id: string): Promise<boolean>;
}
