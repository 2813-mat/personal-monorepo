import { CreateGoalUseCase } from './create-goal.usecase';
import { CreateGoalData } from '../domain/goal.repository';

const DADOS: CreateGoalData = {
  label: 'Reserva de emergência',
  subtitle: '6 meses de despesas',
  target: 30000,
  monthly: 800,
  color: '#0B6E2F',
  type: 'EMERGENCIA',
};

describe('CreateGoalUseCase', () => {
  it('cria a meta via repositório', async () => {
    const repo = { create: jest.fn(async () => ({ slug: 'reserva-de-emergencia' })) };
    const uc = new CreateGoalUseCase(repo as any);
    await uc.execute(DADOS);
    expect(repo.create).toHaveBeenCalledWith(DADOS);
  });

  it('devolve a meta criada, com o slug que a infraestrutura escolheu', async () => {
    const criada = { slug: 'reserva-de-emergencia', balance: 0, contributionCount: 0 };
    const repo = { create: jest.fn(async () => criada) };
    const uc = new CreateGoalUseCase(repo as any);
    await expect(uc.execute(DADOS)).resolves.toBe(criada);
  });
});
