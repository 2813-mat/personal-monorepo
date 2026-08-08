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
  contributionCount: 3,
};

/** `goal` ausente é o modo criação. */
function build(goal: Goal | null = GOAL) {
  const data = { updateGoal: jest.fn(), createGoal: jest.fn() };
  TestBed.configureTestingModule({
    imports: [GoalEditDrawerComponent],
    providers: [{ provide: AppDataService, useValue: data }],
  });
  const fixture = TestBed.createComponent(GoalEditDrawerComponent);
  if (goal) fixture.componentRef.setInput('goal', goal);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement, data, c: fixture.componentInstance };
}

afterEach(() => TestBed.resetTestingModule());

describe('GoalEditDrawerComponent · edição', () => {
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

  it('não preserva a contagem de aportes por acidente — ela vem do servidor', () => {
    const { c, data } = build();
    c.form.controls.monthly.setValue(900);
    c.form.markAsDirty();
    c.save();
    expect(data.updateGoal.mock.calls[0][0]).toMatchObject({ contributionCount: 3 });
  });
});

describe('GoalEditDrawerComponent · criação', () => {
  const preencher = (c: GoalEditDrawerComponent) => {
    c.form.setValue({
      label: 'Viagem',
      subtitle: 'Japão · 2028',
      target: 40000,
      monthly: 900,
      color: '#A16207',
      type: 'sonho',
    });
    c.form.markAsDirty();
  };

  it('abre com o formulário vazio', () => {
    expect(build(null).c.form.getRawValue()).toMatchObject({
      label: '',
      subtitle: '',
      target: 0,
      monthly: 0,
      type: 'sonho',
    });
  });

  it('anuncia que é uma meta nova', () => {
    const { el } = build(null);
    expect(el.querySelector('.head-title').textContent).toContain('Nova meta');
    expect(el.querySelector('.save-btn').textContent).toContain('Criar meta');
  });

  it('não mostra slug no rodapé — a meta ainda não tem', () => {
    expect(build(null).el.querySelector('.foot-hint').textContent.trim()).toBe('');
  });

  it('cria a meta em vez de atualizar', () => {
    const { c, data } = build(null);
    preencher(c);
    c.save();
    expect(data.createGoal).toHaveBeenCalledWith({
      label: 'Viagem',
      subtitle: 'Japão · 2028',
      target: 40000,
      monthly: 900,
      color: '#A16207',
      type: 'sonho',
    });
    expect(data.updateGoal).not.toHaveBeenCalled();
  });

  it('fecha depois de criar', () => {
    const { c } = build(null);
    const closed = jest.fn();
    c.closed.subscribe(closed);
    preencher(c);
    c.save();
    expect(closed).toHaveBeenCalled();
  });

  it('recusa objetivo zerado — o card dividiria o saldo por ele', () => {
    const { c, data } = build(null);
    preencher(c);
    c.form.controls.target.setValue(0);
    c.save();
    expect(data.createGoal).not.toHaveBeenCalled();
  });

  it('recusa aporte mensal zerado — o prazo dividiria por ele', () => {
    const { c, data } = build(null);
    preencher(c);
    c.form.controls.monthly.setValue(0);
    c.save();
    expect(data.createGoal).not.toHaveBeenCalled();
  });

  it('recusa meta sem nome', () => {
    const { c, data } = build(null);
    preencher(c);
    c.form.controls.label.setValue('');
    c.save();
    expect(data.createGoal).not.toHaveBeenCalled();
  });

  it('aceita descrição vazia', () => {
    const { c, data } = build(null);
    preencher(c);
    c.form.controls.subtitle.setValue('');
    c.save();
    expect(data.createGoal).toHaveBeenCalledWith(expect.objectContaining({ subtitle: '' }));
  });
});

describe('GoalEditDrawerComponent · seletor de cor', () => {
  it('abre com uma cor válida escolhida, sem digitar hexadecimal', () => {
    const { c } = build(null);
    expect(c.form.controls.color.value).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(c.form.controls.color.valid).toBe(true);
  });

  it('oferece a paleta em vez de campo de texto', () => {
    const { el } = build(null);
    expect(el.querySelectorAll('.swatch').length).toBeGreaterThan(1);
    expect(el.querySelector('input#goal-color').type).toBe('color');
  });

  it('escolher uma amostra troca a cor e habilita Salvar', () => {
    const { c, el, fixture } = build();
    const amostras: HTMLButtonElement[] = Array.from(el.querySelectorAll('.swatch'));
    const alvo = amostras.find((s) => !s.classList.contains('active'));
    alvo?.click();
    fixture.detectChanges();

    expect(alvo?.classList.contains('active')).toBe(true);
    expect(c.form.dirty).toBe(true);
    expect(c.form.controls.color.value).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it('marca a amostra da meta em edição', () => {
    const { el } = build({ ...GOAL, color: '#a16207' });
    expect(el.querySelector('.swatch.active').getAttribute('aria-label')).toBe('Mostarda');
  });

  it('recusa uma cor que não é hexadecimal', () => {
    const { c, data } = build(null);
    c.form.setValue({
      label: 'Viagem',
      subtitle: '',
      target: 40000,
      monthly: 900,
      color: 'verde',
      type: 'sonho',
    });
    c.form.markAsDirty();
    c.save();
    expect(data.createGoal).not.toHaveBeenCalled();
  });
});
