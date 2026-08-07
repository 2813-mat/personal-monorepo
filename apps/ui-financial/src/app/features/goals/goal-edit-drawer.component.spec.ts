import { TestBed } from '@angular/core/testing';
import { GoalEditDrawerComponent } from './goal-edit-drawer.component';
import { AppDataService } from '../../layout/app-data.service';
import type { Goal } from '@caixa-familia/shared-types';

const GOAL: Goal = {
  id: 'sos',
  label: 'Reserva',
  target: 30000,
  balance: 1000,
  monthly: 800,
  color: '#0B6E2F',
  subtitle: 'emergência',
  type: 'emergencia',
  history: [],
};

function build() {
  const data = { updateGoal: jest.fn() };
  TestBed.configureTestingModule({
    imports: [GoalEditDrawerComponent],
    providers: [{ provide: AppDataService, useValue: data }],
  });
  const fixture = TestBed.createComponent(GoalEditDrawerComponent);
  fixture.componentRef.setInput('goal', GOAL);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement, data, c: fixture.componentInstance };
}

afterEach(() => TestBed.resetTestingModule());

describe('GoalEditDrawerComponent', () => {
  it('preenche o formulário a partir da meta', () => {
    expect(build().c.form.getRawValue()).toMatchObject({
      label: 'Reserva',
      target: 30000,
      monthly: 800,
      type: 'emergencia',
    });
  });

  it('mantém Salvar desabilitado enquanto nada mudou', () => {
    expect(build().el.querySelector('.save-btn').disabled).toBe(true);
  });

  it('preserva balance e history ao salvar', () => {
    const { c, data } = build();
    c.form.controls.monthly.setValue(900);
    c.form.markAsDirty();
    c.save();
    expect(data.updateGoal).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'sos', monthly: 900, balance: 1000 }),
    );
  });
});
