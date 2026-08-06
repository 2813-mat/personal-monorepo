import { NotFoundException } from '@nestjs/common';
import { UpdateFixedExpenseUseCase } from './update-fixed-expense.usecase';

const view = {
  id: 'f1',
  label: 'Luz',
  value: 200,
  dueDay: 10,
  categorySlug: 'casa',
  holder: 'shared',
  paidThisMonth: false,
};

function setup(result: typeof view | null) {
  const repo = { update: jest.fn(async () => result) };
  return { uc: new UpdateFixedExpenseUseCase(repo as never), repo };
}

describe('UpdateFixedExpenseUseCase', () => {
  it('devolve o gasto fixo atualizado', async () => {
    const { uc } = setup(view);
    await expect(uc.execute('f1', { value: 200 })).resolves.toMatchObject({ id: 'f1' });
  });

  it('passa o mês corrente ao repositório, porque paidThisMonth depende dele', async () => {
    const { uc, repo } = setup(view);
    const now = new Date();
    await uc.execute('f1', { value: 200 });
    expect(repo.update).toHaveBeenCalledWith(
      'f1',
      { value: 200 },
      now.getFullYear(),
      now.getMonth() + 1,
    );
  });

  it('lança 404 quando não existe', async () => {
    const { uc } = setup(null);
    await expect(uc.execute('zzz', { value: 1 })).rejects.toThrow(NotFoundException);
  });
});
