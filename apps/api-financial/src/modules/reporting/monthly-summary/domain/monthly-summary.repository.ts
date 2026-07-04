export interface MonthlySummaryView {
  id: string;
  year: number;
  month: number;
  expenseTotal: number;
  incomeTotal: number;
  perCategory: Record<string, number>;
  closed: boolean;
}

export abstract class MonthlySummaryRepository {
  abstract findAll(): Promise<MonthlySummaryView[]>;
  abstract closeMonth(year: number, month: number): Promise<MonthlySummaryView>;
}
