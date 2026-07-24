import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { CardsComponent } from './cards.component';
import { AppDataService } from '../../layout/app-data.service';
import type { InvoiceHistoryEntry } from '../../core/api/invoice.mapper';
import type { Card } from '@caixa-familia/shared-types';

const CARDS = [
  {
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
  },
  {
    id: 'it-m',
    name: 'Itaú',
    holder: 'Mateus',
    bank: 'Itaú',
    color: '#EC7000',
    closing: 18,
    due: 25,
    current: 100,
    limit: 5200,
    last4: '3367',
  },
] as Card[];

const entry = (year: number, month: number, total: number): InvoiceHistoryEntry => ({
  year,
  month,
  total,
  perCategory: {},
});

function build(byCard: Record<string, InvoiceHistoryEntry[]>) {
  const data = {
    cards: signal(CARDS),
    cardBy: signal(Object.fromEntries(CARDS.map((c) => [c.id, c]))),
    transactions: signal([]),
    catBy: signal({}),
    currentMonth: signal({ year: 2026, month: 7, label: 'Julho 2026', short: 'Jul/26' }),
    invoiceHistoryByCard: signal(byCard),
  };
  TestBed.configureTestingModule({
    imports: [CardsComponent],
    providers: [provideRouter([]), { provide: AppDataService, useValue: data }],
  });
  const fixture = TestBed.createComponent(CardsComponent);
  fixture.detectChanges();
  return fixture.componentInstance;
}

afterEach(() => TestBed.resetTestingModule());

describe('CardsComponent — invoice history column', () => {
  it('plots the totals the API reported for that card', () => {
    const c = build({
      'nu-t': [entry(2026, 1, 100), entry(2026, 2, 200), entry(2026, 3, 300)],
    });
    expect(c.historyOf(CARDS[0])).toEqual([100, 200, 300]);
  });

  it('does not mix one card series into another', () => {
    const c = build({
      'nu-t': [entry(2026, 1, 100)],
      'it-m': [entry(2026, 1, 999)],
    });
    expect(c.historyOf(CARDS[1])).toEqual([999]);
  });

  it('keeps only the six most recent closings', () => {
    const eight = Array.from({ length: 8 }, (_, i) => entry(2026, i + 1, (i + 1) * 10));
    const c = build({ 'nu-t': eight });
    expect(c.historyOf(CARDS[0])).toEqual([30, 40, 50, 60, 70, 80]);
  });

  it('returns an empty series for a card with no closed invoice', () => {
    const c = build({ 'nu-t': [entry(2026, 1, 100)] });
    expect(c.historyOf(CARDS[1])).toEqual([]);
  });

  it('returns an empty series when nothing has been closed at all', () => {
    const c = build({});
    expect(c.historyOf(CARDS[0])).toEqual([]);
  });

  it('does not invent values from the card id', () => {
    // o defeito antigo: a série saía de um seed do id e nunca era vazia
    expect(build({}).historyOf(CARDS[0])).not.toHaveLength(6);
  });
});
