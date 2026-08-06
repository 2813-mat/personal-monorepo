import { BadRequestException } from '@nestjs/common';
import { ReorderCategoriesUseCase } from './reorder-categories.usecase';
import { Category } from '../domain/category.entity';

const make = (slug: string, order: number) =>
  new Category({ id: slug, slug, label: slug, color: '#000000', budget: 0, order });

function setup() {
  const all = [make('casa', 1), make('lazer', 2), make('saude', 3)];
  const repo = { findAll: jest.fn(async () => all), reorder: jest.fn(async () => all) };
  return { uc: new ReorderCategoriesUseCase(repo as never), repo };
}

describe('ReorderCategoriesUseCase', () => {
  it('aplica a ordem quando a lista bate exatamente', async () => {
    const { uc, repo } = setup();
    await uc.execute(['saude', 'casa', 'lazer']);
    expect(repo.reorder).toHaveBeenCalledWith(['saude', 'casa', 'lazer']);
  });

  it('rejeita lista faltando uma categoria', async () => {
    const { uc, repo } = setup();
    await expect(uc.execute(['casa', 'lazer'])).rejects.toThrow(BadRequestException);
    expect(repo.reorder).not.toHaveBeenCalled();
  });

  it('rejeita lista com slug desconhecido', async () => {
    const { uc, repo } = setup();
    await expect(uc.execute(['casa', 'lazer', 'saude', 'zzz'])).rejects.toThrow(
      BadRequestException,
    );
    expect(repo.reorder).not.toHaveBeenCalled();
  });

  it('rejeita lista com slug repetido', async () => {
    // mesmo comprimento do conjunto, mas gravaria ordem inconsistente se passasse
    const { uc, repo } = setup();
    await expect(uc.execute(['casa', 'casa', 'lazer'])).rejects.toThrow(BadRequestException);
    expect(repo.reorder).not.toHaveBeenCalled();
  });
});
