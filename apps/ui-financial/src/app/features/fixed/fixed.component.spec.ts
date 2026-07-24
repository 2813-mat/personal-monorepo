import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { FixedComponent } from './fixed.component';
import { AppDataService } from '../../layout/app-data.service';
import type { FixedExpense, Transaction, Income, Category } from '@caixa-familia/shared-types';

const FIXED: FixedExpense[] = [
  { id: 'f1', label: 'Conta A', value: 100, due: 5,  cat: 'casa',  holder: 'shared', paidThisMonth: true  },
  { id: 'f2', label: 'Conta B', value: 200, due: 15, cat: 'assin', holder: 'Mateus', paidThisMonth: false },
  { id: 'f3', label: 'Conta C', value: 300, due: 25, cat: 'educ',  holder: 'Thais',  paidThisMonth: false },
];

const TRANSACTIONS: Transaction[] = [
  // recurring, value matches f1
  { id: 't1', date: '2026-05-05', label: 'Conta A', value: 100, cat: 'casa',  holder: 'shared', method: 'pix', installments: null, recurring: true },
  // recurring, value does NOT match any fixed item
  { id: 't2', date: '2026-05-10', label: 'Spotify', value: 32,  cat: 'assin', holder: 'Mateus', method: 'pix', installments: null, recurring: true },
  // recurring, value coincidentally matches f2 — must NOT make it paid
  { id: 't3', date: '2026-05-12', label: 'Compra',  value: 200, cat: 'lazer', holder: 'shared', method: 'nu-t', installments: null, recurring: true },
];

const INCOMES: Income[] = [
  { id: 'i1', label: 'Salário', holder: 'Mateus', value: 1000, date: '2026-05-05', recurring: true },
];

const CAT_BY: Record<string, Category> = {
  casa:  { id: 'casa',  label: 'Casa',       color: '#7A4F1D', budget: 500 },
  assin: { id: 'assin', label: 'Assinaturas', color: '#0F2D4F', budget: 150 },
  educ:  { id: 'educ',  label: 'Educação',   color: '#3F2C7A', budget: 920 },
};

function mockDataService() {
  return {
    fixed: signal(FIXED),
    transactions: signal(TRANSACTIONS),
    incomes: signal(INCOMES),
    catBy: signal(CAT_BY),
  };
}

describe('FixedComponent', () => {
  let component: FixedComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FixedComponent],
      providers: [{ provide: AppDataService, useValue: mockDataService() }],
    }).compileComponents();

    const fixture = TestBed.createComponent(FixedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('paidItems', () => {
    it('includes only fixed items flagged as paid this month', () => {
      expect(component.paidItems().map(f => f.id)).toEqual(['f1']);
    });

    it('ignores transaction values entirely', () => {
      // t3 is recurring with value 200 = f2.value; only paidThisMonth decides,
      // so f2 must stay pending
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

    it('totalPaid is sum of paid item values', () => {
      expect(component.totalPaid()).toBeCloseTo(100);
    });

    it('totalPending is sum of pending item values', () => {
      expect(component.totalPending()).toBeCloseTo(500);
    });

    it('pctReceita is totalFixed / total incomes', () => {
      expect(component.pctReceita()).toBeCloseTo(0.6);
    });
  });

  describe('formatPercent', () => {
    it('formats ratio as integer percent string', () => {
      expect(component.formatPercent(0.6)).toBe('60%');
      expect(component.formatPercent(0.533)).toBe('53%');
    });
  });

  describe('formatDay', () => {
    it('zero-pads day and appends /mai', () => {
      expect(component.formatDay(5)).toBe('05/mai');
      expect(component.formatDay(25)).toBe('25/mai');
    });
  });
});
