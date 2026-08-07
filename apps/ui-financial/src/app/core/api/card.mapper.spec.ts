import { cardToCreateWire, cardToUpdateWire } from './card.mapper';
import type { Card } from '@caixa-familia/shared-types';

const CARD: Card = {
  id: 'c1',
  name: 'Nubank',
  holder: 'Thais',
  bank: 'Nubank',
  color: '#820AD1',
  closing: 5,
  due: 12,
  current: 1895,
  limit: 4500,
  last4: '4421',
  archived: false,
};

describe('cardToCreateWire', () => {
  it('traduz closing/due/limit para os nomes do wire', () => {
    const { id: _id, current: _current, archived: _archived, ...novo } = CARD;
    expect(cardToCreateWire(novo)).toEqual({
      name: 'Nubank',
      bank: 'Nubank',
      color: '#820AD1',
      closingDay: 5,
      dueDay: 12,
      creditLimit: 4500,
      last4: '4421',
      holder: 'Thais',
    });
  });
});

describe('cardToUpdateWire', () => {
  it('manda os oito campos editáveis', () => {
    expect(cardToUpdateWire(CARD)).toEqual({
      name: 'Nubank',
      bank: 'Nubank',
      color: '#820AD1',
      closingDay: 5,
      dueDay: 12,
      creditLimit: 4500,
      last4: '4421',
      holder: 'Thais',
    });
  });

  it('não manda id, current nem archived — nenhum é editável', () => {
    const wire = cardToUpdateWire(CARD);
    expect(wire).not.toHaveProperty('id');
    expect(wire).not.toHaveProperty('current');
    expect(wire).not.toHaveProperty('archived');
  });
});
