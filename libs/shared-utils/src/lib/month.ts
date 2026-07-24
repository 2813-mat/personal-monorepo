import type { MonthContext } from '@caixa-familia/shared-types';

const MONTH_ABBR = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

/** Contexto de mês do app: as coordenadas mais os dois rótulos que a UI exibe. */
export type MonthView = MonthContext & { label: string; short: string };

/** `2026, 5` → `'Mai/26'`. */
export function monthShort(year: number, month: number): string {
  return `${MONTH_ABBR[month - 1]}/${String(year).slice(2)}`;
}

/** `2026, 5` → `'Maio 2026'`. */
export function monthLabelLong(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

/**
 * Contexto de mês a partir de uma data. Os meses de `Date` são zero-based; o
 * app trabalha com 1..12.
 *
 * A formatação é feita à mão, e não por `toLocaleDateString`, porque a saída do
 * ICU varia por ambiente (`'mai. de 26'` em alguns) e o app precisa de um
 * formato estável entre o valor inicial e a navegação.
 */
export function monthContextOf(date: Date = new Date()): MonthView {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  return { year, month, label: monthLabelLong(year, month), short: monthShort(year, month) };
}
