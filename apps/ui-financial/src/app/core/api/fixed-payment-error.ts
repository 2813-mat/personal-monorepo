import { HttpErrorResponse } from '@angular/common/http';

/**
 * O 409 ("já tem pagamento lançado") e o 422 ("só passa a ser devido em") dizem
 * na mensagem exatamente o que corrigir. Um "Falha ao lançar" genérico jogaria
 * fora a única informação útil da resposta.
 */
export function fixedPaymentErrorMessage(err: HttpErrorResponse): string {
  const body = err.error as { message?: string | string[] } | null;
  const message = Array.isArray(body?.message) ? body?.message[0] : body?.message;
  if ((err.status === 409 || err.status === 422) && message) return message;
  return 'Falha ao lançar o pagamento';
}
