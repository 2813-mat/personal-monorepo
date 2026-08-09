import { ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { FixedExpensePrismaRepository } from './fixed-expense.prisma.repository';

type WhereArg = { where: Record<string, unknown> };
type UpdateArg = { where: Record<string, unknown>; data: Record<string, unknown> };
type CreateArg = { data: Record<string, unknown> };

type TxClient = {
  transaction: { updateMany: jest.Mock; findFirst: jest.Mock; create: jest.Mock };
  fixedExpense: { delete: jest.Mock };
};

/** Linha completa do fixo, como o `include` do repositório a devolve. */
const ROW = {
  id: 'f1',
  householdId: 'h1',
  categoryId: 'c1',
  memberId: null,
  label: 'Luz',
  value: 200,
  dueDay: 10,
  startDate: new Date('2026-01-01T00:00:00.000Z'),
  category: { slug: 'casa' },
  member: null,
};

type Options = {
  /** Pagamentos que já existem no mês consultado. */
  payments?: { fixedExpenseId: string | null; date: Date; value: number }[];
  /** Pagamento encontrado na re-checagem dentro da transação do `pay`. */
  existingPayment?: { id: string } | null;
};

function setup(found: Partial<typeof ROW> | null, opts: Options = {}) {
  const updateMany = jest.fn(async (_a: UpdateArg) => ({ count: 2 }));
  const deleteFn = jest.fn(async (_a: WhereArg) => undefined);
  const txFindFirst = jest.fn(async (_a: WhereArg) => opts.existingPayment ?? null);
  const txCreate = jest.fn(async (_a: CreateArg) => ({ id: 't-new' }));
  const prisma = {
    fixedExpense: {
      findFirst: jest.fn(async (_a: WhereArg) => (found ? { ...ROW, ...found } : null)),
      findMany: jest.fn(async (_a: WhereArg) => [ROW]),
      update: jest.fn(async (_a: UpdateArg) => ROW),
      delete: deleteFn,
    },
    transaction: {
      updateMany,
      findMany: jest.fn(async (_a: WhereArg) => opts.payments ?? []),
      deleteMany: jest.fn(async (_a: WhereArg) => ({ count: 1 })),
    },
    category: { findFirst: jest.fn(async (_a: WhereArg) => ({ id: 'c2' })) },
    member: { findFirst: jest.fn(async (_a: WhereArg) => ({ id: 'm2' })) },
    $transaction: jest.fn(async (fn: (tx: TxClient) => unknown) =>
      fn({
        transaction: { updateMany, findFirst: txFindFirst, create: txCreate },
        fixedExpense: { delete: deleteFn },
      }),
    ),
  };
  const repo = new FixedExpensePrismaRepository(prisma as never, { householdId: 'h1' } as never);
  return { repo, prisma, updateMany, deleteFn, txFindFirst, txCreate };
}

describe('FixedExpensePrismaRepository.findAllWithStatus', () => {
  it('esconde fixos que só passam a valer depois do mês pedido', async () => {
    const { repo, prisma } = setup({ id: 'f1' });
    await repo.findAllWithStatus(2026, 5);
    expect(prisma.fixedExpense.findMany.mock.calls[0][0].where).toMatchObject({
      householdId: 'h1',
      startDate: { lt: new Date(2026, 5, 1) },
    });
  });

  it('marca como pago o fixo com lançamento no mês', async () => {
    const { repo } = setup({ id: 'f1' }, {
      payments: [{ fixedExpenseId: 'f1', date: new Date('2026-05-08T00:00:00.000Z'), value: 215 }],
    });
    const [view] = await repo.findAllWithStatus(2026, 5);
    expect(view.paidAt).toBe('2026-05-08');
    expect(view.paidValue).toBe(215);
  });

  it('deixa pendente o fixo sem lançamento no mês', async () => {
    const { repo } = setup({ id: 'f1' });
    const [view] = await repo.findAllWithStatus(2026, 5);
    expect(view.paidAt).toBeUndefined();
  });

  it('busca os pagamentos do mês numa consulta só, não uma por fixo', async () => {
    const { repo, prisma } = setup({ id: 'f1' });
    await repo.findAllWithStatus(2026, 5);
    expect(prisma.transaction.findMany).toHaveBeenCalledTimes(1);
  });
});

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

  // Regressão: o membro provisionado pelo Keycloak nasce com o nome completo
  // ('Mateus Bispo'), e o casamento por nome exato não o encontrava.
  it('casa o titular pelo nome exato ou pelo primeiro nome do nome completo', async () => {
    const { repo, prisma } = setup({ id: 'f1' });
    await repo.update('f1', { holder: 'Mateus' }, 2026, 5);
    expect(prisma.member.findFirst.mock.calls[0][0]).toMatchObject({
      where: {
        householdId: 'h1',
        OR: [
          { name: { equals: 'Mateus', mode: 'insensitive' } },
          { name: { startsWith: 'Mateus ', mode: 'insensitive' } },
        ],
      },
    });
    expect(prisma.fixedExpense.update.mock.calls[0][0].data).toMatchObject({ memberId: 'm2' });
  });

  it('recusa o titular que não é membro do household', async () => {
    const { repo, prisma } = setup({ id: 'f1' });
    prisma.member.findFirst.mockResolvedValue(null);
    await expect(repo.update('f1', { holder: 'Thais' }, 2026, 5)).rejects.toThrow(/Thais/);
    expect(prisma.fixedExpense.update).not.toHaveBeenCalled();
  });
});

describe('FixedExpensePrismaRepository.pay', () => {
  const PAGAMENTO = { date: '2026-05-08', method: 'PIX' as const };

  it('cria o lançamento vinculado ao fixo, herdando categoria e titular', async () => {
    const { repo, txCreate } = setup({ id: 'f1' });
    await repo.pay('f1', PAGAMENTO);
    expect(txCreate.mock.calls[0][0].data).toMatchObject({
      householdId: 'h1',
      label: 'Luz',
      value: 200,
      categoryId: 'c1',
      method: 'PIX',
      fixedExpenseId: 'f1',
      recurring: true,
    });
  });

  it('usa o valor informado quando a conta veio diferente do cadastro', async () => {
    const { repo, txCreate } = setup({ id: 'f1' });
    await repo.pay('f1', { ...PAGAMENTO, value: 321.5 });
    expect(txCreate.mock.calls[0][0].data).toMatchObject({ value: 321.5 });
  });

  it('devolve null para gasto fixo de outro household', async () => {
    const { repo, txCreate } = setup(null);
    await expect(repo.pay('f1', PAGAMENTO)).resolves.toBeNull();
    expect(txCreate).not.toHaveBeenCalled();
  });

  it('recusa pagamento em mês anterior ao início da vigência', async () => {
    const { repo, txCreate } = setup({ startDate: new Date('2026-07-01T00:00:00.000Z') });
    await expect(repo.pay('f1', PAGAMENTO)).rejects.toThrow(UnprocessableEntityException);
    expect(txCreate).not.toHaveBeenCalled();
  });

  it('aceita pagamento no próprio mês em que a vigência começa', async () => {
    const { repo, txCreate } = setup({ startDate: new Date('2026-05-01T00:00:00.000Z') });
    await repo.pay('f1', PAGAMENTO);
    expect(txCreate).toHaveBeenCalled();
  });

  it('recusa o segundo pagamento do mesmo mês', async () => {
    // Sem isto duas abas duplicariam o lançamento e o mês contaria duas vezes.
    const { repo, txCreate } = setup({ id: 'f1' }, { existingPayment: { id: 't-antigo' } });
    await expect(repo.pay('f1', PAGAMENTO)).rejects.toThrow(ConflictException);
    expect(txCreate).not.toHaveBeenCalled();
  });

  it('devolve a view já com o pagamento do mês', async () => {
    const { repo } = setup({ id: 'f1' }, {
      payments: [{ fixedExpenseId: 'f1', date: new Date('2026-05-08T00:00:00.000Z'), value: 200 }],
    });
    const view = await repo.pay('f1', PAGAMENTO);
    expect(view?.paidAt).toBe('2026-05-08');
  });
});

describe('FixedExpensePrismaRepository.unpay', () => {
  it('apaga o lançamento do mês, escopado ao household e ao fixo', async () => {
    const { repo, prisma } = setup({ id: 'f1' });
    await repo.unpay('f1', 2026, 5);
    expect(prisma.transaction.deleteMany.mock.calls[0][0].where).toMatchObject({
      householdId: 'h1',
      fixedExpenseId: 'f1',
      date: { gte: new Date(2026, 4, 1), lt: new Date(2026, 5, 1) },
    });
  });

  it('devolve a view pendente', async () => {
    const { repo } = setup({ id: 'f1' });
    const view = await repo.unpay('f1', 2026, 5);
    expect(view?.paidAt).toBeUndefined();
  });

  it('devolve null para gasto fixo de outro household', async () => {
    const { repo, prisma } = setup(null);
    await expect(repo.unpay('f1', 2026, 5)).resolves.toBeNull();
    expect(prisma.transaction.deleteMany).not.toHaveBeenCalled();
  });
});
