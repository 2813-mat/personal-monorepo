import type { Goal } from '@caixa-familia/shared-types';
import type { CreateGoalWire, GoalWire, UpdateGoalWire } from './wire.types';

/** O que o usuário preenche: o resto do `Goal` nasce no servidor. */
export type NewGoal = Omit<Goal, 'id' | 'balance' | 'history' | 'contributionCount'>;

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
    contributionCount: w.contributionCount,
  };
}

/** `slug` fica de fora: a API o deriva do label. */
export function goalToCreateWire(g: NewGoal): CreateGoalWire {
  return {
    label: g.label,
    subtitle: g.subtitle,
    target: g.target,
    monthly: g.monthly,
    color: g.color,
    type: g.type.toUpperCase() as 'SONHO' | 'EMERGENCIA',
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
