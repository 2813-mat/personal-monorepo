import { Card } from './card.entity';

export interface InvoiceItem {
  id: string;
  date: string;
  label: string;
  value: number;
  categorySlug: string;
  holder: string;
  installments: { n: number; of: number } | null;
}

export interface OpenInvoice {
  total: number;
  items: InvoiceItem[];
  /** Dia em que este ciclo fecha (ISO `YYYY-MM-DD`). */
  closingDate: string;
  /**
   * Coordenadas do **fechamento** do ciclo — o que `closeInvoice` espera.
   * Pode ser o mês seguinte ao corrente quando o dia de fechamento já passou.
   */
  year: number;
  month: number;
}

export interface CreateCardData {
  name: string;
  bank: string;
  color: string;
  closingDay: number;
  dueDay: number;
  creditLimit: number;
  last4: string;
  holder: string;
}

export interface UpdateCardData {
  name?: string;
  bank?: string;
  color?: string;
  closingDay?: number;
  dueDay?: number;
  creditLimit?: number;
  last4?: string;
  holder?: string;
}

export abstract class CardRepository {
  abstract findAll(): Promise<Card[]>;
  abstract openInvoice(cardId: string): Promise<OpenInvoice>;
  abstract create(data: CreateCardData): Promise<Card>;
  abstract update(id: string, data: UpdateCardData): Promise<Card | null>;
}
