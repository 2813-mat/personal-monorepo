import { NotFoundException } from '@nestjs/common';
import { UpdateCategoryUseCase } from './update-category.usecase';
import { Category } from '../domain/category.entity';

const cat = new Category({
  id: 'c1',
  slug: 'casa',
  label: 'Casa',
  color: '#7A4F1D',
  budget: 500,
  order: 1,
});

function setup(result: Category | null) {
  const repo = { update: jest.fn(async () => result) };
  return { uc: new UpdateCategoryUseCase(repo as never), repo };
}

describe('UpdateCategoryUseCase', () => {
  it('devolve a categoria atualizada', async () => {
    const { uc } = setup(cat);
    await expect(uc.execute('casa', { budget: 600 })).resolves.toBe(cat);
  });

  it('repassa slug e dados ao repositório', async () => {
    const { uc, repo } = setup(cat);
    await uc.execute('casa', { budget: 600 });
    expect(repo.update).toHaveBeenCalledWith('casa', { budget: 600 });
  });

  it('lança 404 quando a categoria não existe', async () => {
    const { uc } = setup(null);
    await expect(uc.execute('nada', { budget: 1 })).rejects.toThrow(NotFoundException);
  });
});
