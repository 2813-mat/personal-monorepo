import { CategoryPrismaRepository } from './category.prisma.repository';

type WhereArg = { where: Record<string, unknown> };
type UpdateArg = { where: Record<string, unknown>; data: Record<string, unknown> };
type FindManyArg = { where?: Record<string, unknown>; orderBy?: unknown };

const row = {
  id: 'c1',
  householdId: 'h1',
  slug: 'casa',
  label: 'Casa',
  color: '#7A4F1D',
  budget: 500,
  order: 1,
};

function setup(found: typeof row | null = row, tx = 0, fx = 0) {
  const prisma = {
    category: {
      findFirst: jest.fn(async (_a: WhereArg) => found),
      update: jest.fn(async (_a: UpdateArg) => ({ ...row, budget: 600 })),
      updateMany: jest.fn(async (_a: UpdateArg) => ({ count: 1 })),
      delete: jest.fn(async (_a: WhereArg) => undefined),
      findMany: jest.fn(async (_a: FindManyArg) => [row]),
      create: jest.fn(async (_a: { data: Record<string, unknown> }) => row),
    },
    transaction: { count: jest.fn(async (_a: WhereArg) => tx) },
    fixedExpense: { count: jest.fn(async (_a: WhereArg) => fx) },
    $transaction: jest.fn(async (ops: unknown[]) => ops),
  };
  const repo = new CategoryPrismaRepository(prisma as never, { householdId: 'h1' } as never);
  return { repo, prisma };
}

describe('CategoryPrismaRepository.findAll', () => {
  it('ordena por order, com label como desempate', async () => {
    const { repo, prisma } = setup();
    await repo.findAll();
    expect(prisma.category.findMany.mock.calls[0][0].orderBy).toEqual([
      { order: 'asc' },
      { label: 'asc' },
    ]);
  });
});

describe('CategoryPrismaRepository.create', () => {
  it('põe a categoria nova no fim da lista', async () => {
    const { repo, prisma } = setup();
    await repo.create({ slug: 'nova', label: 'Nova', color: '#000000', budget: 0 });
    // findFirst devolve a fixture com order 1, então a nova nasce com 2
    expect(prisma.category.create.mock.calls[0][0].data).toMatchObject({ order: 2 });
  });
});

describe('CategoryPrismaRepository.update', () => {
  it('escopa a busca ao household', async () => {
    const { repo, prisma } = setup();
    await repo.update('casa', { budget: 600 });
    expect(prisma.category.findFirst.mock.calls[0][0].where).toMatchObject({
      householdId: 'h1',
      slug: 'casa',
    });
  });

  it('devolve null para categoria de outro household', async () => {
    const { repo, prisma } = setup(null);
    await expect(repo.update('casa', { budget: 600 })).resolves.toBeNull();
    expect(prisma.category.update).not.toHaveBeenCalled();
  });

  it('não deixa slug nem order serem alterados por aqui', async () => {
    const { repo, prisma } = setup();
    await repo.update('casa', { label: 'Lar' });
    const data = prisma.category.update.mock.calls[0][0].data;
    expect(data).not.toHaveProperty('slug');
    expect(data).not.toHaveProperty('order');
  });
});

describe('CategoryPrismaRepository.countUsage', () => {
  it('conta transações e gastos fixos da categoria', async () => {
    const { repo } = setup(row, 3, 1);
    await expect(repo.countUsage('casa')).resolves.toEqual({ transactions: 3, fixedExpenses: 1 });
  });

  it('escopa as contagens ao household', async () => {
    const { repo, prisma } = setup(row, 0, 0);
    await repo.countUsage('casa');
    expect(prisma.transaction.count.mock.calls[0][0].where).toMatchObject({ householdId: 'h1' });
    expect(prisma.fixedExpense.count.mock.calls[0][0].where).toMatchObject({ householdId: 'h1' });
  });

  it('devolve null para categoria de outro household', async () => {
    const { repo } = setup(null);
    await expect(repo.countUsage('casa')).resolves.toBeNull();
  });
});

describe('CategoryPrismaRepository.remove', () => {
  it('devolve false para categoria de outro household', async () => {
    const { repo, prisma } = setup(null);
    await expect(repo.remove('casa')).resolves.toBe(false);
    expect(prisma.category.delete).not.toHaveBeenCalled();
  });

  it('exclui pelo id resolvido', async () => {
    const { repo, prisma } = setup();
    await expect(repo.remove('casa')).resolves.toBe(true);
    expect(prisma.category.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
  });
});

describe('CategoryPrismaRepository.reorder', () => {
  it('grava a posição de cada slug numa transação', async () => {
    const { repo, prisma } = setup();
    await repo.reorder(['saude', 'casa']);
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.category.updateMany).toHaveBeenNthCalledWith(1, {
      where: { householdId: 'h1', slug: 'saude' },
      data: { order: 1 },
    });
    expect(prisma.category.updateMany).toHaveBeenNthCalledWith(2, {
      where: { householdId: 'h1', slug: 'casa' },
      data: { order: 2 },
    });
  });
});
