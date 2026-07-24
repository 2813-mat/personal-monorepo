import { CardPrismaRepository } from './card.prisma.repository';

type FindManyArgs = { where: Record<string, unknown>; include?: Record<string, unknown> };

const card = { id: 'nu-t', householdId: 'h1', closingDay: 5 };

function setup(rows: unknown[]) {
  const prisma = {
    card: { findFirst: jest.fn(async (_a: unknown) => card) },
    transaction: {
      findMany: jest.fn(async (_a: FindManyArgs) => rows),
      aggregate: jest.fn(async (_a: unknown) => ({ _sum: { value: 0 } })),
    },
  };
  const repo = new CardPrismaRepository(prisma as never, { householdId: 'h1' } as never);
  return { repo, prisma };
}

const row = (over: Record<string, unknown> = {}) => ({
  id: 't1',
  date: new Date('2026-07-10T12:00:00Z'),
  label: 'Mercado',
  value: 100,
  category: { slug: 'mercado' },
  member: { name: 'Thais' },
  installment: null,
  ...over,
});

describe('CardPrismaRepository.openInvoice', () => {
  it('emits the member name as holder', async () => {
    const { repo } = setup([row()]);
    expect((await repo.openInvoice('nu-t')).items[0].holder).toBe('Thais');
  });

  it('falls back to "shared" when the purchase has no member', async () => {
    const { repo } = setup([row({ member: null })]);
    expect((await repo.openInvoice('nu-t')).items[0].holder).toBe('shared');
  });

  it('maps installments to the n-of shape', async () => {
    const { repo } = setup([row({ installment: { number: 2, plan: { totalCount: 6 } } })]);
    expect((await repo.openInvoice('nu-t')).items[0].installments).toEqual({ n: 2, of: 6 });
  });

  it('emits null installments for a one-off purchase', async () => {
    const { repo } = setup([row()]);
    expect((await repo.openInvoice('nu-t')).items[0].installments).toBeNull();
  });

  it('includes the relations the new fields need', async () => {
    const { repo, prisma } = setup([row()]);
    await repo.openInvoice('nu-t');
    const include = prisma.transaction.findMany.mock.calls[0][0].include;
    expect(include).toMatchObject({ category: true, member: true });
    expect(include?.['installment']).toBeTruthy();
  });

  it('totals the cycle items', async () => {
    const { repo } = setup([row(), row({ id: 't2', value: 50 })]);
    expect((await repo.openInvoice('nu-t')).total).toBe(150);
  });
});

describe('CardPrismaRepository.openInvoice — cycle coordinates', () => {
  // O (ano, mês) devolvido é o do FECHAMENTO do ciclo, que é o que
  // closeInvoice espera — e que pode ser o mês seguinte ao de hoje.
  afterEach(() => jest.useRealTimers());

  function atDate(iso: string) {
    jest.useFakeTimers().setSystemTime(new Date(iso));
  }

  it('points at this month when the closing day has not passed', async () => {
    atDate('2026-07-03T12:00:00Z');
    const { repo } = setup([]);
    const inv = await repo.openInvoice('nu-t');
    expect({ year: inv.year, month: inv.month }).toEqual({ year: 2026, month: 7 });
  });

  it('points at next month once the closing day has passed', async () => {
    atDate('2026-07-24T12:00:00Z');
    const { repo } = setup([]);
    const inv = await repo.openInvoice('nu-t');
    expect({ year: inv.year, month: inv.month }).toEqual({ year: 2026, month: 8 });
  });

  it('rolls into the next year in December', async () => {
    atDate('2026-12-24T12:00:00Z');
    const { repo } = setup([]);
    const inv = await repo.openInvoice('nu-t');
    expect({ year: inv.year, month: inv.month }).toEqual({ year: 2027, month: 1 });
  });

  it('exposes the closing date as an ISO day', async () => {
    atDate('2026-07-24T12:00:00Z');
    const { repo } = setup([]);
    expect((await repo.openInvoice('nu-t')).closingDate).toBe('2026-08-05');
  });
});
