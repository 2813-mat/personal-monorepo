import { CreateCategoryUseCase } from './create-category.usecase';
import { Category } from '../domain/category.entity';

describe('CreateCategoryUseCase', () => {
  it('cria categoria via repositório', async () => {
    const repo = {
      create: jest.fn(async (d) => new Category({ id: 'c1', ...d })),
      findAll: jest.fn(),
    };
    const uc = new CreateCategoryUseCase(repo as any);
    const res = await uc.execute({ slug: 'mercado', label: 'Mercado', color: '#000', budget: 100 });
    expect(repo.create).toHaveBeenCalled();
    expect(res.toJSON().slug).toBe('mercado');
  });

  it('propaga erro de budget negativo', async () => {
    const repo = { create: jest.fn(async (d) => new Category({ id: 'c1', ...d })), findAll: jest.fn() };
    const uc = new CreateCategoryUseCase(repo as any);
    await expect(uc.execute({ slug: 's', label: 'L', color: '#000', budget: -1 })).rejects.toThrow();
  });
});
