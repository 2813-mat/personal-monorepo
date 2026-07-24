import type { Category } from '@caixa-familia/shared-types';
import type { CategoryWire, CreateCategoryWire } from './wire.types';

export function wireToCategory(w: CategoryWire): Category {
  return { id: w.slug, label: w.label, color: w.color, budget: w.budget };
}

export function categoryToCreateWire(c: Category): CreateCategoryWire {
  return { slug: c.id, label: c.label, color: c.color, budget: c.budget };
}
