import { monthLabel, wireToExpenseHistory, wireToIncomeHistory } from './report.mapper';
import type { MonthlySummaryWire } from './wire.types';

const row = (
  year: number,
  month: number,
  expenseTotal: number,
  incomeTotal: number,
  perCategory: Record<string, number> = {},
): MonthlySummaryWire => ({
  id: `s-${year}-${month}`,
  year,
  month,
  expenseTotal,
  incomeTotal,
  perCategory,
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
      { m: 'Abr/26', year: 2026, month: 4, total: 4791, perCategory: {} },
      { m: 'Mai/26', year: 2026, month: 5, total: 5234, perCategory: {} },
    ]);
  });

  it('keeps the numeric coordinates so consumers do not parse the label', () => {
    const [entry] = wireToExpenseHistory([row(2025, 12, 8596, 0)]);
    expect(entry).toMatchObject({ year: 2025, month: 12 });
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
    expect(wireToIncomeHistory([row(2026, 5, 5234, 7493)])).toEqual([
      { m: 'Mai/26', year: 2026, month: 5, total: 7493, perCategory: {} },
    ]);
  });

  it('stays index-aligned with the expense series', () => {
    const rows = [row(2026, 5, 5234, 7493), row(2026, 4, 4791, 7769)];
    expect(wireToIncomeHistory(rows).map((e) => e.m)).toEqual(
      wireToExpenseHistory(rows).map((e) => e.m),
    );
  });
});

describe('MonthEntry.perCategory', () => {
  it('keeps the per-category breakdown the wire carries', () => {
    const [entry] = wireToExpenseHistory([row(2026, 5, 500, 0, { mercado: 300, casa: 200 })]);
    expect(entry.perCategory).toEqual({ mercado: 300, casa: 200 });
  });

  it('defaults a missing breakdown to an empty object', () => {
    const [entry] = wireToExpenseHistory([
      { ...row(2026, 5, 500, 0), perCategory: undefined as never },
    ]);
    expect(entry.perCategory).toEqual({});
  });

  it('carries the breakdown on the income projection too', () => {
    const [entry] = wireToIncomeHistory([row(2026, 5, 500, 900, { mercado: 300 })]);
    expect(entry.perCategory).toEqual({ mercado: 300 });
  });
});
