import { monthShort, monthLabelLong, monthContextOf } from './month';

describe('monthShort', () => {
  it('formats as capitalised three-letter month and two-digit year', () => {
    expect(monthShort(2026, 5)).toBe('Mai/26');
    expect(monthShort(2025, 12)).toBe('Dez/25');
    expect(monthShort(2026, 1)).toBe('Jan/26');
  });
});

describe('monthLabelLong', () => {
  it('formats as capitalised full month and four-digit year', () => {
    expect(monthLabelLong(2026, 5)).toBe('Maio 2026');
    expect(monthLabelLong(2026, 7)).toBe('Julho 2026');
    expect(monthLabelLong(2025, 2)).toBe('Fevereiro 2025');
  });
});

describe('monthContextOf', () => {
  it('derives the whole context from a date', () => {
    expect(monthContextOf(new Date(2026, 6, 24))).toEqual({
      year: 2026,
      month: 7,
      label: 'Julho 2026',
      short: 'Jul/26',
    });
  });

  it('uses a one-based month, not the Date zero-based one', () => {
    expect(monthContextOf(new Date(2026, 0, 15)).month).toBe(1);
    expect(monthContextOf(new Date(2026, 11, 15)).month).toBe(12);
  });

  it('defaults to today', () => {
    const now = new Date();
    expect(monthContextOf()).toEqual(monthContextOf(now));
  });
});
