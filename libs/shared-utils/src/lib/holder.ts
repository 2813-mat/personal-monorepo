import type { Holder, HolderFilter } from '@caixa-familia/shared-types';

/**
 * Regra única do filtro de titular da topbar.
 *
 * O compartilhado aparece na visão de todo mundo: uma conta de casa é gasto do
 * Mateus e da Thais ao mesmo tempo, não de um terceiro. Isso vale para os dois
 * lados do saldo — receita e gasto — porque somar o aluguel aos gastos de quem
 * está filtrado sem somar a receita compartilhada afunda o saldo de propósito.
 */
export function matchesHolder(filter: HolderFilter, holder: Holder): boolean {
  return filter === 'todos' || holder === filter || holder === 'shared';
}
