import { CloseInvoiceUseCase } from './close-invoice.usecase';
import { InvoiceHistoryView } from '../domain/invoice-history.repository';

describe('CloseInvoiceUseCase', () => {
  it('fecha a fatura do cartão via repositório e devolve o snapshot', async () => {
    const view: InvoiceHistoryView = {
      id: 'ih1',
      cardId: 'nu-t',
      year: 2026,
      month: 5,
      closingDate: '2026-05-05',
      dueDate: '2026-05-12',
      total: 500,
      perCategory: { mercado: 500 },
      status: 'CLOSED',
    };
    const repo = { closeInvoice: jest.fn(async () => view), findByCard: jest.fn() };
    const res = await new CloseInvoiceUseCase(repo as any).execute('nu-t', 2026, 5);
    expect(repo.closeInvoice).toHaveBeenCalledWith('nu-t', 2026, 5);
    expect(res.status).toBe('CLOSED');
  });
});
