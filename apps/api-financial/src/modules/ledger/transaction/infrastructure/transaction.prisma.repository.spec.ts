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
