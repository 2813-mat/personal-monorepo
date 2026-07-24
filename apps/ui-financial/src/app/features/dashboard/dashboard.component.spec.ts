import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { DashboardComponent } from './dashboard.component';
import { AppDataService } from '../../layout/app-data.service';

function mockData(over: Record<string, unknown> = {}) {
  return {
    transactions: signal([]),
    incomes: signal([]),
    fixed: signal([]),
    goals: signal([]),
    cards: signal([]),
    categories: signal([]),
    history: signal([]),
    incomeHistory: signal([]),
    catBy: signal({}),
    cardBy: signal({}),
    holderFilter: signal('todos'),
    currentMonth: signal({ year: 2026, month: 7, label: 'Julho 2026', short: 'Jul/26' }),
    transactionsLoading: signal(false),
    incomesLoading: signal(false),
    fixedLoading: signal(false),
    goalsLoading: signal(false),
    ...over,
  };
}

function build(over: Record<string, unknown> = {}) {
  TestBed.configureTestingModule({
    imports: [DashboardComponent],
    providers: [provideRouter([]), { provide: AppDataService, useValue: mockData(over) }],
  });
  const fixture = TestBed.createComponent(DashboardComponent);
  fixture.detectChanges();
  return fixture.componentInstance;
}

afterEach(() => TestBed.resetTestingModule());

describe('DashboardComponent — data state', () => {
  it('is loading while any resource is in flight', () => {
    expect(build({ transactionsLoading: signal(true) }).loading()).toBe(true);
  });

  it('is not loading once every resource settled', () => {
    expect(build().loading()).toBe(false);
  });

  it('reports empty when nothing loaded and nothing is in flight', () => {
    expect(build().isEmpty()).toBe(true);
  });

  it('does not report empty while still loading', () => {
    expect(build({ goalsLoading: signal(true) }).isEmpty()).toBe(false);
  });

  it('does not report empty when there are transactions', () => {
    const tx = {
      id: 't1',
      date: '2026-07-10',
      label: 'Mercado',
      value: 100,
      cat: 'mercado',
      holder: 'Mateus',
      method: 'pix',
      installments: null,
      recurring: false,
    };
    expect(build({ transactions: signal([tx]) }).isEmpty()).toBe(false);
  });

  it('does not report empty when there are only fixed expenses', () => {
    expect(build({ fixed: signal([{ id: 'f1' }]) }).isEmpty()).toBe(false);
  });

  it('exposes the month label for the message', () => {
    expect(build().monthLabel()).toBe('Julho 2026');
  });
});
