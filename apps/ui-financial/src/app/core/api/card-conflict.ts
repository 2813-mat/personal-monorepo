import { HttpErrorResponse } from '@angular/common/http';

const plural = (n: number, um: string, muitos: string) => `${n} ${n === 1 ? um : muitos}`;

/**
 * O backend devolve as contagens no corpo do 409 justamente para a UI poder
 * explicar e oferecer arquivar. Um "Falha ao excluir" genérico jogaria fora a
 * informação que torna o próximo passo óbvio.
 */
export function cardConflictMessage(err: HttpErrorResponse): string {
  const body = err.error as { transactions?: number; invoices?: number } | null;
  if (err.status !== 409 || !body) return 'Falha ao excluir cartão';
  const partes: string[] = [];
  if (body.transactions) partes.push(plural(body.transactions, 'lançamento', 'lançamentos'));
  if (body.invoices) partes.push(plural(body.invoices, 'fatura', 'faturas'));
  if (partes.length === 0) return 'Falha ao excluir cartão';
  return `Não dá para excluir: ${partes.join(' e ')} usam este cartão.`;
}
