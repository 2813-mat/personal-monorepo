import { toDomain, IncomeRow } from './income.mapper';

const baseRow = {
  id: 'i1',
  label: 'Salário',
  value: '5000' as unknown as never,
  date: new Date('2026-05-05T12:00:00Z'),
  recurring: true,
} as unknown as IncomeRow;

describe('income toDomain', () => {
  it('emits member name as holder', () => {
    const row = { ...baseRow, member: { name: 'Thais' } } as unknown as IncomeRow;
    expect(toDomain(row).toJSON().holder).toBe('Thais');
  });

  it('emits "shared" when there is no member', () => {
    const row = { ...baseRow, member: null } as unknown as IncomeRow;
    expect(toDomain(row).toJSON().holder).toBe('shared');
  });
});
