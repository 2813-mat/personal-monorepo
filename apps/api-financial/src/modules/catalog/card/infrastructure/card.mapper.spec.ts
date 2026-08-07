import { toDomain } from './card.mapper';

const ROW = {
  id: 'c1',
  householdId: 'h1',
  ownerMemberId: 'm1',
  name: 'Nubank',
  bank: 'Nubank',
  color: '#820AD1',
  closingDay: 5,
  dueDay: 12,
  creditLimit: 4500,
  last4: '4421',
  archivedAt: null as Date | null,
  owner: { name: 'Thais' },
};

describe('toDomain — archived', () => {
  it('traduz archivedAt nulo para archived false', () => {
    expect(toDomain({ ...ROW, archivedAt: null } as never, 0).toJSON().archived).toBe(false);
  });

  it('traduz archivedAt preenchido para archived true', () => {
    const row = { ...ROW, archivedAt: new Date('2026-08-07') };
    expect(toDomain(row as never, 0).toJSON().archived).toBe(true);
  });
});
