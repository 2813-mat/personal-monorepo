import type { Goal } from '@caixa-familia/shared-types';
import type { GoalWire, UpdateGoalWire } from './wire.types';

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

/** `balance` e `history` ficam de fora: derivam das contribuições, não são editáveis. */
export function goalToUpdateWire(g: Goal): UpdateGoalWire {
  return {
    label: g.label,
    target: g.target,
    monthly: g.monthly,
    color: g.color,
    subtitle: g.subtitle,
    type: g.type.toUpperCase() as 'SONHO' | 'EMERGENCIA',
  };
}
