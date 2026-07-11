import { wireToIncome, incomeToCreateWire } from './income.mapper';
import type { IncomeWire } from './wire.types';
import type { Income } from '@caixa-familia/shared-types';

const wire: IncomeWire = {
  id: 'i1',
  label: 'Salário',
  holder: 'Thais',
  value: 5000,
  date: '2026-05-05',
  recurring: true,
};

describe('wireToIncome', () => {
  it('maps wire to domain Income', () => {
    expect(wireToIncome(wire)).toEqual({
      id: 'i1',
      label: 'Salário',
      holder: 'Thais',
      value: 5000,
      date: '2026-05-05',
      recurring: true,
    });
  });
});

describe('incomeToCreateWire', () => {
  it('drops id and maps to create wire', () => {
    const income: Income = {
      id: 'i1',
      label: 'Salário',
      holder: 'Thais',
      value: 5000,
      date: '2026-05-05',
      recurring: true,
    };
    expect(incomeToCreateWire(income)).toEqual({
      label: 'Salário',
      holder: 'Thais',
      value: 5000,
      date: '2026-05-05',
      recurring: true,
    });
  });
});
