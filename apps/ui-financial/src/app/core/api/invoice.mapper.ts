import type { InvoiceHistoryWire } from './wire.types';

/** Fatura fechada, na forma que o painel de histórico consome. */
export interface InvoiceHistoryEntry {
  year: number;
  month: number;
  total: number;
  perCategory: Record<string, number>;
}

export function wireToInvoiceHistory(w: InvoiceHistoryWire): InvoiceHistoryEntry {
  return {
    year: w.year,
    month: w.month,
    total: w.total,
    perCategory: w.perCategory ?? {},
  };
}
