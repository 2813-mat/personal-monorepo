import { Prisma } from '@prisma/client';
import { GoalView } from '../domain/goal.repository';

export type GoalRow = Prisma.GoalGetPayload<{ include: { contributions: true } }>;

const MONTHS = 12;

/**
 * Soma das contribuições por mês nos últimos 12 meses, do mais antigo (índice 0)
 * ao mês corrente (índice 11), relativo a `ref`.
 */
export function monthlyHistory(
  contributions: { amount: Prisma.Decimal; date: Date }[],
  ref: Date = new Date(),
): number[] {
  const buckets = new Array<number>(MONTHS).fill(0);
  const refY = ref.getFullYear();
  const refM = ref.getMonth();
  for (const c of contributions) {
    const diff = (refY - c.date.getFullYear()) * 12 + (refM - c.date.getMonth());
    if (diff >= 0 && diff < MONTHS) buckets[MONTHS - 1 - diff] += Number(c.amount);
  }
  return buckets;
}

export const toView = (g: GoalRow, ref: Date = new Date()): GoalView => ({
  id: g.id,
  slug: g.slug,
  label: g.label,
  target: Number(g.target),
  monthly: Number(g.monthly),
  color: g.color,
  subtitle: g.subtitle,
  type: g.type,
  balance: g.contributions.reduce((s, c) => s + Number(c.amount), 0),
  history: monthlyHistory(g.contributions, ref),
});
