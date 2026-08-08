/**
 * Os dashboards A e B passaram a somar os gastos fixos pendentes ao gasto do mês.
 * O furo que deixou isso passar despercebido foi o mock: `holder-filter.spec` e
 * `dashboard-panels.spec` ambos usam `fixed: signal([])`, então nenhum deles
 * exercita a regra. Aqui o mock tem fixo pago E pendente de propósito.
 */
import { TestBed } from '@angular/core/testing';
import { signal, type Type } from '@angular/core';
import { provideRouter } from '@angular/router';
import type { Category, FixedExpense, Income, Transaction } from '@caixa-familia/shared-types';
import { AppDataService } from '../../layout/app-data.service';
import { ViewportService } from '../../core/viewport.service';
import { DashboardAComponent } from './dashboard-a.component';
import { DashboardBComponent } from './dashboard-b.component';

const CATEGORIES: Category[] = [
  { id: 'casa',    label: 'Casa',     color: '#7A4F1D', budget: 2000, order: 1 },
  { id: 'mercado', label: 'Mercado',  color: '#0F2D4F', budget: 800,  order: 2 },
  { id: 'educ',    label: 'Educação', color: '#3F2C7A', budget: 400,  order: 3 },
];

const FIXED: FixedExpense[] = [
  // Pago: a transação t1 abaixo É este pagamento. Não pode contar duas vezes.
  { id: 'f1', label: 'Aluguel',  value: 1200, due: 10, cat: 'casa', holder: 'shared', startDate: '2026-01-01', paidAt: '2026-05-06', paidValue: 1200 },
  { id: 'f2', label: 'Internet', value: 100,  due: 15, cat: 'casa', holder: 'shared', startDate: '2026-01-01' },
  { id: 'f3', label: 'Escola',   value: 300,  due: 12, cat: 'educ', holder: 'shared', startDate: '2026-01-01' },
];

const TRANSACTIONS: Transaction[] = [
  { id: 't1', date: '2026-05-06', label: 'Aluguel', value: 1200, cat: 'casa',    holder: 'shared', method: 'pix', installments: null, recurring: true,  reviewed: false, fixedRef: 'f1' },
  { id: 't2', date: '2026-05-08', label: 'Mercado', value: 400,  cat: 'mercado', holder: 'shared', method: 'pix', installments: null, recurring: false, reviewed: false },
];

const INCOMES: Income[] = [
  { id: 'i1', label: 'Salário', value: 5000, holder: 'shared', date: '2026-05-05', recurring: true },
];

// realizado 1600 · a pagar 400 · comprometido 2000 · receita 5000 · saldo 3000
const REALIZADO = 1600;
const A_PAGAR = 400;
const COMPROMETIDO = 2000;

function mockData() {
  return {
    transactions: signal(TRANSACTIONS),
    incomes: signal(INCOMES),
    fixed: signal(FIXED),
    goals: signal([]),
    cards: signal([]),
    activeCards: signal([]),
    categories: signal(CATEGORIES),
    catBy: signal(Object.fromEntries(CATEGORIES.map((c) => [c.id, c]))),
    cardBy: signal({}),
    // Mês anterior fechado somou 1000, e o fechamento só conta transações.
    history: signal([
      { m: 'Abr/26', total: 1000, perCategory: {} },
      { m: 'Mai/26', total: 0, perCategory: {} },
    ]),
    incomeHistory: signal([
      { m: 'Abr/26', total: 4000, perCategory: {} },
      { m: 'Mai/26', total: 0, perCategory: {} },
    ]),
    holderFilter: signal('todos'),
    currentMonth: signal({ year: 2026, month: 5, label: 'Maio 2026', short: 'Mai/26' }),
  };
}

function mount<T>(component: Type<T>) {
  TestBed.resetTestingModule();
  const data = mockData();
  TestBed.configureTestingModule({
    imports: [component],
    providers: [
      provideRouter([]),
      { provide: AppDataService, useValue: data },
      { provide: ViewportService, useValue: { isDesktop: signal(true) } },
    ],
  });
  const fixture = TestBed.createComponent(component);
  fixture.detectChanges();
  return {
    c: fixture.componentInstance,
    data,
    el: fixture.nativeElement as HTMLElement,
    /** Navega de mês e reaplica o binding, como a topbar faria. */
    goTo(year: number, month: number, label: string) {
      data.currentMonth.set({ year, month, label, short: label });
      fixture.detectChanges();
    },
  };
}

function build<T>(component: Type<T>): T {
  return mount(component).c;
}

afterEach(() => TestBed.resetTestingModule());

describe('Aba A — o comprometido do mês', () => {
  const kpi = (c: DashboardAComponent, label: string) =>
    c.kpis().find((k) => k.label === label);

  it('soma lançamentos e fixos pendentes em Gastos', () => {
    expect(kpi(build(DashboardAComponent), 'Gastos')?.value).toBe(COMPROMETIDO);
  });

  it('não conta duas vezes o fixo já pago', () => {
    // O aluguel de 1200 está nas transações e no cadastro; contá-lo duas vezes
    // daria 3200 em vez de 2000.
    expect(kpi(build(DashboardAComponent), 'Gastos')?.value).not.toBe(REALIZADO + REALIZADO);
  });

  it('quebra o Gastos em realizado e a pagar na sublinha', () => {
    expect(kpi(build(DashboardAComponent), 'Gastos')?.sub).toBe(
      'R$ 1.600 realizado + R$ 400 a pagar',
    );
  });

  it('mostra só os pendentes em Fixos a pagar', () => {
    const k = kpi(build(DashboardAComponent), 'Fixos a pagar');
    expect(k?.value).toBe(A_PAGAR);
    expect(k?.sub).toBe('2 de 3 contas · R$ 1.600 no total');
  });

  it('desconta o comprometido do Saldo, não só o realizado', () => {
    expect(kpi(build(DashboardAComponent), 'Saldo')?.value).toBe(5000 - COMPROMETIDO);
  });

  it('soma o fixo pendente na categoria dele', () => {
    const rows = build(DashboardAComponent).catSpend();
    // casa = 1200 do aluguel pago + 100 da internet pendente
    expect(rows.map((r) => [r.cat.id, r.spent])).toEqual([
      ['casa', 1300],
      ['mercado', 400],
      ['educ', 300],
    ]);
  });

  it('fecha a soma das categorias com o comprometido', () => {
    const total = build(DashboardAComponent).catSpend().reduce((s, r) => s + r.spent, 0);
    expect(total).toBe(COMPROMETIDO);
  });
});

describe('Aba B — o comprometido do mês', () => {
  const kpi = (c: DashboardBComponent, label: string) =>
    c.kpiCards().find((k) => k.label === label);

  it('separa realizado de comprometido', () => {
    const c = build(DashboardBComponent);
    expect(c.totalRealized()).toBe(REALIZADO);
    expect(c.totalCommitted()).toBe(COMPROMETIDO);
  });

  it('mostra o comprometido em Gastos do mês', () => {
    expect(kpi(build(DashboardBComponent), 'Gastos do mês')?.value).toBe(COMPROMETIDO);
  });

  it('compara a variação contra o realizado, não contra o comprometido', () => {
    // Mês anterior fechou em 1000 somando só transações. 1600 → +60%.
    // Usar o comprometido (2000) daria +100% e inflaria a variação todo dia 1º.
    expect(kpi(build(DashboardBComponent), 'Gastos do mês')?.delta).toBeCloseTo(60);
  });

  it('desconta o comprometido do Saldo livre', () => {
    expect(kpi(build(DashboardBComponent), 'Saldo livre')?.value).toBe(5000 - COMPROMETIDO);
  });

  it('inclui os fixos pendentes no donut', () => {
    const segs = build(DashboardBComponent).donutSegments();
    expect(segs.map((s) => [s.label, s.value])).toEqual([
      ['Casa', 1300],
      ['Mercado', 400],
      ['Educação', 300],
    ]);
  });

  it('usa o comprometido como denominador das porcentagens do donut', () => {
    // 1300 / 2000 = 65%. Dividir pelo realizado daria 81% e a soma passaria de 100.
    expect(build(DashboardBComponent).pct(1300)).toBe('65');
  });
});

describe('As listas de lançamentos incluem os fixos a pagar', () => {
  it('aba A lista os pendentes junto com as transações', () => {
    const rows = build(DashboardAComponent).topRows();
    // Pendentes por vencimento (Escola dia 12, Internet dia 15), depois a
    // transação. O aluguel pago não aparece como pendente — só como lançamento.
    expect(rows.map((r) => r.id)).toEqual(['f3', 'f2', 't2', 't1']);
  });

  it('aba A distingue a origem de cada linha', () => {
    const rows = build(DashboardAComponent).topRows();
    expect(rows.map((r) => r.kind)).toEqual(['fixed', 'fixed', 'tx', 'tx']);
  });

  it('aba A data o pendente pelo vencimento no mês visto', () => {
    const escola = build(DashboardAComponent).topRows()[0];
    expect(escola.date).toBe('2026-05-12');
  });

  it('aba A conta as linhas todas, não só as transações', () => {
    // Antes o contador e o rodapé usavam data.transactions().length e diziam 2.
    expect(build(DashboardAComponent).rowCount()).toBe(4);
  });

  it('aba B lista os pendentes junto com as transações', () => {
    expect(build(DashboardBComponent).recentRows().map((r) => r.id)).toEqual([
      'f3', 'f2', 't2', 't1',
    ]);
  });

  it('a soma das linhas fecha com o comprometido', () => {
    const total = build(DashboardAComponent).topRows().reduce((s, r) => s + r.value, 0);
    expect(total).toBe(COMPROMETIDO);
  });

  it('aba A marca a linha do pendente na tabela renderizada', () => {
    const { el } = mount(DashboardAComponent);
    const pendentes = el.querySelectorAll('table.tx-table .tx-row.row-pending');
    expect(pendentes.length).toBe(2);
    expect(pendentes[0].textContent).toContain('a pagar');
  });

  it('aba A não mostra forma de pagamento para o que ainda não foi pago', () => {
    const { el } = mount(DashboardAComponent);
    const primeira = el.querySelector('table.tx-table .tx-row.row-pending');
    expect(primeira?.textContent).toContain('—');
    expect(primeira?.querySelector('cf-card-chip')).toBeNull();
  });
});

describe('Rótulo do mês nos dashboards', () => {
  // Asserção contra o mês navegado, e não contra o mês inicial do mock: o valor
  // antigo era o literal "Maio 2026", que passaria num teste feito em maio.
  it('aba A titula a tabela com o mês filtrado', () => {
    const m = mount(DashboardAComponent);
    m.goTo(2026, 8, 'Agosto 2026');
    const titulo = m.el.querySelector('.panel-title')?.textContent ?? '';
    expect(titulo).toContain('Lançamentos');
    expect(titulo).toContain('Agosto 2026');
    expect(titulo).not.toContain('Maio');
  });

  it('aba B titula o donut com o mês filtrado', () => {
    const m = mount(DashboardBComponent);
    m.goTo(2026, 12, 'Dezembro 2026');
    const metas = Array.from(m.el.querySelectorAll('.panel-meta')).map((n) => n.textContent?.trim());
    expect(metas).toContain('Dezembro 2026');
    expect(metas).not.toContain('Mai 2026');
  });

  it('o vencimento do pendente acompanha o mês navegado', () => {
    const m = mount(DashboardAComponent);
    m.goTo(2026, 8, 'Agosto 2026');
    // f3 vence dia 12; em agosto isso é 12/08, não 12/05.
    expect(m.c.topRows()[0].date).toBe('2026-08-12');
  });
});
