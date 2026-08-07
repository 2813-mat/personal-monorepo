import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CatalogStore } from './catalog.store';
import { ToastService } from '../../ui/toast/toast.service';
import { environment } from '../../../environments/environment';
import type { Card } from '@caixa-familia/shared-types';

const CARD = (over: Partial<Card> = {}): Card => ({
  id: 'c1',
  name: 'Nubank',
  holder: 'Thais',
  bank: 'Nubank',
  color: '#820AD1',
  closing: 5,
  due: 12,
  current: 0,
  limit: 4500,
  last4: '4421',
  archived: false,
  ...over,
});

function build() {
  const toast = { show: jest.fn() };
  TestBed.configureTestingModule({
    providers: [
      CatalogStore,
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: ToastService, useValue: toast },
    ],
  });
  return {
    store: TestBed.inject(CatalogStore),
    http: TestBed.inject(HttpTestingController),
    toast,
  };
}

afterEach(() => TestBed.resetTestingModule());

describe('CatalogStore — activeCards', () => {
  it('esconde arquivados sem tirá-los de cards()', () => {
    const { store, http } = build();
    store.load();
    http.expectOne(`${environment.apiBaseUrl}/categories`).flush([]);
    http.expectOne(`${environment.apiBaseUrl}/cards`).flush([
      CARD(),
      CARD({ id: 'c2', archived: true }),
    ]);
    expect(store.cards().length).toBe(2);
    expect(store.activeCards().map((c) => c.id)).toEqual(['c1']);
  });

  it('cardBy continua resolvendo um cartão arquivado', () => {
    const { store, http } = build();
    store.load();
    http.expectOne(`${environment.apiBaseUrl}/categories`).flush([]);
    http.expectOne(`${environment.apiBaseUrl}/cards`).flush([CARD({ archived: true })]);
    expect(store.cardBy()['c1'].bank).toBe('Nubank');
  });
});

describe('CatalogStore — remoção de cartão', () => {
  it('guarda a mensagem do 409 em vez de virar toast', () => {
    const { store, http, toast } = build();
    store.removeCard('c1');
    http
      .expectOne(`${environment.apiBaseUrl}/cards/c1`)
      .flush(
        { message: 'Cartão em uso', transactions: 47, invoices: 8 },
        { status: 409, statusText: 'Conflict' },
      );
    expect(store.cardRemovalConflict()).toBe(
      'Não dá para excluir: 47 lançamentos e 8 faturas usam este cartão.',
    );
    expect(toast.show).not.toHaveBeenCalled();
  });

  it('mostra toast em erro que não é 409', () => {
    const { store, http, toast } = build();
    store.removeCard('c1');
    http
      .expectOne(`${environment.apiBaseUrl}/cards/c1`)
      .flush({}, { status: 500, statusText: 'Server Error' });
    expect(store.cardRemovalConflict()).toBeNull();
    expect(toast.show).toHaveBeenCalled();
  });

  it('limpa o conflito anterior ao tentar de novo', () => {
    const { store, http } = build();
    store.removeCard('c1');
    http
      .expectOne(`${environment.apiBaseUrl}/cards/c1`)
      .flush(
        { message: 'Cartão em uso', transactions: 1, invoices: 0 },
        { status: 409, statusText: 'Conflict' },
      );
    store.removeCard('c2');
    expect(store.cardRemovalConflict()).toBeNull();
    http.expectOne(`${environment.apiBaseUrl}/cards/c2`).flush(null);
  });
});
