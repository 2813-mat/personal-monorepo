import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import type { Income, RecurringIncome } from '@caixa-familia/shared-types';
import { IncomesComponent } from './incomes.component';
import { AppDataService } from '../../layout/app-data.service';
import { ViewportService } from '../../core/viewport.service';
import { AuthService } from '../../core/auth/auth.service';

const DO_MES: Income[] = [
  // Veio do template: editar esta linha vale só para agosto.
  { id: 'i1', label: 'Salário Mateus', holder: 'Mateus', value: 8000, date: '2026-08-05',
    recurring: true, recurringIncomeId: 'r1' },
  { id: 'i2', label: 'Freela', holder: 'Mateus', value: 1200, date: '2026-08-20',
    recurring: false },
];

const TEMPLATES: RecurringIncome[] = [
  { id: 'r1', label: 'Salário Mateus', holder: 'Mateus', value: 8000, day: 5,
    startDate: '2026-08-01' },
];

function build(isDesktop = true, incomes = DO_MES, templates = TEMPLATES) {
  const data = {
    incomes: signal(incomes),
    recurringIncomes: signal(templates),
    monthLabel: signal('Agosto 2026'),
    removeIncome: jest.fn(),
    removeRecurringIncome: jest.fn(),
    updateIncome: jest.fn(),
    updateRecurringIncome: jest.fn(),
    createRecurringIncome: jest.fn(),
  };
  TestBed.configureTestingModule({
    imports: [IncomesComponent],
    providers: [
      { provide: AppDataService, useValue: data },
      { provide: ViewportService, useValue: { isDesktop: signal(isDesktop) } },
      { provide: AuthService, useValue: { canWrite: signal(true) } },
    ],
  });
  const fixture = TestBed.createComponent(IncomesComponent);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement, data, c: fixture.componentInstance };
}

afterEach(() => TestBed.resetTestingModule());

describe('IncomesComponent — totais', () => {
  it('separa o que é recorrente do que é avulso', () => {
    const { c } = build();
    expect(c.totalDoMes()).toBe(9200);
    expect(c.totalRecorrente()).toBe(8000);
    expect(c.totalAvulso()).toBe(1200); // só o freela
  });

  it('ordena as receitas do mês por data e os templates por dia', () => {
    const { c } = build();
    expect(c.doMes().map((i) => i.id)).toEqual(['i1', 'i2']);
    expect(c.recorrentes().map((r) => r.id)).toEqual(['r1']);
  });
});

describe('IncomesComponent — listagem', () => {
  it('mostra as duas listas no desktop', () => {
    const { el } = build(true);
    expect(el.querySelectorAll('table.tx-table').length).toBe(2);
    expect(el.querySelector('.inc-cards')).toBeNull();
  });

  it('vira lista de cards no celular', () => {
    const { el } = build(false);
    expect(el.querySelectorAll('.inc-cards').length).toBe(2);
    expect(el.querySelector('table.tx-table')).toBeNull();
  });

  it('convida a cadastrar o salário quando não há recorrente', () => {
    const { el } = build(true, DO_MES, []);
    expect(el.textContent).toContain('Cadastre o salário aqui');
  });
});

describe('IncomesComponent — remoção', () => {
  it('confirma antes de remover a receita do mês', () => {
    const { fixture, el, data, c } = build();
    c.askRemoveIncome('i1');
    fixture.detectChanges();
    expect(el.querySelector('cf-confirm-modal')).not.toBeNull();
    expect(data.removeIncome).not.toHaveBeenCalled();

    c.confirmRemoveIncome();
    expect(data.removeIncome).toHaveBeenCalledWith('i1');
  });

  it('avisa que encerrar o recorrente preserva o histórico', () => {
    const { fixture, el, c } = build();
    c.askRemoveTemplate('r1');
    fixture.detectChanges();
    expect(el.querySelector('cf-confirm-modal').textContent).toContain('continuam no histórico');
  });

  it('não remove nada ao cancelar', () => {
    const { data, c } = build();
    c.askRemoveTemplate('r1');
    c.confirmingTemplate.set(null);
    expect(data.removeRecurringIncome).not.toHaveBeenCalled();
  });
});

describe('IncomesComponent — drawers', () => {
  it('abre o drawer de criação sem template preenchido', () => {
    const { fixture, el, c } = build();
    c.openNewTemplate();
    fixture.detectChanges();
    expect(el.querySelector('cf-recurring-income-edit-drawer')).not.toBeNull();
    expect(c.editingTemplate()).toBeNull();
  });

  it('fecha o drawer de template limpando os dois sinais', () => {
    const { c } = build();
    c.openNewTemplate();
    c.closeTemplateDrawer();
    expect(c.creatingTemplate()).toBe(false);
    expect(c.editingTemplate()).toBeNull();
  });
});
