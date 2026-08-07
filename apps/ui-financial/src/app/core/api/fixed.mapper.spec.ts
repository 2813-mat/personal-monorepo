import { wireToFixed, fixedToCreateWire, fixedToUpdateWire } from './fixed.mapper';
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

describe('fixedToUpdateWire', () => {
  const f: FixedExpense = {
    id: 'f1',
    label: 'Luz',
    value: 200,
    due: 10,
    cat: 'casa',
    holder: 'shared',
    paidThisMonth: false,
  };

  it('traduz due para dueDay e cat para categorySlug', () => {
    expect(fixedToUpdateWire(f)).toMatchObject({ dueDay: 10, categorySlug: 'casa' });
  });

  it('não envia paidThisMonth — é derivado', () => {
    expect(fixedToUpdateWire(f)).not.toHaveProperty('paidThisMonth');
  });
});
