import { wireToFixed, fixedToCreateWire } from './fixed.mapper';
import type { FixedExpenseWire } from './wire.types';
import type { FixedExpense } from '@caixa-familia/shared-types';

const wire: FixedExpenseWire = {
  id: 'f1',
  label: 'Aluguel',
  value: 2000,
  dueDay: 5,
  categorySlug: 'casa',
  holder: 'Mateus',
  paidThisMonth: true,
};

describe('wireToFixed', () => {
  it('maps dueDay to due and categorySlug to cat', () => {
    expect(wireToFixed(wire)).toEqual({
      id: 'f1',
      label: 'Aluguel',
      value: 2000,
      due: 5,
      cat: 'casa',
      holder: 'Mateus',
      paidThisMonth: true,
    });
  });

  it('keeps the shared holder as-is', () => {
    expect(wireToFixed({ ...wire, holder: 'shared' }).holder).toBe('shared');
  });

  it('carries paidThisMonth false through', () => {
    expect(wireToFixed({ ...wire, paidThisMonth: false }).paidThisMonth).toBe(false);
  });
});

describe('fixedToCreateWire', () => {
  it('drops id and paidThisMonth, and renames due/cat', () => {
    const fixed: FixedExpense = {
      id: 'f1',
      label: 'Aluguel',
      value: 2000,
      due: 5,
      cat: 'casa',
      holder: 'Mateus',
      paidThisMonth: true,
    };
    expect(fixedToCreateWire(fixed)).toEqual({
      label: 'Aluguel',
      value: 2000,
      dueDay: 5,
      categorySlug: 'casa',
      holder: 'Mateus',
    });
  });
});
