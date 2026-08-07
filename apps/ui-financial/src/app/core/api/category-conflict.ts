import { HttpErrorResponse } from '@angular/common/http';

const plural = (n: number, um: string, muitos: string) => `${n} ${n === 1 ? um : muitos}`;

/**
 * O backend devolve as contagens no corpo do 409 justamente para a UI poder
 * explicar. Um "Falha ao excluir" genérico jogaria essa informação fora.
 */
export function categoryConflictMessage(err: HttpErrorResponse): string {
  const body = err.error as { transactions?: number; fixedExpenses?: number } | null;
  if (err.status !== 409 || !body) return 'Falha ao excluir categoria';
  const partes: string[] = [];
  if (body.transactions) partes.push(plural(body.transactions, 'lançamento', 'lançamentos'));
  if (body.fixedExpenses) partes.push(plural(body.fixedExpenses, 'gasto fixo', 'gastos fixos'));
  if (partes.length === 0) return 'Falha ao excluir categoria';
  return `Não dá para excluir: ${partes.join(' e ')} usam esta categoria.`;
}
