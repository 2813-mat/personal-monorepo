import type { Card } from '@caixa-familia/shared-types';

export interface CardViewInput {
  id: string;
  name: string;
  bank: string;
  color: string;
  closingDay: number;
  dueDay: number;
  creditLimit: number;
  last4: string;
  current: number;
  holder?: string | null;
}

export const toCardView = (c: CardViewInput): Card => ({
  id: c.id,
  name: c.name,
  holder: (c.holder ?? 'shared') as Card['holder'],
  bank: c.bank,
  color: c.color,
  closing: c.closingDay,
  due: c.dueDay,
  current: c.current,
  limit: c.creditLimit,
  last4: c.last4,
});
