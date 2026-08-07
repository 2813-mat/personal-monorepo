import { TransactionPrismaRepository } from './transaction.prisma.repository';

function makeRepo(memberFindFirst: jest.Mock) {
  const created: any[] = [];
  const prisma: any = {
    member: { findFirst: memberFindFirst },
    category: { findFirstOrThrow: jest.fn(async () => ({ id: 'cat1' })) },
    transaction: {
      create: jest.fn(async (args: any) => {
        created.push(args.data);
        return {
          id: 'tx1',
          date: new Date('2026-05-10'),
          label: args.data.label,
          value: 100,
          category: { slug: 'mercado' },
          member: null,
          method: args.data.method,
          cardId: args.data.cardId ?? null,
          note: null,
          recurring: false,
          fixedExpenseId: null,
          installment: null,
        };
      }),
    },
    $transaction: async (fn: any) => fn(prisma),
  };
  const tenant: any = { householdId: 'h1' };
  const repo = new TransactionPrismaRepository(prisma, tenant);
  return { repo, created, prisma };
}

describe('TransactionPrismaRepository.create holder resolution', () => {
  it('resolves a named holder to its memberId', async () => {
    const findFirst = jest.fn(async () => ({ id: 'm-mateus' }));
    const { repo, created } = makeRepo(findFirst);
    await repo.create({
      date: '2026-05-10',
      label: 'Mercado',
      value: 100,
      categorySlug: 'mercado',
      holder: 'Mateus',
      method: 'PIX',
    } as any);
    expect(findFirst).toHaveBeenCalledWith({ where: { householdId: 'h1', name: 'Mateus' } });
    expect(created[0].memberId).toBe('m-mateus');
  });

  it('maps "shared" holder to a null member', async () => {
    const findFirst = jest.fn();
    const { repo, created } = makeRepo(findFirst);
    await repo.create({
      date: '2026-05-10',
      label: 'Pix',
      value: 50,
      categorySlug: 'mercado',
      holder: 'shared',
      method: 'PIX',
    } as any);
    expect(findFirst).not.toHaveBeenCalled();
    expect(created[0].memberId).toBeUndefined();
  });
});

describe('TransactionPrismaRepository.update', () => {
  type WhereArg = { where: Record<string, unknown> };
  type UpdateArg = { where: Record<string, unknown>; data: Record<string, unknown> };

  function setupUpdate(found: { id: string } | null) {
    const updated = {
      id: 't1',
      householdId: 'h1',
      date: new Date('2026-05-05'),
      label: 'Mercado',
      value: 240,
      categoryId: 'c1',
      memberId: 'm1',
      method: 'PIX',
      cardId: null,
      note: null,
      recurring: false,
      reviewed: true,
      fixedExpenseId: null,
      installmentId: null,
      category: { slug: 'casa' },
      member: { name: 'Mateus' },
      installment: null,
    };
    const prisma = {
      transaction: {
        findFirst: jest.fn(async (_a: WhereArg) => found),
        update: jest.fn(async (_a: UpdateArg) => updated),
      },
      category: { findFirst: jest.fn(async (_a: WhereArg) => ({ id: 'c2' })) },
      member: { findFirst: jest.fn(async (_a: WhereArg) => ({ id: 'm2' })) },
    };
    const repo = new TransactionPrismaRepository(prisma as never, { householdId: 'h1' } as never);
    return { repo, prisma };
  }

  it('escopa a busca ao household', async () => {
    const { repo, prisma } = setupUpdate({ id: 't1' });
    await repo.update('t1', { reviewed: true });
    expect(prisma.transaction.findFirst.mock.calls[0][0].where).toMatchObject({
      householdId: 'h1',
      id: 't1',
    });
  });

  it('devolve null para transação de outro household', async () => {
    const { repo, prisma } = setupUpdate(null);
    await expect(repo.update('t1', { reviewed: true })).resolves.toBeNull();
    expect(prisma.transaction.update).not.toHaveBeenCalled();
  });

  it('resolve categorySlug para categoryId', async () => {
    const { repo, prisma } = setupUpdate({ id: 't1' });
    await repo.update('t1', { categorySlug: 'lazer' });
    expect(prisma.transaction.update.mock.calls[0][0].data).toMatchObject({ categoryId: 'c2' });
  });

  it('resolve holder para memberId', async () => {
    const { repo, prisma } = setupUpdate({ id: 't1' });
    await repo.update('t1', { holder: 'Thais' });
    expect(prisma.transaction.update.mock.calls[0][0].data).toMatchObject({ memberId: 'm2' });
  });

  it('trata shared como sem membro', async () => {
    const { repo, prisma } = setupUpdate({ id: 't1' });
    await repo.update('t1', { holder: 'shared' });
    expect(prisma.transaction.update.mock.calls[0][0].data).toMatchObject({ memberId: null });
  });

  it('não deixa parcelamento ser alterado por aqui', async () => {
    const { repo, prisma } = setupUpdate({ id: 't1' });
    await repo.update('t1', { label: 'x' });
    expect(prisma.transaction.update.mock.calls[0][0].data).not.toHaveProperty('installmentId');
  });
});

describe('TransactionPrismaRepository.remove', () => {
  type WhereArg = { where: Record<string, unknown> };

  function setupRemove(count: number) {
    const prisma = {
      transaction: { deleteMany: jest.fn(async (_a: WhereArg) => ({ count })) },
    };
    const repo = new TransactionPrismaRepository(prisma as never, { householdId: 'h1' } as never);
    return { repo, prisma };
  }

  it('devolve true quando apagou', async () => {
    await expect(setupRemove(1).repo.remove('t1')).resolves.toBe(true);
  });

  it('devolve false quando não havia o que apagar', async () => {
    await expect(setupRemove(0).repo.remove('zzz')).resolves.toBe(false);
  });

  it('escopa a exclusão ao household', async () => {
    const { repo, prisma } = setupRemove(1);
    await repo.remove('t1');
    expect(prisma.transaction.deleteMany.mock.calls[0][0].where).toMatchObject({
      householdId: 'h1',
      id: 't1',
    });
  });
});
