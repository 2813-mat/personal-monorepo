import { Card } from './card.entity';

export interface InvoiceItem {
  id: string;
  date: string;
  label: string;
  value: number;
  categorySlug: string;
}

export interface OpenInvoice {
  total: number;
  items: InvoiceItem[];
}

export abstract class CardRepository {
  abstract findAll(): Promise<Card[]>;
  abstract openInvoice(cardId: string): Promise<OpenInvoice>;
}
