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
    expect(component.history()).toEqual([1000, 2000, 1500, 300]);
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
    expect(component.history()).toEqual([300]);
  });
});
