import {
  wireToInvoiceHistory,
  wireToOpenInvoiceItem,
  groupInvoiceHistoryByCard,
} from './invoice.mapper';
import type { InvoiceHistoryWire } from './wire.types';

const wire: InvoiceHistoryWire = {
  id: 'inv-1',
  cardId: 'nu-t',
  year: 2026,
  month: 3,
  closingDate: '2026-03-05',
  dueDate: '2026-03-12',
  total: 1895.5,
  perCategory: { mercado: 900, lazer: 995.5 },
  status: 'CLOSED',
};

describe('wireToInvoiceHistory', () => {
  it('keeps the month coordinates, total and category breakdown', () => {
    expect(wireToInvoiceHistory(wire)).toEqual({
      year: 2026,
      month: 3,
      total: 1895.5,
      perCategory: { mercado: 900, lazer: 995.5 },
    });
  });

  it('drops the fields the invoice panel does not use', () => {
    const entry = wireToInvoiceHistory(wire);
    expect(entry).not.toHaveProperty('id');
    expect(entry).not.toHaveProperty('status');
    expect(entry).not.toHaveProperty('closingDate');
  });

  it('defaults a missing breakdown to an empty object', () => {
    const entry = wireToInvoiceHistory({ ...wire, perCategory: undefined as never });
    expect(entry.perCategory).toEqual({});
  });
});

describe('wireToOpenInvoiceItem', () => {
  const item = {
    id: 't1',
    date: '2026-07-10',
    label: 'Mercado',
    value: 100,
    categorySlug: 'mercado',
    holder: 'Thais',
    installments: { n: 2, of: 6 },
  };

  it('renames categorySlug to cat and keeps the rest', () => {
    expect(wireToOpenInvoiceItem(item)).toEqual({
      id: 't1',
      date: '2026-07-10',
      label: 'Mercado',
      value: 100,
      cat: 'mercado',
      holder: 'Thais',
      installments: { n: 2, of: 6 },
    });
  });

  it('carries a null instalment through', () => {
    expect(wireToOpenInvoiceItem({ ...item, installments: null }).installments).toBeNull();
  });

  it('keeps the shared holder as-is', () => {
    expect(wireToOpenInvoiceItem({ ...item, holder: 'shared' }).holder).toBe('shared');
  });
});

describe('groupInvoiceHistoryByCard', () => {
  const row = (cardId: string, year: number, month: number, total: number) => ({
    id: `${cardId}-${month}`,
    cardId,
    year,
    month,
    closingDate: '2026-01-05',
    dueDate: '2026-01-12',
    total,
    perCategory: {},
    status: 'CLOSED' as const,
  });

  it('groups the flat list by card', () => {
    const grouped = groupInvoiceHistoryByCard([
      row('nu-t', 2026, 1, 100),
      row('it-m', 2026, 1, 200),
      row('nu-t', 2026, 2, 150),
    ]);
    expect(Object.keys(grouped).sort()).toEqual(['it-m', 'nu-t']);
    expect(grouped['nu-t'].map((e) => e.total)).toEqual([100, 150]);
  });

  it('keeps each card chronological', () => {
    const grouped = groupInvoiceHistoryByCard([
      row('nu-t', 2026, 3, 300),
      row('nu-t', 2025, 12, 50),
      row('nu-t', 2026, 1, 100),
    ]);
    expect(grouped['nu-t'].map((e) => e.total)).toEqual([50, 100, 300]);
  });

  it('omits cards with no closed invoice instead of inventing an entry', () => {
    expect(groupInvoiceHistoryByCard([row('nu-t', 2026, 1, 100)])['it-m']).toBeUndefined();
  });

  it('maps an empty list to an empty map', () => {
    expect(groupInvoiceHistoryByCard([])).toEqual({});
  });
});
