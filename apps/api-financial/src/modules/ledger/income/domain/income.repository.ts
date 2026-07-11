import { Income } from './income.entity';

export interface CreateIncomeData {
  label: string;
  holder: string;
  value: number;
  date: string;
  recurring: boolean;
}

export abstract class IncomeRepository {
  abstract findAll(): Promise<Income[]>;
  abstract create(data: CreateIncomeData): Promise<Income>;
}
