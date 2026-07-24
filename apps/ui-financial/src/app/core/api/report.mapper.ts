import { monthShort } from '@caixa-familia/shared-utils';
import type { MonthlySummaryWire } from './wire.types';

/** Ponto de uma série mensal, no formato que os gráficos consomem. */
export interface MonthEntry {
  m: string;
  total: number;
}

/** `2026, 5` → `'Mai/26'`. Alias local: o formato é o mesmo do resto do app. */
export const monthLabel = monthShort;

// O backend já devolve ordenado, mas depender disso deixaria a UI frágil.
const chronological = (rows: MonthlySummaryWire[]): MonthlySummaryWire[] =>
  [...rows].sort((a, b) => a.year - b.year || a.month - b.month);

export function wireToExpenseHistory(rows: MonthlySummaryWire[]): MonthEntry[] {
  return chronological(rows).map((r) => ({
    m: monthLabel(r.year, r.month),
    total: r.expenseTotal,
  }));
}

export function wireToIncomeHistory(rows: MonthlySummaryWire[]): MonthEntry[] {
  return chronological(rows).map((r) => ({
    m: monthLabel(r.year, r.month),
    total: r.incomeTotal,
  }));
}
