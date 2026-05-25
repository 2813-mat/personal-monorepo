import type { Card, Installments } from '@caixa/shared-types';

export function daysUntilClosing(card: Card, ref: Date = new Date()): number {
  const closing = new Date(ref.getFullYear(), ref.getMonth(), card.closing);
  if (ref.getDate() > card.closing) {
    closing.setMonth(closing.getMonth() + 1);
  }
  const ms = closing.getTime() - ref.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function cardUtilization(card: Card): number {
  if (card.limit <= 0) return 0;
  return Math.min(card.current / card.limit, 1);
}

export function installmentProgress(inst: Installments | null): number {
  if (!inst) return 1;
  return inst.n / inst.of;
}

export function installmentsRemaining(inst: Installments | null): number {
  if (!inst) return 0;
  return Math.max(inst.of - inst.n, 0);
}
