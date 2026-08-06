import { FixedExpensePrismaRepository } from './fixed-expense.prisma.repository';

type WhereArg = { where: Record<string, unknown> };
type UpdateArg = { where: Record<string, unknown>; data: Record<string, unknown> };

type TxClient = {
  transaction: { updateMany: jest.Mock };
  fixedExpense: { delete: jest.Mock };
};

function setup(found: { id: string } | null) {
  const updateMany = jest.fn(async (_a: UpdateArg) => ({ count: 2 }));
  const deleteFn = jest.fn(async (_a: WhereArg) => undefined);
  const prisma = {
    fixedExpense: {
      findFirst: jest.fn(async (_a: WhereArg) => found),
      update: jest.fn(async (_a: UpdateArg) => ({
        id: 'f1',
        label: 'Luz',
        value: 200,
        dueDay: 10,
        category: { slug: 'casa' },
        member: null,
      })),
      delete: deleteFn,
    },
    transaction: { updateMany, count: jest.fn(async (_a: WhereArg) => 0) },
    category: { findFirst: jest.fn(async (_a: WhereArg) => ({ id: 'c2' })) },
    member: { findFirst: jest.fn(async (_a: WhereArg) => ({ id: 'm2' })) },
    $transaction: jest.fn(async (fn: (tx: TxClient) => unknown) =>
      fn({ transaction: { updateMany }, fixedExpense: { delete: deleteFn } }),
    ),
  };
  const repo = new FixedExpensePrismaRepository(prisma as never, { householdId: 'h1' } as never);
  return { repo, prisma, updateMany, deleteFn };
}

describe('FixedExpensePrismaRepository.update', () => {
  it('escopa a busca ao household', async () => {
    const { repo, prisma } = setup({ id: 'f1' });
    await repo.update('f1', { value: 300 }, 2026, 5);
    expect(prisma.fixedExpense.findFirst.mock.calls[0][0].where).toMatchObject({
      householdId: 'h1',
      id: 'f1',
    });
  });

  it('devolve null para gasto fixo de outro household', async () => {
    const { repo, prisma } = setup(null);
    await expect(repo.update('f1', { value: 300 }, 2026, 5)).resolves.toBeNull();
    expect(prisma.fixedExpense.update).not.toHaveBeenCalled();
  });

  it('resolve categorySlug para categoryId', async () => {
    const { repo, prisma } = setup({ id: 'f1' });
    await repo.update('f1', { categorySlug: 'lazer' }, 2026, 5);
    expect(prisma.fixedExpense.update.mock.calls[0][0].data).toMatchObject({ categoryId: 'c2' });
  });

  it('trata shared como sem membro', async () => {
    const { repo, prisma } = setup({ id: 'f1' });
    await repo.update('f1', { holder: 'shared' }, 2026, 5);
    expect(prisma.fixedExpense.update.mock.calls[0][0].data).toMatchObject({ memberId: null });
  });
});

describe('FixedExpensePrismaRepository.remove', () => {
  it('desvincula os lançamentos antes de excluir', async () => {
    const { repo, updateMany, deleteFn } = setup({ id: 'f1' });
    await repo.remove('f1');
    expect(updateMany).toHaveBeenCalledWith({
      where: { householdId: 'h1', fixedExpenseId: 'f1' },
      data: { fixedExpenseId: null },
    });
    expect(deleteFn).toHaveBeenCalledWith({ where: { id: 'f1' } });
  });

  it('devolve false para gasto fixo de outro household', async () => {
    const { repo, deleteFn } = setup(null);
    await expect(repo.remove('f1')).resolves.toBe(false);
    expect(deleteFn).not.toHaveBeenCalled();
  });

  it('escopa a busca ao household', async () => {
    const { repo, prisma } = setup({ id: 'f1' });
    await repo.remove('f1');
    expect(prisma.fixedExpense.findFirst.mock.calls[0][0].where).toMatchObject({
      householdId: 'h1',
      id: 'f1',
    });
  });
});
