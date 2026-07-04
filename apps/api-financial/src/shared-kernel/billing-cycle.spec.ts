import { billingCycleFor } from './billing-cycle';

describe('billingCycleFor', () => {
  it('antes do fechamento: ciclo do mês corrente', () => {
    const ref = new Date(2026, 4, 3); // 3 mai, closing dia 5
    const cycle = billingCycleFor(5, ref);
    expect(cycle.end.getDate()).toBe(5);
    expect(cycle.end.getMonth()).toBe(4);
  });
  it('depois do fechamento: ciclo vai para o próximo mês', () => {
    const ref = new Date(2026, 4, 10); // 10 mai, closing dia 5
    const cycle = billingCycleFor(5, ref);
    expect(cycle.end.getMonth()).toBe(5); // junho
  });
});
