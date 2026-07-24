import type { Holder } from '@caixa-familia/shared-types';
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
  holder: Holder;
  installments: { n: number; of: number } | null;
}

/**
 * Agrupa a lista achatada do endpoint em lote por cartão, mantendo cada série
 * cronológica. Cartão sem fatura fechada simplesmente não aparece no mapa.
 */
export function groupInvoiceHistoryByCard(
  rows: InvoiceHistoryWire[],
): Record<string, InvoiceHistoryEntry[]> {
  const out: Record<string, InvoiceHistoryEntry[]> = {};
  for (const r of rows) {
    (out[r.cardId] ??= []).push(wireToInvoiceHistory(r));
  }
  for (const cardId of Object.keys(out)) {
    out[cardId].sort((a, b) => a.year - b.year || a.month - b.month);
  }
  return out;
}

/**
 * Fatura aberta na forma que a tela consome. `year`/`month` são as coordenadas
 * do **fechamento** do ciclo — é o que o endpoint de fechar espera, e **não** o
 * mês navegado na topbar.
 */
export interface OpenInvoiceState {
  total: number;
  items: OpenInvoiceItem[];
  closingDate: string;
  year: number;
  month: number;
}

export function wireToOpenInvoiceItem(w: OpenInvoiceItemWire): OpenInvoiceItem {
  return {
    id: w.id,
    date: w.date,
    label: w.label,
    value: w.value,
    cat: w.categorySlug,
    holder: w.holder as Holder,
    installments: w.installments,
  };
}
