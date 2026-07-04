import { ListTransactionsUseCase } from './list-transactions.usecase';
import { TransactionView } from '../domain/transaction.repository';

describe('ListTransactionsUseCase', () => {
  it('repassa o filtro ao repositório e retorna os itens', async () => {
    const item: TransactionView = {
      id: 't1',
      date: '2026-05-01',
      label: 'Mercado',
      value: 100,
      categorySlug: 'mercado',
      memberId: null,
      method: 'PIX',
      cardId: null,
      recurring: false,
      installments: null,
    };
    const repo = { findAll: jest.fn(async () => [item]), create: jest.fn(), remove: jest.fn() };
    const filter = { year: 2026, month: 5 };
    const res = await new ListTransactionsUseCase(repo as any).execute(filter);
    expect(repo.findAll).toHaveBeenCalledWith(filter);
    expect(res).toHaveLength(1);
    expect(res[0].categorySlug).toBe('mercado');
  });
});
