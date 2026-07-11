import { CreateIncomeUseCase } from './create-income.usecase';
import { Income } from '../domain/income.entity';

describe('CreateIncomeUseCase', () => {
  it('cria income via repositório', async () => {
    const repo = {
      create: jest.fn(async (d) => new Income({ id: 'i1', ...d })),
      findAll: jest.fn(),
    };
    const uc = new CreateIncomeUseCase(repo as any);
    const res = await uc.execute({
      label: 'Salário',
      holder: 'Thais',
      value: 5000,
      date: '2026-05-05',
      recurring: true,
    });
    expect(repo.create).toHaveBeenCalled();
    expect(res.toJSON().label).toBe('Salário');
    expect(res.toJSON().holder).toBe('Thais');
  });
});
