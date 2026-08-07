import { BadRequestException, Injectable } from '@nestjs/common';
import { CategoryRepository } from '../domain/category.repository';

@Injectable()
export class ReorderCategoriesUseCase {
  constructor(private readonly repo: CategoryRepository) {}

  async execute(slugs: string[]) {
    const current = (await this.repo.findAll()).map((c) => c.toJSON().slug);
    const unique = new Set(slugs);
    // Repetido, faltando ou desconhecido: qualquer um gravaria ordem parcial.
    const matches =
      unique.size === slugs.length &&
      slugs.length === current.length &&
      current.every((s) => unique.has(s));
    if (!matches) {
      throw new BadRequestException(
        'A lista deve conter exatamente todas as categorias, sem repetição',
      );
    }
    return this.repo.reorder(slugs);
  }
}
