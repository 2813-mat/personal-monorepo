import { NotFoundException } from '@nestjs/common';
import { RemoveFixedExpenseUseCase } from './remove-fixed-expense.usecase';

function setup(removed: boolean) {
  const repo = { remove: jest.fn(async () => removed) };
  return { uc: new RemoveFixedExpenseUseCase(repo as never), repo };
}

describe('RemoveFixedExpenseUseCase', () => {
  it('exclui o gasto fixo existente', async () => {
    const { uc, repo } = setup(true);
    await uc.execute('f1');
    expect(repo.remove).toHaveBeenCalledWith('f1');
  });

  it('lança 404 quando não existe', async () => {
    const { uc } = setup(false);
    await expect(uc.execute('zzz')).rejects.toThrow(NotFoundException);
  });
});
