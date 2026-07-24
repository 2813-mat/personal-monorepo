export interface InvoiceHistoryView {
  id: string;
  cardId: string;
  year: number;
  month: number;
  closingDate: string;
  dueDate: string;
  total: number;
  perCategory: Record<string, number>;
  status: 'CLOSED' | 'PAID';
}

export abstract class InvoiceHistoryRepository {
  abstract findByCard(cardId: string): Promise<InvoiceHistoryView[]>;
  /** Todas as faturas fechadas do household — alimenta a tabela de cartões. */
  abstract findAll(): Promise<InvoiceHistoryView[]>;
  abstract closeInvoice(cardId: string, year: number, month: number): Promise<InvoiceHistoryView>;
}
