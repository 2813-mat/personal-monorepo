import type { Category } from '@caixa-familia/shared-types';
import type { CategoryWire, CreateCategoryWire, UpdateCategoryWire } from './wire.types';

export function wireToCategory(w: CategoryWire): Category {
  return { id: w.slug, label: w.label, color: w.color, budget: w.budget, order: w.order };
}

export function categoryToCreateWire(c: Category): CreateCategoryWire {
  return { slug: c.id, label: c.label, color: c.color, budget: c.budget };
}

/** `slug` fica de fora de propósito: é a chave de URL, não é editável. */
export function categoryToUpdateWire(c: Category): UpdateCategoryWire {
  return { label: c.label, color: c.color, budget: c.budget };
}
