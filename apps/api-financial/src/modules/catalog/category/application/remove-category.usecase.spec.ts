import { ConflictException, NotFoundException } from '@nestjs/common';
import { RemoveCategoryUseCase } from './remove-category.usecase';

function setup(usage: { transactions: number; fixedExpenses: number } | null) {
  const repo = { countUsage: jest.fn(async () => usage), remove: jest.fn(async () => true) };
  return { uc: new RemoveCategoryUseCase(repo as never), repo };
}

describe('RemoveCategoryUseCase', () => {
  it('exclui categoria sem vínculo', async () => {
    const { uc, repo } = setup({ transactions: 0, fixedExpenses: 0 });
    await uc.execute('casa');
    expect(repo.remove).toHaveBeenCalledWith('casa');
  });

  it('lança 404 quando a categoria não existe', async () => {
    const { uc, repo } = setup(null);
    await expect(uc.execute('nada')).rejects.toThrow(NotFoundException);
    expect(repo.remove).not.toHaveBeenCalled();
  });

  it('lança 409 quando há transação vinculada', async () => {
    const { uc, repo } = setup({ transactions: 3, fixedExpenses: 0 });
    await expect(uc.execute('casa')).rejects.toThrow(ConflictException);
    expect(repo.remove).not.toHaveBeenCalled();
  });

  it('lança 409 quando há gasto fixo vinculado', async () => {
    const { uc } = setup({ transactions: 0, fixedExpenses: 1 });
    await expect(uc.execute('casa')).rejects.toThrow(ConflictException);
  });

  it('devolve as contagens no corpo do 409', async () => {
    const { uc } = setup({ transactions: 3, fixedExpenses: 1 });
    await expect(uc.execute('casa')).rejects.toMatchObject({
      response: expect.objectContaining({ transactions: 3, fixedExpenses: 1 }),
    });
  });
});
