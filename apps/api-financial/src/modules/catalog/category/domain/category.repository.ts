import { Category } from './category.entity';

export interface CreateCategoryData {
  slug: string;
  label: string;
  color: string;
  budget: number;
}

export interface UpdateCategoryData {
  label?: string;
  color?: string;
  budget?: number;
}

export interface CategoryUsage {
  transactions: number;
  fixedExpenses: number;
}

export abstract class CategoryRepository {
  abstract findAll(): Promise<Category[]>;
  abstract create(data: CreateCategoryData): Promise<Category>;
  /** `null` quando a categoria não existe neste household. */
  abstract update(slug: string, data: UpdateCategoryData): Promise<Category | null>;
  /** `null` quando a categoria não existe neste household. */
  abstract countUsage(slug: string): Promise<CategoryUsage | null>;
  /** `false` quando a categoria não existe neste household. */
  abstract remove(slug: string): Promise<boolean>;
  abstract reorder(slugs: string[]): Promise<Category[]>;
}
