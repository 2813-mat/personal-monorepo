import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ExpenseDrawerComponent } from './expense-drawer.component';
import { AppDataService } from '../../layout/app-data.service';
import type { Category, Goal, Transaction } from '@caixa-familia/shared-types';

const CATEGORIES: Category[] = [{ id: 'casa', label: 'Casa', color: '#000', budget: 100, order: 1 }];

const GOALS: Goal[] = [
  {
    id: 'sos',
    label: 'Reserva',
    target: 30000,
    balance: 1000,
    monthly: 800,
    color: '#A16207',
    subtitle: '',
    type: 'emergencia',
    history: [],
  },
];

function mockDataService() {
  return {
    categories: signal(CATEGORIES),
    cards: signal([]),
    goals: signal(GOALS),
    catBy: signal({}),
    cardBy: signal({}),
    currentMonth: signal({ year: 2026, month: 5, label: 'Maio 2026', short: 'mai' }),
    createTransaction: jest.fn(),
    createIncome: jest.fn(),
    createFixed: jest.fn(),
    addContribution: jest.fn(),
  };
}

describe('ExpenseDrawerComponent — fixed type', () => {
  let component: ExpenseDrawerComponent;
  let data: ReturnType<typeof mockDataService>;

  beforeEach(async () => {
    data = mockDataService();
    await TestBed.configureTestingModule({
      imports: [ExpenseDrawerComponent],
      providers: [{ provide: AppDataService, useValue: data }],
    }).compileComponents();

    const fixture = TestBed.createComponent(ExpenseDrawerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function fillFixed(dueDay: number | null) {
    component.form.patchValue({
      type: 'fixed',
      label: 'Aluguel',
      value: 2000,
      cat: 'casa',
      holder: 'shared',
      dueDay,
    });
  }

  function fillExpense() {
    component.form.patchValue({
      type: 'expense',
      label: 'Mercado',
      value: 50,
      cat: 'casa',
      holder: 'shared',
    });
  }

  it('requires dueDay when the type is fixed', () => {
    fillFixed(null);
    expect(component.form.controls.dueDay.valid).toBe(false);
    expect(component.form.invalid).toBe(true);
  });

  it('rejects a dueDay outside 1-31', () => {
    fillFixed(32);
    expect(component.form.controls.dueDay.valid).toBe(false);
  });

  it('does not require dueDay for a regular expense', () => {
    fillExpense();
    expect(component.form.controls.dueDay.valid).toBe(true);
    expect(component.form.valid).toBe(true);
  });

  it('routes a valid fixed submission to createFixed', () => {
    fillFixed(5);
    component.save();
    expect(data.createFixed).toHaveBeenCalledWith(
      expect.objectContaining({
        label: 'Aluguel',
        value: 2000,
        due: 5,
        cat: 'casa',
        holder: 'shared',
        paidThisMonth: false,
      }),
    );
    expect(data.createTransaction).not.toHaveBeenCalled();
    expect(data.createIncome).not.toHaveBeenCalled();
  });

  it('does not submit a fixed expense without a due day', () => {
    fillFixed(null);
    component.save();
    expect(data.createFixed).not.toHaveBeenCalled();
  });

  it('still routes a regular expense to createTransaction', () => {
    fillExpense();
    component.save();
    expect(data.createTransaction).toHaveBeenCalled();
    expect(data.createFixed).not.toHaveBeenCalled();
  });
});

describe('ExpenseDrawerComponent — contribution type', () => {
  let component: ExpenseDrawerComponent;
  let data: ReturnType<typeof mockDataService>;

  beforeEach(async () => {
    data = mockDataService();
    await TestBed.configureTestingModule({
      imports: [ExpenseDrawerComponent],
      providers: [{ provide: AppDataService, useValue: data }],
    }).compileComponents();

    const fixture = TestBed.createComponent(ExpenseDrawerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function fillContribution(goal: string | null) {
    component.form.patchValue({
      type: 'contribution',
      label: 'Aporte de maio',
      value: 500,
      date: '2026-05-22',
      holder: 'shared',
      goal,
    });
  }

  it('requires a target goal', () => {
    fillContribution(null);
    expect(component.form.controls.goal.valid).toBe(false);
    expect(component.form.invalid).toBe(true);
  });

  it('does not require a category', () => {
    fillContribution('sos');
    expect(component.form.valid).toBe(true);
  });

  it('routes a valid contribution to addContribution', () => {
    fillContribution('sos');
    component.save();
    expect(data.addContribution).toHaveBeenCalledWith('sos', 500, '2026-05-22');
  });

  it('no longer creates a transaction for a contribution', () => {
    fillContribution('sos');
    component.save();
    expect(data.createTransaction).not.toHaveBeenCalled();
  });

  it('does not submit without a goal', () => {
    fillContribution(null);
    component.save();
    expect(data.addContribution).not.toHaveBeenCalled();
  });
});

/** O arquivo constrói o drawer em cada `describe`; aqui basta um fixture cru. */
function buildDrawer() {
  const data = { ...mockDataService(), updateTransaction: jest.fn() };
  TestBed.configureTestingModule({
    imports: [ExpenseDrawerComponent],
    providers: [{ provide: AppDataService, useValue: data }],
  });
  return { fixture: TestBed.createComponent(ExpenseDrawerComponent), data };
}

describe('ExpenseDrawerComponent — aporte pré-selecionado', () => {
  it('abre no modo aporte com a meta escolhida', () => {
    const { fixture } = buildDrawer();
    fixture.componentRef.setInput('presetGoal', 'sos');
    fixture.detectChanges();
    const v = fixture.componentInstance.form.getRawValue();
    expect(v.type).toBe('contribution');
    expect(v.goal).toBe('sos');
  });

  it('abre no modo gasto quando não há meta', () => {
    const { fixture } = buildDrawer();
    fixture.detectChanges();
    expect(fixture.componentInstance.form.getRawValue().type).toBe('expense');
  });
});

const TX_EDIT: Transaction = {
  id: 't1',
  date: '2026-05-05',
  label: 'Mercado',
  value: 240,
  cat: 'casa',
  holder: 'Mateus',
  method: 'pix',
  installments: null,
  reviewed: false,
};

describe('ExpenseDrawerComponent — modo edição', () => {
  it('preenche o formulário a partir da transação', () => {
    const { fixture } = buildDrawer();
    fixture.componentRef.setInput('editing', TX_EDIT);
    fixture.detectChanges();
    expect(fixture.componentInstance.form.getRawValue()).toMatchObject({
      label: 'Mercado',
      value: 240,
    });
  });

  it('salva com updateTransaction, não createTransaction', () => {
    const { fixture, data } = buildDrawer();
    fixture.componentRef.setInput('editing', TX_EDIT);
    fixture.detectChanges();
    fixture.componentInstance.form.markAsDirty();
    fixture.componentInstance.save();
    expect(data.updateTransaction).toHaveBeenCalledWith(expect.objectContaining({ id: 't1' }));
    expect(data.createTransaction).not.toHaveBeenCalled();
  });

  it('continua criando quando não há transação em edição', () => {
    const { fixture, data } = buildDrawer();
    fixture.detectChanges();
    fixture.componentInstance.form.patchValue({ label: 'Nova', value: 10, cat: 'casa' });
    fixture.componentInstance.save();
    expect(data.createTransaction).toHaveBeenCalled();
    expect(data.updateTransaction).not.toHaveBeenCalled();
  });

  it('trava o chip de tipo na edição', () => {
    const { fixture } = buildDrawer();
    fixture.componentRef.setInput('editing', TX_EDIT);
    fixture.detectChanges();
    expect(fixture.componentInstance.form.controls.type.disabled).toBe(true);
  });

  it('desabilita os botões de tipo na edição', () => {
    const { fixture } = buildDrawer();
    fixture.componentRef.setInput('editing', TX_EDIT);
    fixture.detectChanges();
    const chips: HTMLButtonElement[] = [...fixture.nativeElement.querySelectorAll('.seg-type .seg-btn')];
    expect(chips.length).toBeGreaterThan(0);
    expect(chips.every((b) => b.disabled)).toBe(true);
  });

  it('mantém os botões de tipo clicáveis ao criar', () => {
    const { fixture } = buildDrawer();
    fixture.detectChanges();
    const chips: HTMLButtonElement[] = [...fixture.nativeElement.querySelectorAll('.seg-type .seg-btn')];
    expect(chips.some((b) => b.disabled)).toBe(false);
  });
});
