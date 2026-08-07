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
    activeCards: signal([]),
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

const ATIVO = {
  id: 'c1', name: 'Nubank', holder: 'Thais' as const, bank: 'Nubank', color: '#820AD1',
  closing: 5, due: 12, current: 0, limit: 4500, last4: '4421', archived: false,
};
const ARQUIVADO = {
  id: 'c2', name: 'Itau', holder: 'Mateus' as const, bank: 'Itau', color: '#EC7000',
  closing: 8, due: 15, current: 0, limit: 3800, last4: '3367', archived: true,
};

describe('ExpenseDrawerComponent — cartão arquivado', () => {
  it('não oferece cartão arquivado como método', () => {
    const data = {
      ...mockDataService(),
      cards: signal([ATIVO, ARQUIVADO]),
      activeCards: signal([ATIVO]),
    };
    TestBed.configureTestingModule({
      imports: [ExpenseDrawerComponent],
      providers: [{ provide: AppDataService, useValue: data }],
    });
    const fixture = TestBed.createComponent(ExpenseDrawerComponent);
    fixture.detectChanges();
    const texto = fixture.nativeElement.textContent;
    expect(texto).toContain('Nubank');
    expect(texto).not.toContain('Itau');
  });
});

const TX_CARTAO: Transaction = {
  id: 't9',
  date: '2026-05-05',
  label: 'Mercado',
  value: 240,
  cat: 'casa',
  holder: 'Mateus',
  method: 'c1',
  installments: null,
  reviewed: false,
};

describe('ExpenseDrawerComponent — trocar o cartão na edição', () => {
  function buildComCartoes() {
    const data = {
      ...mockDataService(),
      cards: signal([ATIVO, { ...ATIVO, id: 'c3', bank: 'Inter', name: 'Inter' }]),
      activeCards: signal([ATIVO, { ...ATIVO, id: 'c3', bank: 'Inter', name: 'Inter' }]),
      updateTransaction: jest.fn(),
    };
    TestBed.configureTestingModule({
      imports: [ExpenseDrawerComponent],
      providers: [{ provide: AppDataService, useValue: data }],
    });
    const fixture = TestBed.createComponent(ExpenseDrawerComponent);
    fixture.componentRef.setInput('editing', TX_CARTAO);
    fixture.detectChanges();
    return { fixture, data };
  }

  it('habilita Salvar ao escolher outro cartão', () => {
    const { fixture } = buildComCartoes();
    const linhas: HTMLButtonElement[] = [
      ...fixture.nativeElement.querySelectorAll('.method-row'),
    ];
    const inter = linhas.find((b) => b.textContent?.includes('Inter'));
    if (!inter) throw new Error('linha do cartão Inter não renderizou');
    inter.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.form.pristine).toBe(false);
  });

  it('manda o cartão novo ao salvar', () => {
    const { fixture, data } = buildComCartoes();
    const linhas: HTMLButtonElement[] = [
      ...fixture.nativeElement.querySelectorAll('.method-row'),
    ];
    const inter = linhas.find((b) => b.textContent?.includes('Inter'));
    if (!inter) throw new Error('linha do cartão Inter não renderizou');
    inter.click();
    fixture.detectChanges();
    fixture.componentInstance.save();
    expect(data.updateTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ id: 't9', method: 'c3' }),
    );
  });

  it('a categoria escolhida por chip também habilita Salvar', () => {
    const { fixture } = buildComCartoes();
    const chips: HTMLButtonElement[] = [...fixture.nativeElement.querySelectorAll('.cat-chip')];
    chips[0].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.form.pristine).toBe(false);
  });
});

/**
 * O drawer monta um objeto diferente por tipo, e o template mostrava campos que
 * o objeto de receita descarta: categoria, método de pagamento e parcelamento
 * apareciam e não chegavam ao `Income`. Estes casos existem para que a tela não
 * volte a prometer campo que não vai a lugar nenhum.
 */
describe('ExpenseDrawerComponent — receita não mostra campo que descarta', () => {
  function buildReceita() {
    const data = mockDataService();
    TestBed.configureTestingModule({
      imports: [ExpenseDrawerComponent],
      providers: [{ provide: AppDataService, useValue: data }],
    });
    const fixture = TestBed.createComponent(ExpenseDrawerComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance;
    c.pick(c.form.controls.type, 'income');
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement, data, c };
  }

  it('esconde a grade de categorias', () => {
    expect(buildReceita().el.querySelector('.cat-grid')).toBeNull();
  });

  it('esconde o método de pagamento', () => {
    expect(buildReceita().el.querySelector('.method-list')).toBeNull();
  });

  it('esconde parcelamento e o toggle de recorrente', () => {
    expect(buildReceita().el.querySelector('.toggle-grid')).toBeNull();
  });

  it('aponta para /incomes em vez de oferecer um recorrente que não recorre', () => {
    expect(buildReceita().el.querySelector('.type-note').textContent).toContain('Receitas');
  });

  it('chama a receita pelo nome no cabeçalho e no botão', () => {
    const { el } = buildReceita();
    expect(el.querySelector('.head-title').textContent).toContain('Nova receita');
    expect(el.querySelector('.save-btn').textContent).toContain('Salvar receita');
  });

  it('pergunta de quem é a receita, não quem fez o gasto', () => {
    const labels = [...buildReceita().el.querySelectorAll('.label')].map((l) => l.textContent);
    expect(labels).toContain('De quem é a receita');
    expect(labels).not.toContain('Quem fez o gasto');
  });

  it('salva sem exigir categoria e sem carregar método nem parcelas', () => {
    const { c, data } = buildReceita();
    c.form.patchValue({ label: 'Freela', value: 1200, date: '2026-08-20', holder: 'Mateus' });
    c.save();
    expect(data.createIncome).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'Freela', value: 1200, holder: 'Mateus' }),
    );
    const enviado = data.createIncome.mock.calls[0][0];
    expect(enviado).not.toHaveProperty('cat');
    expect(enviado).not.toHaveProperty('method');
    expect(enviado).not.toHaveProperty('installments');
  });

  it('não deixa o recorrente marcado numa despesa vazar para a receita', () => {
    const { fixture, c, data } = buildReceita();
    // Volta para despesa, marca recorrente, e retorna para receita.
    c.pick(c.form.controls.type, 'expense');
    c.form.controls.recurring.setValue(true);
    c.pick(c.form.controls.type, 'income');
    fixture.detectChanges();

    c.form.patchValue({ label: 'Bônus', value: 500, date: '2026-08-20', holder: 'Thais' });
    c.save();
    expect(data.createIncome).toHaveBeenCalledWith(
      expect.objectContaining({ recurring: false }),
    );
  });

  it('a despesa continua com os três campos', () => {
    const data = mockDataService();
    TestBed.configureTestingModule({
      imports: [ExpenseDrawerComponent],
      providers: [{ provide: AppDataService, useValue: data }],
    });
    const fixture = TestBed.createComponent(ExpenseDrawerComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement;
    expect(el.querySelector('.cat-grid')).not.toBeNull();
    expect(el.querySelector('.method-list')).not.toBeNull();
    expect(el.querySelector('.toggle-grid')).not.toBeNull();
  });
});
