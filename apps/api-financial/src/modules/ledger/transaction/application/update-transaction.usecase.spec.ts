import { NotFoundException } from '@nestjs/common';
import { UpdateTransactionUseCase } from './update-transaction.usecase';

const view = {
  id: 't1',
  date: '2026-05-05',
  label: 'Mercado',
  value: 240,
  categorySlug: 'casa',
  holder: 'Mateus',
  method: 'PIX' as const,
  cardId: null,
  recurring: false,
  reviewed: true,
  installments: null,
};

function setup(result: typeof view | null) {
  const repo = { update: jest.fn(async () => result) };
  return { uc: new UpdateTransactionUseCase(repo as never), repo };
}

describe('UpdateTransactionUseCase', () => {
  it('devolve a transação atualizada', async () => {
    const { uc } = setup(view);
    await expect(uc.execute('t1', { reviewed: true })).resolves.toMatchObject({ reviewed: true });
  });

  it('repassa id e dados ao repositório', async () => {
    const { uc, repo } = setup(view);
    await uc.execute('t1', { label: 'Mercado Extra' });
    expect(repo.update).toHaveBeenCalledWith('t1', { label: 'Mercado Extra' });
  });

  it('lança 404 quando a transação não existe', async () => {
    const { uc } = setup(null);
    await expect(uc.execute('zzz', { reviewed: true })).rejects.toThrow(NotFoundException);
  });
});
