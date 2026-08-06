import { NotFoundException } from '@nestjs/common';
import { UpdateGoalUseCase } from './update-goal.usecase';

const view = {
  id: 'g1',
  slug: 'sos',
  label: 'Reserva',
  target: 30000,
  monthly: 800,
  color: '#0B6E2F',
  subtitle: 'emergência',
  type: 'EMERGENCIA' as const,
  balance: 0,
  history: [],
};

function setup(result: typeof view | null) {
  const repo = { update: jest.fn(async () => result) };
  return { uc: new UpdateGoalUseCase(repo as never), repo };
}

describe('UpdateGoalUseCase', () => {
  it('devolve a meta atualizada', async () => {
    const { uc } = setup(view);
    await expect(uc.execute('sos', { label: 'Reserva' })).resolves.toMatchObject({ slug: 'sos' });
  });

  it('repassa slug e dados ao repositório', async () => {
    const { uc, repo } = setup(view);
    await uc.execute('sos', { monthly: 900 });
    expect(repo.update).toHaveBeenCalledWith('sos', { monthly: 900 });
  });

  it('lança 404 quando a meta não existe', async () => {
    const { uc } = setup(null);
    await expect(uc.execute('nao-existe', { label: 'x' })).rejects.toThrow(NotFoundException);
  });
});
