import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { DashboardAComponent } from './dashboard-a.component';
import { DashboardBComponent } from './dashboard-b.component';
import { AppDataService } from '../../layout/app-data.service';
import { ViewportService } from '../../core/viewport.service';
import type { Transaction, Category } from '@caixa-familia/shared-types';

const TRANSACTIONS: Transaction[] = [
  { id: 't1', date: '2026-07-10', label: 'Mercado', value: 300, cat: 'casa',
    holder: 'Mateus', method: 'pix', installments: null, recurring: false },
  { id: 't2', date: '2026-07-11', label: 'Farmácia', value: 120, cat: 'casa',
    holder: 'Thais', method: 'pix', installments: null, recurring: false },
];

const CATEGORIES: Category[] = [
  { id: 'casa', label: 'Casa', color: '#7A4F1D', budget: 500 },
];

function mockData() {
  return {
    transactions: signal(TRANSACTIONS),
    incomes: signal([]),
    fixed: signal([]),
    goals: signal([]),
    cards: signal([]),
    categories: signal(CATEGORIES),
    history: signal([]),
    incomeHistory: signal([]),
    catBy: signal({ casa: CATEGORIES[0] }),
    cardBy: signal({}),
    holderFilter: signal('todos'),
    currentMonth: signal({ year: 2026, month: 7, label: 'Julho 2026', short: 'Jul/26' }),
    transactionsLoading: signal(false),
    incomesLoading: signal(false),
    fixedLoading: signal(false),
    goalsLoading: signal(false),
  };
}

function build(component: any, isDesktop: boolean) {
  TestBed.configureTestingModule({
    imports: [component],
    providers: [
      provideRouter([]),
      { provide: AppDataService, useValue: mockData() },
      { provide: ViewportService, useValue: { isDesktop: signal(isDesktop) } },
    ],
  });
  const fixture = TestBed.createComponent(component);
  fixture.detectChanges();
  return fixture.nativeElement;
}

afterEach(() => TestBed.resetTestingModule());

describe('DashboardAComponent — responsive rendering', () => {
  it('renders the transactions table on desktop and no card list', () => {
    const el = build(DashboardAComponent, true);
    expect(el.querySelector('.dsh-cards')).toBeNull();
    expect(el.querySelectorAll('table.tx-table').length).toBeGreaterThan(0);
  });

  it('renders the transaction cards on mobile', () => {
    expect(build(DashboardAComponent, false).querySelector('.dsh-cards')).not.toBeNull();
  });

  it('shows one card per top transaction on mobile', () => {
    expect(build(DashboardAComponent, false).querySelectorAll('.dsh-card').length).toBe(2);
  });
});

describe('DashboardBComponent — responsive rendering', () => {
  it('renders the transactions table on desktop and no card list', () => {
    const el = build(DashboardBComponent, true);
    expect(el.querySelector('.dsh-cards')).toBeNull();
    expect(el.querySelectorAll('table.tx-table').length).toBeGreaterThan(0);
  });

  it('renders the transaction cards on mobile', () => {
    expect(build(DashboardBComponent, false).querySelector('.dsh-cards')).not.toBeNull();
  });

  it('shows one card per recent transaction on mobile', () => {
    expect(build(DashboardBComponent, false).querySelectorAll('.dsh-card').length).toBe(2);
  });
});
