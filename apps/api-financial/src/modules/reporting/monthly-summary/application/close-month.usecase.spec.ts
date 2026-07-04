import { CloseMonthUseCase } from './close-month.usecase';
import { MonthlySummaryView } from '../domain/monthly-summary.repository';

describe('CloseMonthUseCase', () => {
  it('fecha o mês via repositório e devolve o snapshot', async () => {
    const view: MonthlySummaryView = {
      id: 's1',
      year: 2026,
      month: 5,
      expenseTotal: 100,
      incomeTotal: 200,
      perCategory: { mercado: 100 },
      closed: true,
    };
    const repo = { closeMonth: jest.fn(async () => view), findAll: jest.fn() };
    const res = await new CloseMonthUseCase(repo as any).execute(2026, 5);
    expect(repo.closeMonth).toHaveBeenCalledWith(2026, 5);
    expect(res.closed).toBe(true);
  });
});
