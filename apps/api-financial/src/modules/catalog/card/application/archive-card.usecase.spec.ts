import { NotFoundException } from '@nestjs/common';
import { ArchiveCardUseCase } from './archive-card.usecase';

describe('ArchiveCardUseCase', () => {
  it('arquiva e devolve o cartão', async () => {
    const card = { id: 'c1' };
    const repo = { setArchived: jest.fn(async () => card) };
    const uc = new ArchiveCardUseCase(repo as never);
    await expect(uc.execute('c1', true)).resolves.toBe(card);
    expect(repo.setArchived).toHaveBeenCalledWith('c1', true);
  });

  it('desarquiva quando archived é false', async () => {
    const repo = { setArchived: jest.fn(async () => ({ id: 'c1' })) };
    const uc = new ArchiveCardUseCase(repo as never);
    await uc.execute('c1', false);
    expect(repo.setArchived).toHaveBeenCalledWith('c1', false);
  });

  it('404 quando o cartão não existe', async () => {
    const repo = { setArchived: jest.fn(async () => null) };
    const uc = new ArchiveCardUseCase(repo as never);
    await expect(uc.execute('sumiu', true)).rejects.toBeInstanceOf(NotFoundException);
  });
});
