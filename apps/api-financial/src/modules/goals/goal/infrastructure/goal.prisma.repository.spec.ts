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
