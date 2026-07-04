import { Injectable } from '@nestjs/common';
import { CategoryRepository } from '../domain/category.repository';

@Injectable()
export class ListCategoriesUseCase {
  constructor(private readonly repo: CategoryRepository) {}
  execute() {
    return this.repo.findAll();
  }
}
