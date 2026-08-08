/**
 * Fronteiras de mês do gasto fixo, separadas do Prisma para poderem ser testadas
 * sem banco. A construção é a mesma usada pelos outros módulos que filtram por
 * mês, de propósito: divergir aqui faria o fixo discordar do extrato na virada.
 */

/** Primeiro dia do mês. `month` é 1..12, e 13 rola para janeiro do ano seguinte. */
export function monthStart(year: number, month: number): Date {
  return new Date(year, month - 1, 1);
}

/**
 * `'2026-08-06'` → `'2026-08'`.
 *
 * Comparar competência por string evita a aritmética de fuso: `new Date` de um
 * ISO é meia-noite UTC, e lê-lo com getters locais volta um dia em São Paulo.
 * Como `yyyy-mm` ordena lexicograficamente igual a cronologicamente, `<` basta.
 */
export function isoMonth(iso: string): string {
  return iso.slice(0, 7);
}

/** Ano e mês (1..12) de um ISO `yyyy-mm-dd`, sem passar por `Date`. */
export function isoYearMonth(iso: string): { year: number; month: number } {
  const [year, month] = iso.split('-').map(Number);
  return { year, month };
}
