import { Injectable, NotFoundException } from '@nestjs/common';
import { CategoryRepository, UpdateCategoryData } from '../domain/category.repository';

@Injectable()
export class UpdateCategoryUseCase {
  constructor(private readonly repo: CategoryRepository) {}

  async execute(slug: string, data: UpdateCategoryData) {
    const updated = await this.repo.update(slug, data);
    if (!updated) throw new NotFoundException(`Categoria ${slug} não encontrada`);
    return updated;
  }
}
