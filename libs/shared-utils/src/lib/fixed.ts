import type {
  FixedExpense,
  Holder,
  Id,
  IsoDate,
  MonthContext,
  Transaction,
} from '@caixa-familia/shared-types';

/**
 * Gastos fixos que ainda não foram pagos no mês consultado.
 *
 * A distinção importa porque o fixo **pago já é uma transação**: pagar cria um
 * lançamento que aponta de volta para o fixo. Somar o cadastro inteiro aos
 * lançamentos contaria o pago duas vezes.
 */
export function pendingFixed(fixed: FixedExpense[]): FixedExpense[] {
  return fixed.filter((f) => !f.paidAt);
}

/**
 * O comprometido do mês: o que já saiu da conta mais o que ainda vai sair.
 *
 * `pending` precisa vir de `pendingFixed`, e ambos os argumentos já filtrados
 * pelo titular quando houver filtro — misturar um lado filtrado com o outro
 * inteiro produz um número que não descreve ninguém.
 */
export function committedTotal(txs: Transaction[], pending: FixedExpense[]): number {
  return (
    txs.reduce((s, t) => s + t.value, 0) + pending.reduce((s, f) => s + f.value, 0)
  );
}

/**
 * Gasto por categoria somando lançamentos e fixos pendentes no mesmo balde. O
 * fixo entra pela categoria do seu próprio cadastro.
 */
export function spendByCategory(
  txs: Transaction[],
  pending: FixedExpense[],
): Record<string, number> {
  const spend: Record<string, number> = {};
  for (const t of txs) {
    spend[t.cat] = (spend[t.cat] ?? 0) + t.value;
  }
  for (const f of pending) {
    spend[f.cat] = (spend[f.cat] ?? 0) + f.value;
  }
  return spend;
}

/**
 * Data de vencimento do fixo no mês visto. Um fixo do dia 31 vence no dia 28 em
 * fevereiro em vez de vazar para março.
 *
 * A montagem é por string, e não por `Date`, porque o resto do app trata datas
 * como civis: passar por `Date` e voltar reintroduz o deslocamento de fuso.
 */
export function dueDateIso(dueDay: number, year: number, month: number): IsoDate {
  const lastDay = new Date(year, month, 0).getDate();
  const day = Math.min(dueDay, lastDay);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Uma linha da lista do mês: ou um lançamento que já aconteceu, ou um gasto fixo
 * que ainda vai vencer. O objeto de origem viaja dentro para a tabela poder
 * mostrar o que só existe num dos dois lados (método de pagamento, parcela).
 */
export type MonthRow =
  | { kind: 'tx'; id: Id; date: IsoDate; value: number; cat: Id; holder: Holder; tx: Transaction }
  | { kind: 'fixed'; id: Id; date: IsoDate; value: number; cat: Id; holder: Holder; fixed: FixedExpense };

/**
 * Lançamentos do mês e fixos pendentes na mesma lista.
 *
 * A ordem é deliberadamente em dois grupos: primeiro o que ainda vai sair, do
 * vencimento mais próximo ao mais distante, e depois o que já saiu, do mais
 * recente ao mais antigo. Uma ordem cronológica única jogaria a conta que vence
 * dia 25 acima do gasto de ontem, e a lista deixaria de responder "o que falta
 * pagar" — que é a pergunta que o pendente existe para responder.
 */
export function monthRows(
  txs: Transaction[],
  pending: FixedExpense[],
  ctx: MonthContext,
): MonthRow[] {
  const aPagar: MonthRow[] = pending
    .map((fixed) => ({
      kind: 'fixed' as const,
      id: fixed.id,
      date: dueDateIso(fixed.due, ctx.year, ctx.month),
      value: fixed.value,
      cat: fixed.cat,
      holder: fixed.holder,
      fixed,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const realizados: MonthRow[] = txs
    .map((tx) => ({
      kind: 'tx' as const,
      id: tx.id,
      date: tx.date,
      value: tx.value,
      cat: tx.cat,
      holder: tx.holder,
      tx,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));

  return [...aPagar, ...realizados];
}
