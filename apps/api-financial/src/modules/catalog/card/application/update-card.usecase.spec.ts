import { NotFoundException } from '@nestjs/common';
import { UpdateCardUseCase } from './update-card.usecase';

describe('UpdateCardUseCase', () => {
  it('devolve o cartão atualizado', async () => {
    const card = { id: 'c1' };
    const repo = { update: jest.fn(async () => card) };
    const uc = new UpdateCardUseCase(repo as never);
    await expect(uc.execute('c1', { creditLimit: 6000 })).resolves.toBe(card);
  });

  it('404 quando o cartão não existe', async () => {
    const repo = { update: jest.fn(async () => null) };
    const uc = new UpdateCardUseCase(repo as never);
    await expect(uc.execute('sumiu', { creditLimit: 1 })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
