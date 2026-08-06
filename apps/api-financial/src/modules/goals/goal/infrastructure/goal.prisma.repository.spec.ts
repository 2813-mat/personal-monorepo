import { GoalPrismaRepository } from './goal.prisma.repository';

type WhereArg = { where: Record<string, unknown> };

function setup() {
  const goal = { id: 'cuid-1', slug: 'sos', householdId: 'h1' };
  const prisma = {
    goal: {
      findFirstOrThrow: jest.fn(async (_args: WhereArg) => goal),
      findMany: jest.fn(async (_args: WhereArg) => []),
    },
    goalContribution: { create: jest.fn(async (_args: { data: Record<string, unknown> }) => undefined) },
  };
  const tenant = { householdId: 'h1' };
  const repo = new GoalPrismaRepository(prisma as never, tenant as never);
  return { repo, prisma, goal };
}

describe('GoalPrismaRepository.addContribution', () => {
  it('looks the goal up by slug, not by id', async () => {
    const { repo, prisma } = setup();
    await repo.addContribution('sos', { amount: 100, date: '2026-05-22' });
    const where = prisma.goal.findFirstOrThrow.mock.calls[0][0].where;
    expect(where).toMatchObject({ slug: 'sos' });
    expect(where).not.toHaveProperty('id');
  });

  it('stores the contribution against the resolved cuid', async () => {
    const { repo, prisma } = setup();
    await repo.addContribution('sos', { amount: 100, date: '2026-05-22' });
    expect(prisma.goalContribution.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ goalId: 'cuid-1', householdId: 'h1', amount: 100 }),
    });
  });

  it('scopes the lookup to the household', async () => {
    const { repo, prisma } = setup();
    await repo.addContribution('sos', { amount: 100, date: '2026-05-22' });
    expect(prisma.goal.findFirstOrThrow.mock.calls[0][0].where).toMatchObject({ householdId: 'h1' });
  });
});

describe('GoalPrismaRepository.update', () => {
  type UpdateArg = { where: Record<string, unknown>; data: Record<string, unknown> };

  function setupUpdate(found: { id: string } | null) {
    const prisma = {
      goal: {
        findFirst: jest.fn(async (_args: WhereArg) => found),
        update: jest.fn(async (_args: UpdateArg) => ({
          id: 'cuid-1',
          slug: 'sos',
          label: 'Reserva',
          target: 30000,
          monthly: 900,
          color: '#0B6E2F',
          subtitle: 'emergência',
          type: 'EMERGENCIA',
          householdId: 'h1',
          contributions: [],
        })),
      },
    };
    const repo = new GoalPrismaRepository(prisma as never, { householdId: 'h1' } as never);
    return { repo, prisma };
  }

  it('escopa a busca ao household', async () => {
    const { repo, prisma } = setupUpdate({ id: 'cuid-1' });
    await repo.update('sos', { monthly: 900 });
    expect(prisma.goal.findFirst.mock.calls[0][0].where).toMatchObject({
      householdId: 'h1',
      slug: 'sos',
    });
  });

  it('devolve null para meta de outro household', async () => {
    const { repo, prisma } = setupUpdate(null);
    await expect(repo.update('sos', { monthly: 900 })).resolves.toBeNull();
    expect(prisma.goal.update).not.toHaveBeenCalled();
  });

  it('não deixa o slug ser alterado', async () => {
    const { repo, prisma } = setupUpdate({ id: 'cuid-1' });
    await repo.update('sos', { label: 'Novo' });
    expect(prisma.goal.update.mock.calls[0][0].data).not.toHaveProperty('slug');
  });
});
