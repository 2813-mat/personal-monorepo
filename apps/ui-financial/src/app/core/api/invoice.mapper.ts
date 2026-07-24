import type { InvoiceHistoryWire, OpenInvoiceItemWire } from './wire.types';

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

/**
 * Compra da fatura aberta. Não é uma transação completa — sem `method`,
 * `recurring`, `cardId` ou `note` —, mas usa os mesmos nomes de campo do
 * domínio para a tela consumir sem tradução.
 */
export interface OpenInvoiceItem {
  id: string;
  date: string;
  label: string;
  value: number;
  cat: string;
  holder: string;
  installments: { n: number; of: number } | null;
}

export function wireToOpenInvoiceItem(w: OpenInvoiceItemWire): OpenInvoiceItem {
  return {
    id: w.id,
    date: w.date,
    label: w.label,
    value: w.value,
    cat: w.categorySlug,
    holder: w.holder,
    installments: w.installments,
  };
}
