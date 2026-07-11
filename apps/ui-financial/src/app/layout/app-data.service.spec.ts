import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AppDataService } from './app-data.service';
import { TransactionApiService } from '../core/api/transaction-api.service';
import { CatalogApiService } from '../core/api/catalog-api.service';
import { IncomeApiService } from '../core/api/income-api.service';
import type { TransactionWire, IncomeWire } from '../core/api/wire.types';

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

const incomeWire: IncomeWire = {
  id: 'i1',
  label: 'Salário',
  holder: 'Thais',
  value: 5000,
  date: '2026-05-05',
  recurring: true,
};

function setup(overrides: { txList?: jest.Mock; incList?: jest.Mock } = {}) {
  const txApi = { list: overrides.txList ?? jest.fn(() => of([wire])), create: jest.fn(), remove: jest.fn() };
  const catApi = { listCategories: jest.fn(() => of([])), listCards: jest.fn(() => of([])) };
  const incApi = { list: overrides.incList ?? jest.fn(() => of([incomeWire])), create: jest.fn(() => of(incomeWire)) };
  TestBed.configureTestingModule({
    providers: [
      AppDataService,
      { provide: TransactionApiService, useValue: txApi },
      { provide: CatalogApiService, useValue: catApi },
      { provide: IncomeApiService, useValue: incApi },
    ],
  });
  return { svc: TestBed.inject(AppDataService), txApi, incApi };
}

describe('AppDataService.loadTransactions', () => {
  it('fills the transactions signal with mapped domain objects', () => {
    const { svc, txApi } = setup();
    svc.loadTransactions();
    expect(txApi.list).toHaveBeenCalledWith(
      expect.objectContaining({ year: svc.currentMonth().year, month: svc.currentMonth().month }),
    );
    expect(svc.transactions()[0]).toMatchObject({ id: 't1', cat: 'mercado', holder: 'Mateus', method: 'pix' });
    expect(svc.transactionsLoading()).toBe(false);
  });
});

describe('AppDataService.loadIncomes', () => {
  it('fills the incomes signal with mapped domain objects', () => {
    const { svc, incApi } = setup();
    svc.loadIncomes();
    expect(incApi.list).toHaveBeenCalled();
    expect(svc.incomes()[0]).toMatchObject({ id: 'i1', holder: 'Thais', value: 5000 });
    expect(svc.incomesLoading()).toBe(false);
  });
});

describe('AppDataService.createIncome', () => {
  it('reloads incomes after a successful create', () => {
    const { svc, incApi } = setup();
    svc.createIncome({ id: '', label: 'Bônus', holder: 'Mateus', value: 200, date: '2026-05-20', recurring: false });
    expect(incApi.create).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'Bônus', holder: 'Mateus', value: 200 }),
    );
    expect(incApi.list).toHaveBeenCalled();
  });
});
