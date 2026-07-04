import { ListCardsUseCase } from './list-cards.usecase';
import { Card } from '../domain/card.entity';

describe('ListCardsUseCase', () => {
  it('lista cartões via repositório', async () => {
    const card = new Card({
      id: 'nu-t',
      name: 'Nubank',
      bank: 'Nu',
      color: '#820ad1',
      closingDay: 5,
      dueDay: 12,
      creditLimit: 5000,
      last4: '1234',
      ownerMemberId: null,
      current: 250,
    });
    const repo = { findAll: jest.fn(async () => [card]), openInvoice: jest.fn() };
    const res = await new ListCardsUseCase(repo as any).execute();
    expect(repo.findAll).toHaveBeenCalled();
    expect(res[0].toJSON().current).toBe(250);
  });
});
