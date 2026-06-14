import { Category as PrismaCategory } from '@prisma/client';
import { Category } from '../domain/category.entity';

export const toDomain = (r: PrismaCategory): Category =>
  new Category({ id: r.id, slug: r.slug, label: r.label, color: r.color, budget: Number(r.budget) });
