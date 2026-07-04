import { InvoiceHistory as PrismaInvoiceHistory } from '@prisma/client';
import { InvoiceHistoryView } from '../domain/invoice-history.repository';

export const toView = (r: PrismaInvoiceHistory): InvoiceHistoryView => ({
  id: r.id,
  cardId: r.cardId,
  year: r.year,
  month: r.month,
  closingDate: r.closingDate.toISOString().slice(0, 10),
  dueDate: r.dueDate.toISOString().slice(0, 10),
  total: Number(r.total),
  perCategory: (r.perCategory as Record<string, number>) ?? {},
  status: r.status,
});
