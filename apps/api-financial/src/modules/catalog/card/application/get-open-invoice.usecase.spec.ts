import { GetOpenInvoiceUseCase } from './get-open-invoice.usecase';

describe('GetOpenInvoiceUseCase', () => {
  it('retorna total e itens do repositório', async () => {
    const repo = { openInvoice: jest.fn(async () => ({ total: 100, items: [] })), findAll: jest.fn() };
    const res = await new GetOpenInvoiceUseCase(repo as any).execute('nu-t');
    expect(repo.openInvoice).toHaveBeenCalledWith('nu-t');
    expect(res.total).toBe(100);
  });
});
