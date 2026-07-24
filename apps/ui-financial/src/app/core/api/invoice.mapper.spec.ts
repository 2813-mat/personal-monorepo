import { wireToInvoiceHistory } from './invoice.mapper';
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
