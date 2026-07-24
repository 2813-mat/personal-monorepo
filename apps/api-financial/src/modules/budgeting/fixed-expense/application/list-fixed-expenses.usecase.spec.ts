import { ListFixedExpensesUseCase } from './list-fixed-expenses.usecase';
import { FixedExpenseView } from '../domain/fixed-expense.repository';

describe('ListFixedExpensesUseCase', () => {
  it('repassa year/month ao repositório e devolve status pago/pendente', async () => {
    const views: FixedExpenseView[] = [
      { id: 'f1', label: 'Aluguel', value: 2000, dueDay: 5, categorySlug: 'moradia', holder: 'shared', paidThisMonth: true },
      { id: 'f2', label: 'Internet', value: 100, dueDay: 10, categorySlug: 'moradia', holder: 'Mateus', paidThisMonth: false },
    ];
    const repo = { findAllWithStatus: jest.fn(async () => views), create: jest.fn() };
    const res = await new ListFixedExpensesUseCase(repo as any).execute(2026, 5);
    expect(repo.findAllWithStatus).toHaveBeenCalledWith(2026, 5);
    expect(res.filter((v) => v.paidThisMonth)).toHaveLength(1);
  });
});
