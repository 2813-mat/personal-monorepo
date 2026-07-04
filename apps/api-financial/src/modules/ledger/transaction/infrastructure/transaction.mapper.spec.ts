import { toView, TransactionRow } from './transaction.mapper';

const baseRow = {
  id: 't1',
  date: new Date('2026-05-10T12:00:00Z'),
  label: 'Mercado',
  value: '100' as unknown as never,
  category: { slug: 'mercado' },
  method: 'PIX',
  cardId: null,
  note: null,
  recurring: false,
  fixedExpenseId: null,
  installment: null,
} as unknown as TransactionRow;

describe('toView', () => {
  it('emits member name as holder', () => {
    const row = { ...baseRow, member: { name: 'Mateus' } } as unknown as TransactionRow;
    expect(toView(row).holder).toBe('Mateus');
  });

  it('emits "shared" when there is no member', () => {
    const row = { ...baseRow, member: null } as unknown as TransactionRow;
    expect(toView(row).holder).toBe('shared');
  });
});
