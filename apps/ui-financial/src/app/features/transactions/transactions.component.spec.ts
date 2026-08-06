import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TransactionsComponent } from './transactions.component';
import { AppDataService } from '../../layout/app-data.service';
import { AuthService } from '../../core/auth/auth.service';
import { ViewportService } from '../../core/viewport.service';
import type { Transaction, Category, Card } from '@caixa-familia/shared-types';

const TRANSACTIONS: Transaction[] = [
  { id: 't1', date: '2026-05-05', label: 'Mercado', value: 240, cat: 'casa',
    holder: 'Mateus', method: 'pix', installments: null, recurring: false, reviewed: false },
  { id: 't2', date: '2026-05-06', label: 'Farmácia', value: 88, cat: 'casa',
    holder: 'shared', method: 'pix', installments: null, recurring: false, reviewed: false },
];

const CATEGORIES: Category[] = [
  { id: 'casa', label: 'Casa', color: '#7A4F1D', budget: 500, order: 1 },
];

const CAT_BY: Record<string, Category> = { casa: CATEGORIES[0] };

function build(isDesktop: boolean) {
  const data = {
    transactions: signal(TRANSACTIONS),
    categories: signal(CATEGORIES),
    catBy: signal(CAT_BY),
    cardBy: signal({} as Record<string, Card>),
    holderFilter: signal('todos' as const),
  };
  TestBed.configureTestingModule({
    imports: [TransactionsComponent],
    providers: [
      { provide: AppDataService, useValue: data },
      { provide: ViewportService, useValue: { isDesktop: signal(isDesktop) } },
      // O tx-detail-drawer abre ao tocar num card e injeta AuthService, que
      // sem mock arrasta a cadeia inteira do OIDC.
      { provide: AuthService, useValue: { canWrite: signal(true) } },
    ],
  });
  const fixture = TestBed.createComponent(TransactionsComponent);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement, data };
}

afterEach(() => TestBed.resetTestingModule());

describe('TransactionsComponent — responsive rendering', () => {
  it('renders the table on desktop and no card list', () => {
    const { el } = build(true);
    expect(el.querySelector('table.tx-table')).not.toBeNull();
    expect(el.querySelector('.tx-cards')).toBeNull();
  });

  it('renders the card list on mobile and no table', () => {
    const { el } = build(false);
    expect(el.querySelector('.tx-cards')).not.toBeNull();
    expect(el.querySelector('table.tx-table')).toBeNull();
  });

  it('shows every filtered transaction as a card on mobile', () => {
    expect(build(false).el.querySelectorAll('.tx-card').length).toBe(2);
  });

  it('opens the detail drawer when a card is tapped', () => {
    const { fixture, el } = build(false);
    el.querySelector('.tx-card').click();
    fixture.detectChanges();
    expect(fixture.componentInstance.selectedTx()).not.toBeNull();
  });

  it('breaks the cards into one group per day', () => {
    // as duas transações do mock são de dias diferentes (05 e 06 de maio)
    expect(build(false).el.querySelectorAll('.txc-day').length).toBe(2);
  });

  it('keeps same-day transactions under a single separator', () => {
    const { fixture, el, data } = build(false);
    data.transactions.set(TRANSACTIONS.map(t => ({ ...t, date: '2026-05-05' })));
    fixture.detectChanges();
    expect(el.querySelectorAll('.txc-day').length).toBe(1);
    expect(el.querySelectorAll('.tx-card').length).toBe(2);
  });
});
