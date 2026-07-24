import { monthShort } from '@caixa-familia/shared-utils';
import type { MonthlySummaryWire } from './wire.types';

/**
 * Ponto de uma série mensal. `m` é o rótulo de exibição; `year`/`month` são as
 * coordenadas — quem precisa filtrar por período usa os números, nunca o rótulo.
 */
export interface MonthEntry {
  m: string;
  year: number;
  month: number;
  total: number;
  /** Gasto por categoria naquele mês, chaveado pelo slug (= `Category.id`). */
  perCategory: Record<string, number>;
}

/** `2026, 5` → `'Mai/26'`. Alias local: o formato é o mesmo do resto do app. */
export const monthLabel = monthShort;

// O backend já devolve ordenado, mas depender disso deixaria a UI frágil.
const chronological = (rows: MonthlySummaryWire[]): MonthlySummaryWire[] =>
  [...rows].sort((a, b) => a.year - b.year || a.month - b.month);

export function wireToExpenseHistory(rows: MonthlySummaryWire[]): MonthEntry[] {
  return chronological(rows).map((r) => ({
    m: monthLabel(r.year, r.month),
    year: r.year,
    month: r.month,
    total: r.expenseTotal,
    perCategory: r.perCategory ?? {},
  }));
}

export function wireToIncomeHistory(rows: MonthlySummaryWire[]): MonthEntry[] {
  return chronological(rows).map((r) => ({
    m: monthLabel(r.year, r.month),
    year: r.year,
    month: r.month,
    total: r.incomeTotal,
    perCategory: r.perCategory ?? {},
  }));
}
