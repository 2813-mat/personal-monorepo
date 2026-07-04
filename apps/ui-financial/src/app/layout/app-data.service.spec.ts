import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AppDataService } from './app-data.service';
import { TransactionApiService } from '../core/api/transaction-api.service';
import { CatalogApiService } from '../core/api/catalog-api.service';
import type { TransactionWire } from '../core/api/wire.types';

const wire: TransactionWire = {
  id: 't1',
  date: '2026-05-10',
  label: 'Mercado',
  value: 100,
  categorySlug: 'mercado',
  holder: 'Mateus',
  method: 'PIX',
  cardId: null,
  recurring: false,
  installments: null,
};

describe('AppDataService.loadTransactions', () => {
  it('fills the transactions signal with mapped domain objects', () => {
    const txApi = { list: jest.fn(() => of([wire])), create: jest.fn(), remove: jest.fn() };
    const catApi = { listCategories: jest.fn(() => of([])), listCards: jest.fn(() => of([])) };
    TestBed.configureTestingModule({
      providers: [
        AppDataService,
        { provide: TransactionApiService, useValue: txApi },
        { provide: CatalogApiService, useValue: catApi },
      ],
    });
    const svc = TestBed.inject(AppDataService);
    svc.loadTransactions();
    expect(txApi.list).toHaveBeenCalledWith(
      expect.objectContaining({ year: svc.currentMonth().year, month: svc.currentMonth().month }),
    );
    expect(svc.transactions()[0]).toMatchObject({ id: 't1', cat: 'mercado', holder: 'Mateus', method: 'pix' });
    expect(svc.transactionsLoading()).toBe(false);
  });
});
