import { Income } from './income.entity';

export interface CreateIncomeData {
  label: string;
  holder: string;
  value: number;
  date: string;
  recurring: boolean;
}

export interface UpdateIncomeData {
  label?: string;
  holder?: string;
  value?: number;
  date?: string;
}

/** Sem ano/mês devolve tudo — o histórico dos relatórios ainda depende disso. */
export interface IncomeFilter {
  year?: number;
  month?: number;
}

export abstract class IncomeRepository {
  abstract findAll(filter: IncomeFilter): Promise<Income[]>;
  abstract create(data: CreateIncomeData): Promise<Income>;
  abstract update(id: string, data: UpdateIncomeData): Promise<Income | null>;
  abstract remove(id: string): Promise<boolean>;
}
