import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { FixedEditDrawerComponent } from './fixed-edit-drawer.component';
import { AppDataService } from '../../layout/app-data.service';
import type { FixedExpense, Category } from '@caixa-familia/shared-types';

const FIXED: FixedExpense = {
  id: 'f1',
  label: 'Luz',
  value: 200,
  due: 10,
  cat: 'casa',
  holder: 'shared',
  paidThisMonth: false,
};
const CATEGORIES: Category[] = [
  { id: 'casa', label: 'Casa', color: '#7A4F1D', budget: 500, order: 1 },
];

function build() {
  const data = { updateFixed: jest.fn(), categories: signal(CATEGORIES) };
  TestBed.configureTestingModule({
    imports: [FixedEditDrawerComponent],
    providers: [{ provide: AppDataService, useValue: data }],
  });
  const fixture = TestBed.createComponent(FixedEditDrawerComponent);
  fixture.componentRef.setInput('fixed', FIXED);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement, data, c: fixture.componentInstance };
}

afterEach(() => TestBed.resetTestingModule());

describe('FixedEditDrawerComponent', () => {
  it('preenche o formulário a partir do gasto fixo', () => {
    expect(build().c.form.getRawValue()).toMatchObject({
      label: 'Luz',
      value: 200,
      due: 10,
      cat: 'casa',
      holder: 'shared',
    });
  });

  it('mantém Salvar desabilitado enquanto nada mudou', () => {
    expect(build().el.querySelector('.save-btn').disabled).toBe(true);
  });

  it('salva preservando o id', () => {
    const { c, data } = build();
    c.form.controls.value.setValue(300);
    c.form.markAsDirty();
    c.save();
    expect(data.updateFixed).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'f1', value: 300 }),
    );
  });
});
