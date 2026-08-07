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

// O `setup` acima monta um Prisma afinado para openInvoice. As operações de
// escrita precisam de outras tabelas, então ganham o seu próprio.
const CARD_ROW = {
  id: 'c1',
  householdId: 'h1',
  ownerMemberId: null as string | null,
  name: 'Nubank',
  bank: 'Nubank',
  color: '#820AD1',
  closingDay: 5,
  dueDay: 12,
  creditLimit: 4500,
  last4: '4421',
  archivedAt: null as Date | null,
  owner: null as { name: string } | null,
};

type WriteArgs = { where?: Record<string, unknown>; data?: Record<string, unknown> };

function setupWrite(over: Record<string, unknown> = {}) {
  const prisma = {
    card: {
      findFirst: jest.fn(async (_a: WriteArgs) => CARD_ROW as unknown),
      create: jest.fn(async (_a: WriteArgs) => CARD_ROW as unknown),
      update: jest.fn(async (_a: WriteArgs) => CARD_ROW as unknown),
      delete: jest.fn(async (_a: WriteArgs) => CARD_ROW as unknown),
    },
    member: { findFirst: jest.fn(async (_a: WriteArgs) => null as unknown) },
    transaction: {
      count: jest.fn(async (_a: WriteArgs) => 0),
      aggregate: jest.fn(async (_a: WriteArgs) => ({ _sum: { value: 0 } })),
    },
    invoiceHistory: { count: jest.fn(async (_a: WriteArgs) => 0) },
    ...over,
  };
  const repo = new CardPrismaRepository(prisma as never, { householdId: 'h1' } as never);
  return { repo, prisma };
}

const NOVO = {
  name: 'Nubank',
  bank: 'Nubank',
  color: '#820AD1',
  closingDay: 5,
  dueDay: 12,
  creditLimit: 4500,
  last4: '4421',
  holder: 'Thais',
};

describe('CardPrismaRepository.create', () => {
  it('resolve o titular para ownerMemberId pelo nome', async () => {
    const { repo, prisma } = setupWrite();
    prisma.member.findFirst.mockResolvedValue({ id: 'm-thais' });
    await repo.create(NOVO);
    expect(prisma.card.create.mock.calls[0][0].data.ownerMemberId).toBe('m-thais');
  });

  it('grava ownerMemberId nulo quando o titular é shared', async () => {
    const { repo, prisma } = setupWrite();
    await repo.create({ ...NOVO, holder: 'shared' });
    expect(prisma.card.create.mock.calls[0][0].data.ownerMemberId).toBeNull();
    expect(prisma.member.findFirst).not.toHaveBeenCalled();
  });

  it('nasce com fatura zero — não há lançamento ainda', async () => {
    const { repo } = setupWrite();
    expect((await repo.create(NOVO)).toJSON().current).toBe(0);
  });
});

describe('CardPrismaRepository.update', () => {
  it('devolve null quando o cartão não é do household', async () => {
    const { repo, prisma } = setupWrite();
    prisma.card.findFirst.mockResolvedValue(null);
    await expect(repo.update('de-outro', { creditLimit: 1 })).resolves.toBeNull();
    expect(prisma.card.update).not.toHaveBeenCalled();
  });

  it('só traduz holder para ownerMemberId quando holder veio no corpo', async () => {
    const { repo, prisma } = setupWrite();
    await repo.update('c1', { creditLimit: 6000 });
    expect(prisma.member.findFirst).not.toHaveBeenCalled();
    expect(prisma.card.update.mock.calls[0][0].data).not.toHaveProperty('ownerMemberId');
  });

  it('traduz o titular quando ele veio no corpo', async () => {
    const { repo, prisma } = setupWrite();
    prisma.member.findFirst.mockResolvedValue({ id: 'm-mateus' });
    await repo.update('c1', { holder: 'Mateus' });
    expect(prisma.card.update.mock.calls[0][0].data.ownerMemberId).toBe('m-mateus');
  });
});
