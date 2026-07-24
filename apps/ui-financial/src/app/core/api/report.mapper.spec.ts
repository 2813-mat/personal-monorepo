import { monthLabel, wireToExpenseHistory, wireToIncomeHistory } from './report.mapper';
import type { MonthlySummaryWire } from './wire.types';

const row = (
  year: number,
  month: number,
  expenseTotal: number,
  incomeTotal: number,
): MonthlySummaryWire => ({
  id: `s-${year}-${month}`,
  year,
  month,
  expenseTotal,
  incomeTotal,
  perCategory: {},
  closed: true,
});

describe('monthLabel', () => {
  it('formats as three-letter month and two-digit year', () => {
    expect(monthLabel(2026, 5)).toBe('Mai/26');
    expect(monthLabel(2025, 12)).toBe('Dez/25');
    expect(monthLabel(2026, 1)).toBe('Jan/26');
  });
});

describe('wireToExpenseHistory', () => {
  it('projects the expense total per month', () => {
    expect(wireToExpenseHistory([row(2026, 4, 4791, 7769), row(2026, 5, 5234, 7493)])).toEqual([
      { m: 'Abr/26', total: 4791 },
      { m: 'Mai/26', total: 5234 },
    ]);
  });

  it('sorts chronologically regardless of input order', () => {
    const out = wireToExpenseHistory([
      row(2026, 5, 5234, 0),
      row(2025, 12, 8596, 0),
      row(2026, 1, 7036, 0),
    ]);
    expect(out.map((e) => e.m)).toEqual(['Dez/25', 'Jan/26', 'Mai/26']);
  });

  it('maps an empty series to an empty array', () => {
    expect(wireToExpenseHistory([])).toEqual([]);
  });
});

describe('wireToIncomeHistory', () => {
  it('projects the income total per month', () => {
    expect(wireToIncomeHistory([row(2026, 5, 5234, 7493)])).toEqual([{ m: 'Mai/26', total: 7493 }]);
  });

  it('stays index-aligned with the expense series', () => {
    const rows = [row(2026, 5, 5234, 7493), row(2026, 4, 4791, 7769)];
    expect(wireToIncomeHistory(rows).map((e) => e.m)).toEqual(
      wireToExpenseHistory(rows).map((e) => e.m),
    );
  });
});
