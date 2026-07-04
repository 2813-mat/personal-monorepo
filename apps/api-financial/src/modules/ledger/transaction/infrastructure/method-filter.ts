import { PaymentMethod } from '@prisma/client';

/**
 * Normaliza o filtro `method` da query para o enum do banco. Aceita as formas
 * do frontend (`pix`/`card`) e maiúsculas; ignora valores inválidos.
 */
export function normalizeMethodFilter(method?: string): PaymentMethod | undefined {
  if (!method) return undefined;
  const m = method.toUpperCase();
  return m === 'PIX' || m === 'CARD' ? (m as PaymentMethod) : undefined;
}
