import type { Card } from '@caixa-familia/shared-types';
import type { CreateCardWire, UpdateCardWire } from './wire.types';

/** Cartão ainda sem identidade: `id`, `current` e `archived` vêm do servidor. */
export type NewCard = Omit<Card, 'id' | 'current' | 'archived'>;

/**
 * A leitura não tem mapper: `card.view.ts` da API já devolve o formato de
 * domínio. Só a escrita precisa traduzir closing/due/limit para os nomes que o
 * DTO espera.
 */
export function cardToCreateWire(c: NewCard): CreateCardWire {
  return {
    name: c.name,
    bank: c.bank,
    color: c.color,
    closingDay: c.closing,
    dueDay: c.due,
    creditLimit: c.limit,
    last4: c.last4,
    holder: c.holder,
  };
}

export function cardToUpdateWire(c: Card): UpdateCardWire {
  return cardToCreateWire(c);
}
