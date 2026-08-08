import {
  wireToFixed,
  fixedToCreateWire,
  fixedToUpdateWire,
  fixedPaymentToWire,
} from './fixed.mapper';
import type { FixedExpenseWire } from './wire.types';
import type { FixedExpense } from '@caixa-familia/shared-types';

const wire: FixedExpenseWire = {
  id: 'f1',
  label: 'Aluguel',
  value: 2000,
  dueDay: 5,
  categorySlug: 'casa',
  holder: 'Mateus',
  startDate: '2026-01-01',
  paidAt: '2026-05-06',
  paidValue: 2050,
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
      startDate: '2026-01-01',
      paidAt: '2026-05-06',
      paidValue: 2050,
    });
  });

  it('keeps the shared holder as-is', () => {
    expect(wireToFixed({ ...wire, holder: 'shared' }).holder).toBe('shared');
  });

  it('deixa paidAt indefinido para o fixo pendente', () => {
    const pendente = wireToFixed({ ...wire, paidAt: undefined, paidValue: undefined });
    expect(pendente.paidAt).toBeUndefined();
    expect(pendente.paidValue).toBeUndefined();
  });
});

describe('fixedToCreateWire', () => {
  const fixed: FixedExpense = {
    id: 'f1',
    label: 'Aluguel',
    value: 2000,
    due: 5,
    cat: 'casa',
    holder: 'Mateus',
    startDate: '2026-04-01',
  };

  it('drops id and renames due/cat', () => {
    expect(fixedToCreateWire(fixed)).toEqual({
      label: 'Aluguel',
      value: 2000,
      dueDay: 5,
      categorySlug: 'casa',
      holder: 'Mateus',
      startDate: '2026-04-01',
    });
  });

  it('omite startDate vazio para o servidor usar o mês corrente', () => {
    // Mandar '' quebraria o IsDateString do DTO em vez de cair no default.
    expect(fixedToCreateWire({ ...fixed, startDate: '' }).startDate).toBeUndefined();
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
    startDate: '2026-01-01',
    paidAt: '2026-05-06',
  };

  it('traduz due para dueDay e cat para categorySlug', () => {
    expect(fixedToUpdateWire(f)).toMatchObject({ dueDay: 10, categorySlug: 'casa' });
  });

  it('não envia o pagamento — ele tem endpoint próprio', () => {
    const w = fixedToUpdateWire(f);
    expect(w).not.toHaveProperty('paidAt');
    expect(w).not.toHaveProperty('paidValue');
  });
});

describe('fixedPaymentToWire', () => {
  it('traduz pix para PIX sem cartão', () => {
    expect(fixedPaymentToWire({ date: '2026-08-06', value: 300, method: 'pix' })).toEqual({
      date: '2026-08-06',
      value: 300,
      method: 'PIX',
      cardId: undefined,
    });
  });

  it('trata qualquer outro método como o id do cartão', () => {
    expect(fixedPaymentToWire({ date: '2026-08-06', method: 'nu-t' })).toEqual({
      date: '2026-08-06',
      value: undefined,
      method: 'CARD',
      cardId: 'nu-t',
    });
  });
});
