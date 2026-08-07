import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import type { Income, RecurringIncome } from '@caixa-familia/shared-types';
import { IncomeEditDrawerComponent } from './income-edit-drawer.component';
import { RecurringIncomeEditDrawerComponent } from './recurring-income-edit-drawer.component';
import { AppDataService } from '../../layout/app-data.service';

const DO_TEMPLATE: Income = {
  id: 'i1', label: 'Salário Mateus', holder: 'Mateus', value: 8000,
  date: '2026-08-05', recurring: true, recurringIncomeId: 'r1',
};

const AVULSA: Income = {
  id: 'i2', label: 'Freela', holder: 'Mateus', value: 1200,
  date: '2026-08-20', recurring: false,
};

const TEMPLATE: RecurringIncome = {
  id: 'r1', label: 'Salário Mateus', holder: 'Mateus', value: 8000, day: 5,
  startDate: '2026-08-01',
};

function mockData() {
  return {
    updateIncome: jest.fn(),
    createRecurringIncome: jest.fn(),
    updateRecurringIncome: jest.fn(),
    categories: signal([]),
  };
}

function buildIncome(income: Income) {
  const data = mockData();
  TestBed.configureTestingModule({
    imports: [IncomeEditDrawerComponent],
    providers: [{ provide: AppDataService, useValue: data }],
  });
  const fixture = TestBed.createComponent(IncomeEditDrawerComponent);
  fixture.componentRef.setInput('income', income);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement, data, c: fixture.componentInstance };
}

function buildTemplate(template: RecurringIncome | null) {
  const data = mockData();
  TestBed.configureTestingModule({
    imports: [RecurringIncomeEditDrawerComponent],
    providers: [{ provide: AppDataService, useValue: data }],
  });
  const fixture = TestBed.createComponent(RecurringIncomeEditDrawerComponent);
  fixture.componentRef.setInput('template', template);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement, data, c: fixture.componentInstance };
}

afterEach(() => TestBed.resetTestingModule());

describe('IncomeEditDrawerComponent', () => {
  it('avisa que a edição vale só para este mês quando a linha veio do template', () => {
    const { el } = buildIncome(DO_TEMPLATE);
    expect(el.querySelector('.scope-note')).not.toBeNull();
    expect(el.querySelector('.scope-note').textContent).toContain('só para este mês');
  });

  it('não mostra o aviso numa receita avulsa', () => {
    expect(buildIncome(AVULSA).el.querySelector('.scope-note')).toBeNull();
  });

  it('preserva o vínculo com o template ao salvar', () => {
    const { c, data } = buildIncome(DO_TEMPLATE);
    c.form.controls.value.setValue(12000);
    c.form.markAsDirty();
    c.save();
    expect(data.updateIncome).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'i1', value: 12000, recurringIncomeId: 'r1' }),
    );
  });

  it('mantém Salvar desabilitado enquanto nada mudou', () => {
    expect(buildIncome(AVULSA).el.querySelector('.save-btn').disabled).toBe(true);
  });
});

describe('RecurringIncomeEditDrawerComponent', () => {
  it('abre vazio na criação e chama createRecurringIncome', () => {
    const { c, data } = buildTemplate(null);
    expect(c.form.getRawValue().label).toBe('');
    c.form.setValue({ label: 'Salário Thais', value: 6000, day: 10, holder: 'Thais' });
    c.form.markAsDirty();
    c.save();
    expect(data.createRecurringIncome).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'Salário Thais', value: 6000, day: 10 }),
    );
    expect(data.updateRecurringIncome).not.toHaveBeenCalled();
  });

  it('preenche a partir do template e preserva o id ao editar', () => {
    const { c, data } = buildTemplate(TEMPLATE);
    expect(c.form.getRawValue().value).toBe(8000);
    c.form.controls.value.setValue(8500);
    c.form.markAsDirty();
    c.save();
    expect(data.updateRecurringIncome).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'r1', value: 8500 }),
    );
  });

  it('explica que a edição vale daqui em diante', () => {
    expect(buildTemplate(TEMPLATE).el.querySelector('.scope-note').textContent)
      .toContain('do mês atual em diante');
  });

  it('não salva com dia fora de 1 a 31', () => {
    const { c, data } = buildTemplate(null);
    c.form.setValue({ label: 'X', value: 100, day: 32, holder: 'shared' });
    c.form.markAsDirty();
    c.save();
    expect(data.createRecurringIncome).not.toHaveBeenCalled();
  });

  it('não salva com valor zero', () => {
    const { c, data } = buildTemplate(null);
    c.form.setValue({ label: 'X', value: 0, day: 5, holder: 'shared' });
    c.form.markAsDirty();
    c.save();
    expect(data.createRecurringIncome).not.toHaveBeenCalled();
  });
});
