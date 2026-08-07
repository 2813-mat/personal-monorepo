import { NotFoundException } from '@nestjs/common';
import { RemoveTransactionUseCase } from './remove-transaction.usecase';

function setup(removed: boolean) {
  const repo = { remove: jest.fn(async () => removed) };
  return { uc: new RemoveTransactionUseCase(repo as never), repo };
}

describe('RemoveTransactionUseCase', () => {
  it('exclui a transação existente', async () => {
    const { uc, repo } = setup(true);
    await uc.execute('t1');
    expect(repo.remove).toHaveBeenCalledWith('t1');
  });

  it('lança 404 quando a transação não existe', async () => {
    // antes o deleteMany respondia 204 mesmo sem apagar nada
    const { uc } = setup(false);
    await expect(uc.execute('zzz')).rejects.toThrow(NotFoundException);
  });
});
