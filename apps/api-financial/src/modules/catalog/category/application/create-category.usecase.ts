import { Injectable } from '@nestjs/common';
import { CategoryRepository, CreateCategoryData } from '../domain/category.repository';

@Injectable()
export class CreateCategoryUseCase {
  constructor(private readonly repo: CategoryRepository) {}
  execute(data: CreateCategoryData) {
    return this.repo.create(data);
  }
}
