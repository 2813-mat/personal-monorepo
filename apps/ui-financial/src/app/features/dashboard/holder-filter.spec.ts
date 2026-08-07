/**
 * O filtro de titular da topbar atravessa três abas de dashboard e a página de
 * transações, e cada uma tinha o predicado escrito à mão — a aba C chegou a
 * filtrar gasto e receita por regras diferentes, e A e B ignoravam o filtro.
 * Este spec mede as quatro contra o mesmo conjunto de dados.
 */
import { TestBed } from '@angular/core/testing';
import { signal, type Type } from '@angular/core';
import { provideRouter } from '@angular/router';
import type { HolderFilter, Income, Transaction } from '@caixa-familia/shared-types';
import { AppDataService } from '../../layout/app-data.service';
import { AuthService } from '../../core/auth/auth.service';
import { ViewportService } from '../../core/viewport.service';
import { DashboardAComponent } from './dashboard-a.component';
import { DashboardBComponent } from './dashboard-b.component';
import { DashboardCComponent } from './dashboard-c.component';
import { TransactionsComponent } from '../transactions/transactions.component';

// Valores distintos por titular: qualquer soma identifica quem entrou nela.
const TX: Transaction[] = [
  { id: 't1', date: '2026-05-05', label: 'Mateus', value: 100, cat: 'casa',
    holder: 'Mateus', method: 'pix', installments: null, recurring: false, reviewed: false },
  { id: 't2', date: '2026-05-06', label: 'Thais', value: 200, cat: 'casa',
    holder: 'Thais', method: 'pix', installments: null, recurring: false, reviewed: false },
  { id: 't3', date: '2026-05-07', label: 'Aluguel', value: 400, cat: 'casa',
    holder: 'shared', method: 'pix', installments: null, recurring: false, reviewed: false },
];

const INCOMES: Income[] = [
  { id: 'i1', label: 'Salário Mateus', value: 1000, holder: 'Mateus', date: '2026-05-05', recurring: true },
  { id: 'i2', label: 'Salário Thais', value: 2000, holder: 'Thais', date: '2026-05-05', recurring: true },
  { id: 'i3', label: 'Aluguel recebido', value: 4000, holder: 'shared', date: '2026-05-05', recurring: true },
];

function mockData(filter: HolderFilter) {
  return {
    transactions: signal(TX),
    incomes: signal(INCOMES),
    fixed: signal([]),
    goals: signal([]),
    cards: signal([]),
    activeCards: signal([]),
    categories: signal([]),
    catBy: signal({}),
    cardBy: signal({}),
    history: signal([]),
    incomeHistory: signal([]),
    holderFilter: signal(filter),
    currentMonth: signal({ year: 2026, month: 5, label: 'mai/26' }),
  };
}

function build<T>(component: Type<T>, filter: HolderFilter): T {
  // Cada caso monta o mesmo componente sob filtros diferentes para comparar as
  // somas, e o TestBed não deixa reconfigurar um módulo já instanciado.
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [component],
    providers: [
      provideRouter([]),
      { provide: AppDataService, useValue: mockData(filter) },
      { provide: ViewportService, useValue: { isDesktop: signal(true) } },
      // O tx-detail-drawer da página de transações injeta AuthService.
      { provide: AuthService, useValue: { canWrite: signal(true) } },
    ],
  });
  const fixture = TestBed.createComponent(component);
  fixture.detectChanges();
  return fixture.componentInstance;
}

afterEach(() => TestBed.resetTestingModule());

describe('Filtro de titular — o compartilhado conta para os dois', () => {
  it('aba C soma receita e gasto pela mesma regra', () => {
    const todos = build(DashboardCComponent, 'todos');
    expect(todos.receita()).toBe(7000);
    expect(todos.gastos()).toBe(700);

    const mateus = build(DashboardCComponent, 'Mateus');
    expect(mateus.receita()).toBe(5000); // 1000 próprio + 4000 compartilhado
    expect(mateus.gastos()).toBe(500); //   100 próprio +  400 compartilhado
    expect(mateus.saldo()).toBe(4500);

    const thais = build(DashboardCComponent, 'Thais');
    expect(thais.receita()).toBe(6000);
    expect(thais.gastos()).toBe(600);
    expect(thais.saldo()).toBe(5400);
  });

  it('aba C esconde os lançamentos do outro titular na lista de recentes', () => {
    expect(build(DashboardCComponent, 'todos').recentTx().length).toBe(3);
    expect(build(DashboardCComponent, 'Mateus').recentTx().map((t) => t.holder).sort())
      .toEqual(['Mateus', 'shared']);
  });

  it('aba A move os KPIs junto com o filtro', () => {
    const valor = (c: DashboardAComponent, label: string) =>
      c.kpis().find((k) => k.label === label)?.value;

    const todos = build(DashboardAComponent, 'todos');
    expect(valor(todos, 'Receita')).toBe(7000);
    expect(valor(todos, 'Gastos')).toBe(700);

    const mateus = build(DashboardAComponent, 'Mateus');
    expect(valor(mateus, 'Receita')).toBe(5000);
    expect(valor(mateus, 'Gastos')).toBe(500);
    expect(valor(mateus, 'Saldo')).toBe(4500);
  });

  it('aba B move os KPIs junto com o filtro', () => {
    expect(build(DashboardBComponent, 'todos').totalSpent()).toBe(700);
    expect(build(DashboardBComponent, 'Mateus').totalSpent()).toBe(500);
    expect(build(DashboardBComponent, 'Thais').totalSpent()).toBe(600);
  });

  it('aba B esconde a variação mensal sob filtro, porque o histórico é do casal', () => {
    const delta = (c: DashboardBComponent) =>
      c.kpiCards().find((k) => k.label === 'Gastos do mês')?.delta;
    expect(delta(build(DashboardBComponent, 'todos'))).toBeDefined();
    expect(delta(build(DashboardBComponent, 'Mateus'))).toBeUndefined();
  });

  it('página de transações lista o titular e o compartilhado', () => {
    const holders = (f: HolderFilter) =>
      build(TransactionsComponent, f).flatSorted().map((t) => t.holder).sort();
    expect(holders('todos')).toEqual(['Mateus', 'Thais', 'shared']);
    expect(holders('Mateus')).toEqual(['Mateus', 'shared']);
    expect(holders('Thais')).toEqual(['Thais', 'shared']);
  });
});
