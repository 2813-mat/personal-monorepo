import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import type { Goal } from '@caixa-familia/shared-types';
import { GoalsComponent } from './goals.component';
import { AppDataService } from '../../layout/app-data.service';
import { AuthService } from '../../core/auth/auth.service';

const GOALS: Goal[] = [
  {
    id: 'sos',
    label: 'Reserva',
    target: 30000,
    balance: 12000,
    monthly: 800,
    color: '#0B6E2F',
    subtitle: 'emergência',
    type: 'emergencia',
    history: new Array(12).fill(0),
    contributionCount: 4,
  },
];

function build(goals = GOALS, canWrite = true) {
  const data = {
    goals: signal(goals),
    createGoal: jest.fn(),
    updateGoal: jest.fn(),
  };
  TestBed.configureTestingModule({
    imports: [GoalsComponent],
    providers: [
      { provide: AppDataService, useValue: data },
      { provide: AuthService, useValue: { canWrite: signal(canWrite) } },
    ],
  });
  const fixture = TestBed.createComponent(GoalsComponent);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement, data, c: fixture.componentInstance };
}

const novaMetaBtn = (el: HTMLElement) => el.querySelector('.head-btn') as HTMLButtonElement;

afterEach(() => TestBed.resetTestingModule());

describe('GoalsComponent · criar meta', () => {
  it('oferece o botão de nova meta', () => {
    expect(novaMetaBtn(build().el).textContent).toContain('Nova meta');
  });

  it('abre o drawer vazio ao clicar', () => {
    const { el, fixture } = build();
    expect(el.querySelector('cf-goal-edit-drawer')).toBeNull();
    novaMetaBtn(el).click();
    fixture.detectChanges();
    expect(el.querySelector('cf-goal-edit-drawer')).not.toBeNull();
  });

  it('bloqueia o botão para quem só lê', () => {
    expect(novaMetaBtn(build(GOALS, false).el).disabled).toBe(true);
  });
});

describe('GoalsComponent · sem metas', () => {
  it('mostra o estado vazio no lugar dos cards', () => {
    const { el } = build([]);
    expect(el.querySelector('.goals-empty')).not.toBeNull();
    expect(el.querySelector('cf-goal-card')).toBeNull();
  });

  it('esconde a projeção — não há o que projetar', () => {
    expect(build([]).el.querySelector('.panel-title')).toBeNull();
  });

  it('não mostra NaN% no percentual atingido', () => {
    const { c, el } = build([]);
    expect(c.totalPct()).toBe(0);
    expect(el.textContent).not.toContain('NaN');
  });

  it('ainda deixa criar a primeira meta', () => {
    expect(novaMetaBtn(build([]).el).disabled).toBe(false);
  });

  it('convida a criar direto do estado vazio', () => {
    const { el, fixture } = build([]);
    const acao = el.querySelector('.empty__btn') as HTMLButtonElement;
    expect(acao.textContent).toContain('Criar primeira meta');
    acao.click();
    fixture.detectChanges();
    expect(el.querySelector('cf-goal-edit-drawer')).not.toBeNull();
  });

  it('não convida quem só lê', () => {
    const { el } = build([], false);
    expect(el.querySelector('.empty__btn')).toBeNull();
  });
});
