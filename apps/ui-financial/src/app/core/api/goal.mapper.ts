import type { Goal } from '@caixa-familia/shared-types';
import type { GoalWire } from './wire.types';

export function wireToGoal(w: GoalWire): Goal {
  return {
    id: w.slug,
    label: w.label,
    target: w.target,
    balance: w.balance,
    monthly: w.monthly,
    color: w.color,
    subtitle: w.subtitle,
    type: w.type.toLowerCase() as Goal['type'],
    history: w.history,
  };
}
