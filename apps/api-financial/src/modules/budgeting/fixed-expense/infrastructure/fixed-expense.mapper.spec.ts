import { toView, type FixedExpenseRow } from './fixed-expense.mapper';

const baseRow = {
  id: 'f1',
  householdId: 'h1',
  categoryId: 'c1',
  memberId: null,
  label: 'Aluguel',
  value: 2000,
  dueDay: 5,
  startDate: new Date('2026-01-01T00:00:00.000Z'),
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
    expect(toView(row, null).holder).toBe('Mateus');
  });

  it('falls back to "shared" when there is no member', () => {
    expect(toView(baseRow, null).holder).toBe('shared');
  });

  it('does not leak memberId into the view', () => {
    expect(toView(baseRow, null)).not.toHaveProperty('memberId');
  });

  it('emits startDate as a plain ISO day', () => {
    expect(toView(baseRow, null).startDate).toBe('2026-01-01');
  });

  it('deixa paidAt ausente quando não houve pagamento no mês', () => {
    const view = toView(baseRow, null);
    expect(view.paidAt).toBeUndefined();
    expect(view.paidValue).toBeUndefined();
  });

  it('emite a data e o valor do pagamento quando houve', () => {
    const view = toView(baseRow, { date: new Date('2026-08-06T00:00:00.000Z'), value: 2100 });
    expect(view.paidAt).toBe('2026-08-06');
    // O valor pago pode divergir do cadastro, e é o pago que a view mostra.
    expect(view.paidValue).toBe(2100);
    expect(view.value).toBe(2000);
  });
});
