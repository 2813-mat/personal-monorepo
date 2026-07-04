import { Category } from './category.entity';

export interface CreateCategoryData {
  slug: string;
  label: string;
  color: string;
  budget: number;
}

export abstract class CategoryRepository {
  abstract findAll(): Promise<Category[]>;
  abstract create(data: CreateCategoryData): Promise<Category>;
}
