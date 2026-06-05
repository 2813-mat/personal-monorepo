export const MONTH_ABBR = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

export function fmtShort(v: number): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
