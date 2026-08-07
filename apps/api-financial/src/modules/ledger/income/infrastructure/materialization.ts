/**
 * Aritmética da materialização das receitas recorrentes, separada do Prisma
 * para poder ser testada sem banco.
 */

/** Primeiro dia do mês, que é como `startDate` e `materializedThrough` moram. */
export function monthStart(year: number, month: number): Date {
  return new Date(year, month - 1, 1);
}

/**
 * Primeiro dia do mês de uma data ISO, lida como data civil.
 *
 * `new Date('2026-08-01')` é meia-noite UTC, e a leitura com getters locais
 * volta um dia — em São Paulo isso vira 31/07, e o template passaria a valer
 * um mês antes do pedido.
 */
export function monthStartOfIso(iso: string): Date {
  const [year, month] = iso.split('-').map(Number);
  return new Date(year, month - 1, 1);
}

/**
 * A data que a linha daquele mês recebe. Um salário do dia 31 cai no dia 28 em
 * fevereiro em vez de vazar para março.
 */
export function occurrenceDate(year: number, month: number, day: number): Date {
  const lastDay = new Date(year, month, 0).getDate();
  return new Date(year, month - 1, Math.min(day, lastDay));
}

/**
 * Os meses que faltam materializar para um template, do primeiro pendente até
 * o mês pedido, inclusive.
 *
 * `materializedThrough` é o último mês já gerado. Ele existe para que uma linha
 * apagada de propósito não volte na próxima listagem: o mês já foi materializado
 * uma vez e não entra de novo.
 *
 * Quem pula de agosto para dezembro materializa setembro, outubro e novembro no
 * caminho — o buraco apareceria como receita sumida ao voltar.
 */
export function pendingMonths(
  startDate: Date,
  materializedThrough: Date | null,
  target: { year: number; month: number },
  limit = 36,
): { year: number; month: number }[] {
  const targetStart = monthStart(target.year, target.month);

  // Retroceder para antes do início do template não gera nada.
  const firstPending = materializedThrough
    ? new Date(materializedThrough.getFullYear(), materializedThrough.getMonth() + 1, 1)
    : new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  if (targetStart < firstPending) return [];

  const out: { year: number; month: number }[] = [];
  const cursor = new Date(firstPending);
  // O teto evita que navegar dez anos para a frente gere cento e vinte linhas.
  while (cursor <= targetStart && out.length < limit) {
    out.push({ year: cursor.getFullYear(), month: cursor.getMonth() + 1 });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return out;
}
