import { MonthlySummary as PrismaMonthlySummary } from '@prisma/client';
import { MonthlySummaryView } from '../domain/monthly-summary.repository';

export const toView = (r: PrismaMonthlySummary): MonthlySummaryView => ({
  id: r.id,
  year: r.year,
  month: r.month,
  expenseTotal: Number(r.expenseTotal),
  incomeTotal: Number(r.incomeTotal),
  perCategory: (r.perCategory as Record<string, number>) ?? {},
  closed: r.closed,
});
