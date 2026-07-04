import { wireToTransaction, transactionToCreateWire } from './transaction.mapper';
import type { TransactionWire } from './wire.types';
import type { Transaction } from '@caixa-familia/shared-types';

const cardWire: TransactionWire = {
  id: 't1',
  date: '2026-05-10',
  label: 'Tênis',
  value: 300,
  categorySlug: 'lazer',
  holder: 'Mateus',
  method: 'CARD',
  cardId: 'card-db-1',
  recurring: false,
  installments: { n: 1, of: 3 },
};

describe('wireToTransaction', () => {
  it('maps a CARD payment to method=cardId and cat=categorySlug', () => {
    const t = wireToTransaction(cardWire);
    expect(t.cat).toBe('lazer');
    expect(t.method).toBe('card-db-1');
    expect(t.holder).toBe('Mateus');
    expect(t.installments).toEqual({ n: 1, of: 3 });
  });

  it('maps a PIX payment to method="pix"', () => {
    const t = wireToTransaction({ ...cardWire, method: 'PIX', cardId: null });
    expect(t.method).toBe('pix');
  });
});

describe('transactionToCreateWire', () => {
  it('maps method="pix" to { method: "PIX" } without cardId', () => {
    const w = transactionToCreateWire({
      id: '',
      date: '2026-05-10',
      label: 'Pix',
      value: 50,
      cat: 'mercado',
      holder: 'shared',
      method: 'pix',
      installments: null,
    } as Transaction);
    expect(w).toMatchObject({ categorySlug: 'mercado', holder: 'shared', method: 'PIX' });
    expect(w.cardId).toBeUndefined();
  });

  it('maps a card method to { method: "CARD", cardId }', () => {
    const w = transactionToCreateWire({
      id: '',
      date: '2026-05-10',
      label: 'Tênis',
      value: 300,
      cat: 'lazer',
      holder: 'Mateus',
      method: 'card-db-1',
      installments: { n: 1, of: 3 },
    } as Transaction);
    expect(w).toMatchObject({ method: 'CARD', cardId: 'card-db-1', installments: { n: 1, of: 3 } });
  });
});
