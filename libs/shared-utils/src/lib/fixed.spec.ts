import type { FixedExpense, Transaction } from '@caixa-familia/shared-types';
import {
  committedTotal,
  dueDateIso,
  monthRows,
  pendingFixed,
  spendByCategory,
} from './fixed';

const fixo = (over: Partial<FixedExpense> = {}): FixedExpense => ({
  id: 'f1',
  label: 'Aluguel',
  value: 1200,
  due: 5,
  cat: 'casa',
  holder: 'shared',
  startDate: '2026-01-01',
  ...over,
});

const tx = (over: Partial<Transaction> = {}): Transaction => ({
  id: 't1',
  date: '2026-08-03',
  label: 'Mercado',
  value: 300,
  cat: 'mercado',
  holder: 'Mateus',
  method: 'pix',
  installments: null,
  reviewed: false,
  ...over,
});

describe('pendingFixed', () => {
  it('mantém só os sem data de pagamento', () => {
    const pendentes = pendingFixed([
      fixo({ id: 'f1' }),
      fixo({ id: 'f2', paidAt: '2026-08-06' }),
    ]);
    expect(pendentes.map((f) => f.id)).toEqual(['f1']);
  });

  it('não confunde valor pago zero com pendente', () => {
    const pagos = pendingFixed([fixo({ paidAt: '2026-08-06', paidValue: 0 })]);
    expect(pagos).toEqual([]);
  });
});

describe('committedTotal', () => {
  it('soma lançamentos e fixos pendentes', () => {
    expect(committedTotal([tx({ value: 300 })], [fixo({ value: 1200 })])).toBe(1500);
  });

  it('não conta o fixo pago duas vezes', () => {
    // A transação de 1200 É o pagamento do aluguel; ele sai dos pendentes, então
    // o total tem de ficar em 1500 e não em 2700.
    const fixos = [fixo({ value: 1200, paidAt: '2026-08-06' }), fixo({ id: 'f2', value: 300 })];
    const txs = [tx({ value: 1200, cat: 'casa' })];
    expect(committedTotal(txs, pendingFixed(fixos))).toBe(1500);
  });

  it('é zero sem lançamento e sem pendente', () => {
    expect(committedTotal([], [])).toBe(0);
  });
});

describe('spendByCategory', () => {
  it('soma o fixo pendente no balde da própria categoria', () => {
    const spend = spendByCategory(
      [tx({ value: 300, cat: 'mercado' })],
      [fixo({ value: 1200, cat: 'casa' })],
    );
    expect(spend).toEqual({ mercado: 300, casa: 1200 });
  });

  it('acumula lançamento e fixo que caem na mesma categoria', () => {
    const spend = spendByCategory(
      [tx({ value: 400, cat: 'casa' })],
      [fixo({ value: 1200, cat: 'casa' })],
    );
    expect(spend).toEqual({ casa: 1600 });
  });

  it('ignora categorias sem nada', () => {
    expect(spendByCategory([], [])).toEqual({});
  });
});

describe('dueDateIso', () => {
  it('materializa o dia de vencimento no mês pedido', () => {
    expect(dueDateIso(10, 2026, 8)).toBe('2026-08-10');
    expect(dueDateIso(5, 2026, 12)).toBe('2026-12-05');
  });

  it('trunca para o último dia em mês curto em vez de vazar', () => {
    // Um fixo do dia 31 vence em 28/02, não em 03/03.
    expect(dueDateIso(31, 2026, 2)).toBe('2026-02-28');
    expect(dueDateIso(31, 2024, 2)).toBe('2024-02-29');
    expect(dueDateIso(31, 2026, 4)).toBe('2026-04-30');
  });
});

describe('monthRows', () => {
  const ctx = { year: 2026, month: 8 };

  it('põe os pendentes primeiro, do vencimento mais próximo ao mais distante', () => {
    const rows = monthRows(
      [tx({ id: 't1', date: '2026-08-07' })],
      [fixo({ id: 'f-late', due: 25 }), fixo({ id: 'f-soon', due: 10 })],
      ctx,
    );
    expect(rows.map((r) => r.id)).toEqual(['f-soon', 'f-late', 't1']);
  });

  it('ordena os realizados do mais recente ao mais antigo', () => {
    const rows = monthRows(
      [tx({ id: 't-velho', date: '2026-08-02' }), tx({ id: 't-novo', date: '2026-08-09' })],
      [],
      ctx,
    );
    expect(rows.map((r) => r.id)).toEqual(['t-novo', 't-velho']);
  });

  it('datar o pendente pelo vencimento no mês visto, não pela data do cadastro', () => {
    const [row] = monthRows([], [fixo({ due: 10 })], ctx);
    expect(row.date).toBe('2026-08-10');
  });

  it('marca cada linha com a origem e carrega o objeto original', () => {
    const rows = monthRows([tx({ id: 't1' })], [fixo({ id: 'f1' })], ctx);
    const pendente = rows[0];
    const realizado = rows[1];
    expect(pendente.kind).toBe('fixed');
    expect(realizado.kind).toBe('tx');
    // O método de pagamento só existe do lado da transação; a tabela precisa dele.
    if (realizado.kind === 'tx') expect(realizado.tx.method).toBe('pix');
    if (pendente.kind === 'fixed') expect(pendente.fixed.due).toBe(5);
  });

  it('não inclui fixo já pago — quem filtra é o pendingFixed', () => {
    const fixos = [fixo({ id: 'f-pago', paidAt: '2026-08-06' }), fixo({ id: 'f-aberto' })];
    const rows = monthRows([], pendingFixed(fixos), ctx);
    expect(rows.map((r) => r.id)).toEqual(['f-aberto']);
  });

  it('devolve lista vazia sem nada no mês', () => {
    expect(monthRows([], [], ctx)).toEqual([]);
  });
});
