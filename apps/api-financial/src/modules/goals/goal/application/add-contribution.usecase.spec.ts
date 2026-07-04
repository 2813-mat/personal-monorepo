import { AddContributionUseCase } from './add-contribution.usecase';

describe('AddContributionUseCase', () => {
  it('adiciona contribuição via repositório', async () => {
    const repo = { addContribution: jest.fn(async () => undefined), findAll: jest.fn() };
    const uc = new AddContributionUseCase(repo as any);
    await uc.execute('g1', { amount: 100, date: '2026-05-22' });
    expect(repo.addContribution).toHaveBeenCalledWith('g1', { amount: 100, date: '2026-05-22' });
  });
});
