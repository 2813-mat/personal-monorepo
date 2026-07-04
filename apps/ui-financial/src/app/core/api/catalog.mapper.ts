import type { Category } from '@caixa-familia/shared-types';
import type { CategoryWire } from './wire.types';

export function wireToCategory(w: CategoryWire): Category {
  return { id: w.slug, label: w.label, color: w.color, budget: w.budget };
}
