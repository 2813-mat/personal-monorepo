import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { InvoiceComponent } from './invoice.component';
import { AppDataService } from '../../layout/app-data.service';
import type { InvoiceHistoryEntry } from '../../core/api/invoice.mapper';
import type { Card, Transaction } from '@caixa-familia/shared-types';

const CARD = {
  id: 'nu-t',
  name: 'Nubank',
  holder: 'Thais',
  bank: 'Nubank',
  color: '#820AD1',
  closing: 5,
  due: 12,
  current: 300,
  limit: 4500,
  last4: '4421',
} as Card;

const TRANSACTIONS: Transaction[] = [
  {
    id: 't1',
    date: '2026-05-10',
    label: 'Compra',
    value: 300,
    cat: 'lazer',
    holder: 'Thais',
    method: 'nu-t',
    installments: null,
    recurring: false,
  },
];

const CLOSED: InvoiceHistoryEntry[] = [
  { year: 2026, month: 2, total: 1000, perCategory: {} },
  { year: 2026, month: 3, total: 2000, perCategory: {} },
  { year: 2026, month: 4, total: 1500, perCategory: {} },
];

function mockDataService(history: InvoiceHistoryEntry[]) {
  return {
    cardBy: signal({ 'nu-t': CARD }),
    catBy: signal({}),
    transactions: signal(TRANSACTIONS),
    currentMonth: signal({ year: 2026, month: 5, label: 'Maio 2026', short: 'mai' }),
    invoiceHistory: signal(history),
    invoiceHistoryLoading: signal(false),
    loadInvoiceHistory: jest.fn(),
    openInvoice: signal({
      total: 450,
      items: [
        {
          id: 'a1',
          date: '2026-07-10',
          label: 'Mercado',
          value: 300,
          cat: 'mercado',
          holder: 'Thais',
          installments: null,
        },
        {
          id: 'a2',
          date: '2026-06-28',
          label: 'Curso',
          value: 150,
          cat: 'educ',
          holder: 'Mateus',
          installments: { n: 2, of: 6 },
        },
      ],
    }),
    openInvoiceLoading: signal(false),
    loadOpenInvoice: jest.fn(),
  };
}

function build(history: InvoiceHistoryEntry[]) {
  const data = mockDataService(history);
  TestBed.configureTestingModule({
    imports: [InvoiceComponent],
    providers: [
      { provide: AppDataService, useValue: data },
      { provide: ActivatedRoute, useValue: { snapshot: { params: { cardId: 'nu-t' } } } },
    ],
  });
  const fixture = TestBed.createComponent(InvoiceComponent);
  fixture.detectChanges();
  return { component: fixture.componentInstance, data };
}

afterEach(() => TestBed.resetTestingModule());

describe('InvoiceComponent — history panel', () => {
  it('asks for the history of the routed card', () => {
    const { data } = build(CLOSED);
    expect(data.loadInvoiceHistory).toHaveBeenCalledWith('nu-t');
  });

  it('plots closed invoices followed by the open one', () => {
    const { component } = build(CLOSED);
    // 450 é o total da fatura aberta que a API devolveu
    expect(component.history()).toEqual([1000, 2000, 1500, 450]);
  });

  it('highlights the open invoice as the last bar', () => {
    const { component } = build(CLOSED);
    expect(component.highlightIndex()).toBe(3);
  });

  it('computes the stats from closed invoices only', () => {
    const { component } = build(CLOSED);
    expect(component.histAvg()).toBeCloseTo(1500);
    expect(component.histMax()).toBe(2000);
    expect(component.histMin()).toBe(1000);
  });

  it('reports how many closed invoices there are', () => {
    const { component } = build(CLOSED);
    expect(component.closedCount()).toBe(3);
  });

  it('survives an empty history with zeroed stats', () => {
    const { component } = build([]);
    expect(component.closedCount()).toBe(0);
    expect(component.histAvg()).toBe(0);
    expect(component.histMax()).toBe(0);
    expect(component.histMin()).toBe(0);
  });

  it('still plots the open invoice when there is no closed history', () => {
    const { component } = build([]);
    expect(component.history()).toEqual([450]);
  });
});

describe('InvoiceComponent — open invoice', () => {
  it('asks for the open invoice of the routed card', () => {
    const { data } = build(CLOSED);
    expect(data.loadOpenInvoice).toHaveBeenCalledWith('nu-t');
  });

  it('lists the items the API returned, not the month transactions', () => {
    const { component } = build(CLOSED);
    expect(component.items().map((i) => i.id)).toEqual(['a1', 'a2']);
  });

  it('takes the total from the API', () => {
    const { component } = build(CLOSED);
    expect(component.total()).toBe(450);
  });

  it('breaks down the API items by category', () => {
    const { component } = build(CLOSED);
    expect(component.breakdown().map((b) => b.catId)).toEqual(['mercado', 'educ']);
  });

  it('projects upcoming instalments from the API items', () => {
    const { component } = build(CLOSED);
    // a2 está em 2/6 → faltam 4 parcelas
    expect(component.futureInstallments()).toHaveLength(4);
  });
});
