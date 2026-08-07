import { CreateCardUseCase } from './create-card.usecase';

describe('CreateCardUseCase', () => {
  it('delega para o repositório e devolve o cartão criado', async () => {
    const card = { id: 'c1' };
    const repo = { create: jest.fn(async () => card) };
    const uc = new CreateCardUseCase(repo as never);
    const data = {
      name: 'Nubank',
      bank: 'Nubank',
      color: '#820AD1',
      closingDay: 5,
      dueDay: 12,
      creditLimit: 4500,
      last4: '4421',
      holder: 'Thais',
    };
    await expect(uc.execute(data)).resolves.toBe(card);
    expect(repo.create).toHaveBeenCalledWith(data);
  });
});
