import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { FixedComponent } from './fixed.component';
import { AppDataService } from '../../layout/app-data.service';
import { ViewportService } from '../../core/viewport.service';
import { AuthService } from '../../core/auth/auth.service';
import type { FixedExpense, Transaction, Income, Category } from '@caixa-familia/shared-types';

const FIXED: FixedExpense[] = [
  // Pago com valor acima do cadastro: é o pago que os totais somam.
  { id: 'f1', label: 'Conta A', value: 100, due: 5,  cat: 'casa',  holder: 'shared', startDate: '2026-01-01', paidAt: '2026-05-06', paidValue: 115 },
  { id: 'f2', label: 'Conta B', value: 200, due: 15, cat: 'assin', holder: 'Mateus', startDate: '2026-01-01' },
  { id: 'f3', label: 'Conta C', value: 300, due: 25, cat: 'educ',  holder: 'Thais',  startDate: '2026-01-01' },
];

const TRANSACTIONS: Transaction[] = [
  // recurring, value matches f1
  { id: 't1', date: '2026-05-05', label: 'Conta A', value: 100, cat: 'casa',  holder: 'shared', method: 'pix', installments: null, recurring: true, reviewed: false },
  // recurring, value does NOT match any fixed item
  { id: 't2', date: '2026-05-10', label: 'Spotify', value: 32,  cat: 'assin', holder: 'Mateus', method: 'pix', installments: null, recurring: true, reviewed: false },
  // recurring, value coincidentally matches f2 — must NOT make it paid
  { id: 't3', date: '2026-05-12', label: 'Compra',  value: 200, cat: 'lazer', holder: 'shared', method: 'nu-t', installments: null, recurring: true, reviewed: false },
];

const INCOMES: Income[] = [
  { id: 'i1', label: 'Salário', holder: 'Mateus', value: 1000, date: '2026-05-05', recurring: true },
];

const CAT_BY: Record<string, Category> = {
  casa:  { id: 'casa',  label: 'Casa',       color: '#7A4F1D', budget: 500, order: 1 },
  assin: { id: 'assin', label: 'Assinaturas', color: '#0F2D4F', budget: 150, order: 1 },
  educ:  { id: 'educ',  label: 'Educação',   color: '#3F2C7A', budget: 920, order: 1 },
};

function mockDataService() {
  return {
    fixed: signal(FIXED),
    transactions: signal(TRANSACTIONS),
    incomes: signal(INCOMES),
    catBy: signal(CAT_BY),
    categories: signal(Object.values(CAT_BY)),
    activeCards: signal([]),
    currentMonth: signal({ year: 2026, month: 5, label: 'Maio 2026', short: 'Mai/26' }),
  };
}

describe('FixedComponent', () => {
  let component: FixedComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FixedComponent],
      providers: [
        { provide: AppDataService, useValue: mockDataService() },
        { provide: AuthService, useValue: { canWrite: signal(true) } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(FixedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('paidItems', () => {
    it('includes only fixed items with a payment date', () => {
      expect(component.paidItems().map(f => f.id)).toEqual(['f1']);
    });

    it('ignores transaction values entirely', () => {
      // t3 is recurring with value 200 = f2.value; only paidAt decides, so f2
      // must stay pending.
      expect(component.paidItems().map(f => f.id)).not.toContain('f2');
    });
  });

  describe('pendingItems', () => {
    it('includes fixed items not yet paid this month', () => {
      expect(component.pendingItems().length).toBe(2);
    });

    it('is sorted by due date ascending', () => {
      const dues = component.pendingItems().map(f => f.due);
      expect(dues).toEqual([15, 25]);
    });
  });

  describe('KPI computeds', () => {
    it('totalFixed is sum of all fixed values', () => {
      expect(component.totalFixed()).toBeCloseTo(600);
    });

    it('totalPaid usa o valor pago, não o do cadastro', () => {
      expect(component.totalPaid()).toBeCloseTo(115);
    });

    it('totalPending is sum of pending item values', () => {
      expect(component.totalPending()).toBeCloseTo(500);
    });

    it('pctReceita is totalFixed / total incomes', () => {
      expect(component.pctReceita()).toBeCloseTo(0.6);
    });
  });

  describe('valueDiverged', () => {
    it('acusa a conta que veio diferente do cadastro', () => {
      expect(component.valueDiverged(FIXED[0])).toBe(true);
    });

    it('fica falso para o fixo pendente', () => {
      expect(component.valueDiverged(FIXED[1])).toBe(false);
    });

    it('fica falso quando o pago bateu com o cadastro', () => {
      expect(component.valueDiverged({ ...FIXED[0], paidValue: 100 })).toBe(false);
    });
  });

  describe('formatPercent', () => {
    it('formats ratio as integer percent string', () => {
      expect(component.formatPercent(0.6)).toBe('60%');
      expect(component.formatPercent(0.533)).toBe('53%');
    });
  });

  describe('formatDay', () => {
    it('usa o mês que está sendo visto, não um mês fixo no código', () => {
      expect(component.formatDay(5)).toBe('05/mai');
      expect(component.formatDay(25)).toBe('25/mai');
    });
  });

  describe('formatDay ao navegar de mês', () => {
    it('acompanha o mês da topbar em vez de dizer sempre "mai"', () => {
      // Regressão do bug visto em produção: um fixo com dueDay 7 aparecia como
      // "07/mai" com a topbar em Agosto 2026, porque o sufixo era literal.
      const data = mockDataService();
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [FixedComponent],
        providers: [
          { provide: AppDataService, useValue: data },
          { provide: AuthService, useValue: { canWrite: signal(true) } },
        ],
      });
      const c = TestBed.createComponent(FixedComponent).componentInstance;

      data.currentMonth.set({ year: 2026, month: 8, label: 'Agosto 2026', short: 'Ago/26' });
      expect(c.formatDay(7)).toBe('07/ago');
      expect(c.formatDay(10)).toBe('10/ago');

      data.currentMonth.set({ year: 2026, month: 12, label: 'Dezembro 2026', short: 'Dez/26' });
      expect(c.formatDay(7)).toBe('07/dez');
    });
  });

  describe('formatPaidAt', () => {
    it('lê o ISO como data civil, sem deslocar por fuso', () => {
      expect(component.formatPaidAt('2026-08-06')).toBe('06/ago');
      expect(component.formatPaidAt('2026-01-01')).toBe('01/jan');
    });
  });

  describe('isCurrentMonth', () => {
    it('é falso quando o mês visto não é o de hoje', () => {
      // O mock navega para mai/2026; "vence em N dias" não vale para outro mês.
      expect(component.isCurrentMonth()).toBe(false);
    });

    it('zera o contador de próximos 7 dias fora do mês corrente', () => {
      expect(component.upcoming7()).toBe(0);
    });
  });
});

function buildResponsive(isDesktop: boolean) {
  TestBed.configureTestingModule({
    imports: [FixedComponent],
    providers: [
      { provide: AppDataService, useValue: mockDataService() },
      { provide: ViewportService, useValue: { isDesktop: signal(isDesktop) } },
      { provide: AuthService, useValue: { canWrite: signal(true) } },
    ],
  });
  const fixture = TestBed.createComponent(FixedComponent);
  fixture.detectChanges();
  return fixture.nativeElement;
}

describe('FixedComponent — responsive rendering', () => {
  it('renders both tables on desktop and no card lists', () => {
    const el = buildResponsive(true);
    expect(el.querySelectorAll('table.tx-table').length).toBe(2);
    expect(el.querySelector('.fx-cards')).toBeNull();
  });

  it('renders both card lists on mobile and no tables', () => {
    const el = buildResponsive(false);
    expect(el.querySelectorAll('.fx-cards').length).toBe(2);
    expect(el.querySelector('table.tx-table')).toBeNull();
  });

  it('splits the cards between pending and paid', () => {
    const el = buildResponsive(false);
    // o mock tem f1 pago e f2/f3 a vencer
    const lists = el.querySelectorAll('.fx-cards');
    expect(lists[0].querySelectorAll('.fx-card').length).toBe(2);
    expect(lists[1].querySelectorAll('.fx-card').length).toBe(1);
  });

  it('mostra a data real do pagamento, não o dia de vencimento', () => {
    const el = buildResponsive(true);
    // f1 vence dia 5 e foi pago dia 6: a coluna tem de dizer 06.
    const pagos = el.querySelectorAll('table.tx-table')[1];
    expect(pagos.querySelector('.paid-date')?.textContent).toContain('06/mai');
  });
});

/** No molde do buildResponsive acima, mas devolvendo o mock para as asserções. */
function buildFixed() {
  const data = { ...mockDataService(), removeFixed: jest.fn(), unpayFixed: jest.fn() };
  TestBed.configureTestingModule({
    imports: [FixedComponent],
    providers: [
      { provide: AppDataService, useValue: data },
      { provide: AuthService, useValue: { canWrite: signal(true) } },
    ],
  });
  const fixture = TestBed.createComponent(FixedComponent);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, data };
}

describe('FixedComponent — remover', () => {
  it('pede confirmação antes de remover', () => {
    const { component, data } = buildFixed();
    component.askRemove('f1');
    expect(component.confirmingRemoval()).toBe('f1');
    expect(data.removeFixed).not.toHaveBeenCalled();
  });

  it('remove ao confirmar', () => {
    const { component, data } = buildFixed();
    component.askRemove('f1');
    component.confirmRemove();
    expect(data.removeFixed).toHaveBeenCalledWith('f1');
    expect(component.confirmingRemoval()).toBeNull();
  });

  it('não remove ao cancelar', () => {
    const { component, data } = buildFixed();
    component.askRemove('f1');
    component.cancelRemove();
    expect(data.removeFixed).not.toHaveBeenCalled();
    expect(component.confirmingRemoval()).toBeNull();
  });
});

describe('FixedComponent — desfazer pagamento', () => {
  it('pede confirmação antes de desfazer, porque apaga um lançamento', () => {
    const { component, data } = buildFixed();
    component.askUnpay(FIXED[0]);
    expect(component.confirmingUnpay()?.id).toBe('f1');
    expect(data.unpayFixed).not.toHaveBeenCalled();
  });

  it('desfaz ao confirmar', () => {
    const { component, data } = buildFixed();
    component.askUnpay(FIXED[0]);
    component.confirmUnpay();
    expect(data.unpayFixed).toHaveBeenCalledWith('f1');
    expect(component.confirmingUnpay()).toBeNull();
  });

  it('não desfaz ao cancelar', () => {
    const { component, data } = buildFixed();
    component.askUnpay(FIXED[0]);
    component.cancelUnpay();
    expect(data.unpayFixed).not.toHaveBeenCalled();
    expect(component.confirmingUnpay()).toBeNull();
  });
});
