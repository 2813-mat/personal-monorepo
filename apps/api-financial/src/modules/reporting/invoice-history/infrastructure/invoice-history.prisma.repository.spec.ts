import { InvoiceHistoryPrismaRepository } from './invoice-history.prisma.repository';

type FindManyArgs = { where: Record<string, unknown>; orderBy?: unknown };

const row = (cardId: string, year: number, month: number, total: number) => ({
  id: `${cardId}-${year}-${month}`,
  cardId,
  year,
  month,
  closingDate: new Date(year, month - 1, 5),
  dueDate: new Date(year, month - 1, 12),
  total,
  perCategory: {},
  status: 'CLOSED' as const,
});

function setup(rows: unknown[]) {
  const prisma = {
    invoiceHistory: { findMany: jest.fn(async (_a: FindManyArgs) => rows) },
  };
  const repo = new InvoiceHistoryPrismaRepository(prisma as never, { householdId: 'h1' } as never);
  return { repo, prisma };
}

describe('InvoiceHistoryPrismaRepository.findAll', () => {
  it('does not filter by card', async () => {
    const { repo, prisma } = setup([]);
    await repo.findAll();
    expect(prisma.invoiceHistory.findMany.mock.calls[0][0].where).not.toHaveProperty('cardId');
  });

  it('stays scoped to the household', async () => {
    const { repo, prisma } = setup([]);
    await repo.findAll();
    expect(prisma.invoiceHistory.findMany.mock.calls[0][0].where).toMatchObject({
      householdId: 'h1',
    });
  });

  it('returns rows from every card', async () => {
    const { repo } = setup([row('nu-t', 2026, 3, 100), row('it-m', 2026, 3, 200)]);
    expect((await repo.findAll()).map((r) => r.cardId)).toEqual(['nu-t', 'it-m']);
  });

  it('orders by card and then chronologically', async () => {
    const { repo, prisma } = setup([]);
    await repo.findAll();
    expect(prisma.invoiceHistory.findMany.mock.calls[0][0].orderBy).toEqual([
      { cardId: 'asc' },
      { year: 'asc' },
      { month: 'asc' },
    ]);
  });
});
