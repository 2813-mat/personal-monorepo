import { toCardView, CardViewInput } from './card.view';

const input: CardViewInput = {
  id: 'c1',
  name: 'Nubank',
  bank: 'Nubank',
  color: '#820ad1',
  closingDay: 3,
  dueDay: 10,
  creditLimit: 5000,
  last4: '1234',
  current: 250,
  holder: 'Mateus',
};

describe('toCardView', () => {
  it('maps to the shared-types Card shape', () => {
    expect(toCardView(input)).toEqual({
      id: 'c1',
      name: 'Nubank',
      holder: 'Mateus',
      bank: 'Nubank',
      color: '#820ad1',
      closing: 3,
      due: 10,
      current: 250,
      limit: 5000,
      last4: '1234',
    });
  });

  it('defaults holder to "shared" when absent', () => {
    expect(toCardView({ ...input, holder: null }).holder).toBe('shared');
  });
});
