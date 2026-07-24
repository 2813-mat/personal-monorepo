import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AppDataService } from './app-data.service';
import { TransactionApiService } from '../core/api/transaction-api.service';
import { CatalogApiService } from '../core/api/catalog-api.service';
import { IncomeApiService } from '../core/api/income-api.service';
import { FixedApiService } from '../core/api/fixed-api.service';
import { GoalApiService } from '../core/api/goal-api.service';
import { InvoiceApiService } from '../core/api/invoice-api.service';
import { ReportApiService } from '../core/api/report-api.service';
import type {
  TransactionWire,
  IncomeWire,
  FixedExpenseWire,
  GoalWire,
} from '../core/api/wire.types';

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

const fixedWire: FixedExpenseWire = {
  id: 'f1',
  label: 'Aluguel',
  value: 2000,
  dueDay: 5,
  categorySlug: 'casa',
  holder: 'Mateus',
  paidThisMonth: true,
};

const goalWire: GoalWire = {
  id: 'cuid-1',
  slug: 'sos',
  label: 'Reserva de emergência',
  target: 30000,
  monthly: 800,
  color: '#A16207',
  subtitle: 'colchão · 6 meses',
  type: 'EMERGENCIA',
  balance: 18420,
  history: [500, 500, 500, 600, 600, 700, 700, 800, 800, 800, 800, 800],
};

function setup(
  overrides: { txList?: jest.Mock; incList?: jest.Mock; fixList?: jest.Mock; goalList?: jest.Mock } = {},
) {
  const txApi = { list: overrides.txList ?? jest.fn(() => of([wire])), create: jest.fn(), remove: jest.fn() };
  const catApi = {
    listCategories: jest.fn(() => of([])),
    listCards: jest.fn(() => of([])),
    createCategory: jest.fn(() =>
      of({ id: 'c1', slug: 'farmacia', label: 'Farmácia', color: '#2E7D5B', budget: 300 }),
    ),
  };
  const incApi = { list: overrides.incList ?? jest.fn(() => of([incomeWire])), create: jest.fn(() => of(incomeWire)) };
  const fixApi = { list: overrides.fixList ?? jest.fn(() => of([fixedWire])), create: jest.fn(() => of(fixedWire)) };
  const goalApi = {
    list: overrides.goalList ?? jest.fn(() => of([goalWire])),
    addContribution: jest.fn(() => of(undefined)),
  };
  const invApi = {
    getOpen: jest.fn(() =>
      of({
        total: 150,
        items: [
          {
            id: 't1',
            date: '2026-07-10',
            label: 'Mercado',
            value: 150,
            categorySlug: 'mercado',
            holder: 'Thais',
            installments: null,
          },
        ],
      }),
    ),
    listByCard: jest.fn(() =>
      of([
        {
          id: 'inv-1',
          cardId: 'nu-t',
          year: 2026,
          month: 3,
          closingDate: '2026-03-05',
          dueDate: '2026-03-12',
          total: 1000,
          perCategory: {},
          status: 'CLOSED' as const,
        },
      ]),
    ),
  };
  const repApi = {
    listMonthly: jest.fn(() =>
      of([
        { id: 's1', year: 2026, month: 4, expenseTotal: 4791, incomeTotal: 7769, perCategory: {}, closed: true },
        { id: 's2', year: 2026, month: 5, expenseTotal: 5234, incomeTotal: 7493, perCategory: {}, closed: true },
      ]),
    ),
  };
  TestBed.configureTestingModule({
    providers: [
      AppDataService,
      { provide: TransactionApiService, useValue: txApi },
      { provide: CatalogApiService, useValue: catApi },
      { provide: IncomeApiService, useValue: incApi },
      { provide: FixedApiService, useValue: fixApi },
      { provide: GoalApiService, useValue: goalApi },
      { provide: InvoiceApiService, useValue: invApi },
      { provide: ReportApiService, useValue: repApi },
    ],
  });
  return { svc: TestBed.inject(AppDataService), txApi, incApi, fixApi, goalApi, catApi, invApi, repApi };
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

describe('AppDataService.loadFixed', () => {
  it('requests the current month and fills the fixed signal with mapped domain objects', () => {
    const { svc, fixApi } = setup();
    svc.loadFixed();
    expect(fixApi.list).toHaveBeenCalledWith({
      year: svc.currentMonth().year,
      month: svc.currentMonth().month,
    });
    expect(svc.fixed()[0]).toMatchObject({
      id: 'f1',
      due: 5,
      cat: 'casa',
      holder: 'Mateus',
      paidThisMonth: true,
    });
    expect(svc.fixedLoading()).toBe(false);
  });

  it('starts empty instead of serving mock data', () => {
    const { svc } = setup();
    expect(svc.fixed()).toEqual([]);
  });
});

describe('AppDataService.createFixed', () => {
  it('reloads fixed expenses after a successful create', () => {
    const { svc, fixApi } = setup();
    svc.createFixed({
      id: '',
      label: 'Internet',
      value: 100,
      due: 15,
      cat: 'assin',
      holder: 'shared',
      paidThisMonth: false,
    });
    expect(fixApi.create).toHaveBeenCalledWith(
      expect.objectContaining({
        label: 'Internet',
        value: 100,
        dueDay: 15,
        categorySlug: 'assin',
        holder: 'shared',
      }),
    );
    expect(fixApi.list).toHaveBeenCalled();
  });
});

describe('AppDataService.loadGoals', () => {
  it('fills the goals signal with mapped domain objects', () => {
    const { svc, goalApi } = setup();
    svc.loadGoals();
    expect(goalApi.list).toHaveBeenCalled();
    expect(svc.goals()[0]).toMatchObject({ id: 'sos', type: 'emergencia', balance: 18420 });
    expect(svc.goalsLoading()).toBe(false);
  });

  it('starts empty instead of serving mock data', () => {
    const { svc } = setup();
    expect(svc.goals()).toEqual([]);
  });
});

describe('AppDataService.addContribution', () => {
  it('posts to the goal slug and reloads goals', () => {
    const { svc, goalApi } = setup();
    svc.addContribution('sos', 500, '2026-05-22');
    expect(goalApi.addContribution).toHaveBeenCalledWith('sos', { amount: 500, date: '2026-05-22' });
    expect(goalApi.list).toHaveBeenCalled();
  });
});

describe('AppDataService.createCategory', () => {
  it('posts the domain id as the slug and reloads the catalog', () => {
    const { svc, catApi } = setup();
    svc.createCategory({ id: 'farmacia', label: 'Farmácia', color: '#2E7D5B', budget: 300 });
    expect(catApi.createCategory).toHaveBeenCalledWith({
      slug: 'farmacia',
      label: 'Farmácia',
      color: '#2E7D5B',
      budget: 300,
    });
    expect(catApi.listCategories).toHaveBeenCalled();
  });
});

describe('AppDataService.loadInvoiceHistory', () => {
  it('requests the history for the given card', () => {
    const { svc, invApi } = setup();
    svc.loadInvoiceHistory('nu-t');
    expect(invApi.listByCard).toHaveBeenCalledWith('nu-t');
    expect(svc.invoiceHistory()[0]).toEqual({ year: 2026, month: 3, total: 1000, perCategory: {} });
    expect(svc.invoiceHistoryLoading()).toBe(false);
  });

  it('starts empty', () => {
    const { svc } = setup();
    expect(svc.invoiceHistory()).toEqual([]);
  });
});

describe('AppDataService.loadMonthlyHistory', () => {
  it('fills both series from a single call', () => {
    const { svc, repApi } = setup();
    svc.loadMonthlyHistory();
    expect(repApi.listMonthly).toHaveBeenCalledTimes(1);
    expect(svc.history()).toEqual([
      { m: 'Abr/26', total: 4791 },
      { m: 'Mai/26', total: 5234 },
    ]);
    expect(svc.incomeHistory()).toEqual([
      { m: 'Abr/26', total: 7769 },
      { m: 'Mai/26', total: 7493 },
    ]);
    expect(svc.reportsLoading()).toBe(false);
  });

  it('starts both series empty instead of serving mock data', () => {
    const { svc } = setup();
    expect(svc.history()).toEqual([]);
    expect(svc.incomeHistory()).toEqual([]);
  });
});

describe('AppDataService.currentMonth', () => {
  it('starts on the real current month, not a hardcoded one', () => {
    const { svc } = setup();
    const now = new Date();
    expect(svc.currentMonth()).toMatchObject({
      year: now.getFullYear(),
      month: now.getMonth() + 1,
    });
  });

  it('exposes both labels', () => {
    const { svc } = setup();
    expect(svc.currentMonth().short).toMatch(/^[A-Z][a-z]{2}\/\d{2}$/);
    expect(svc.currentMonth().label).toMatch(/^[A-ZÇ][a-zç]+ \d{4}$/);
  });
});

describe('AppDataService.loadCatalog', () => {
  it('surfaces a category failure instead of swallowing it', () => {
    const { svc, catApi } = setup();
    catApi.listCategories.mockReturnValueOnce(throwError(() => new Error('boom')));
    svc.loadCatalog();
    expect(svc.categoriesError()).toBe('Falha ao carregar categorias');
  });

  it('surfaces a card failure instead of swallowing it', () => {
    const { svc, catApi } = setup();
    catApi.listCards.mockReturnValueOnce(throwError(() => new Error('boom')));
    svc.loadCatalog();
    expect(svc.cardsError()).toBe('Falha ao carregar cartões');
  });
});

describe('AppDataService.loadOpenInvoice', () => {
  it('requests the open invoice for the given card', () => {
    const { svc, invApi } = setup();
    svc.loadOpenInvoice('nu-t');
    expect(invApi.getOpen).toHaveBeenCalledWith('nu-t');
    expect(svc.openInvoice().total).toBe(150);
    expect(svc.openInvoice().items[0]).toEqual({
      id: 't1',
      date: '2026-07-10',
      label: 'Mercado',
      value: 150,
      cat: 'mercado',
      holder: 'Thais',
      installments: null,
    });
    expect(svc.openInvoiceLoading()).toBe(false);
  });

  it('starts with an empty invoice', () => {
    const { svc } = setup();
    expect(svc.openInvoice()).toEqual({ total: 0, items: [] });
  });
});
