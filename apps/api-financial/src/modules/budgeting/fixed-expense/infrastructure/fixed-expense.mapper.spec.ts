import { toView, type FixedExpenseRow } from './fixed-expense.mapper';

const baseRow = {
  id: 'f1',
  householdId: 'h1',
  categoryId: 'c1',
  memberId: null,
  label: 'Aluguel',
  value: 2000,
  dueDay: 5,
  category: { id: 'c1', householdId: 'h1', slug: 'moradia', label: 'Moradia', color: '#000', budget: 0 },
  member: null,
} as unknown as FixedExpenseRow;

describe('toView', () => {
  it('emits the member name as holder', () => {
    const row = {
      ...baseRow,
      memberId: 'm1',
      member: { id: 'm1', householdId: 'h1', name: 'Mateus', keycloakSub: 'sub', role: 'EDITOR', color: '#111' },
    } as unknown as FixedExpenseRow;
    expect(toView(row, false).holder).toBe('Mateus');
  });

  it('falls back to "shared" when there is no member', () => {
    expect(toView(baseRow, false).holder).toBe('shared');
  });

  it('does not leak memberId into the view', () => {
    expect(toView(baseRow, false)).not.toHaveProperty('memberId');
  });

  it('carries paidThisMonth through', () => {
    expect(toView(baseRow, true).paidThisMonth).toBe(true);
    expect(toView(baseRow, false).paidThisMonth).toBe(false);
  });
});
