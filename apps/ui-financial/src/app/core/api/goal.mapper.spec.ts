import { wireToGoal, goalToUpdateWire } from './goal.mapper';
import type { GoalWire } from './wire.types';

const wire: GoalWire = {
  id: 'cuid-1',
  slug: 'sos',
  label: 'Reserva de emergência',
  target: 30000,
  monthly: 800,
  color: '#A16207',
  subtitle: 'colchão · 6 meses',
  type: 'EMERGENCIA',
  balance: 18420,
  history: [500, 500, 500, 600, 600, 700, 700, 800, 800, 800, 800, 800],
};

describe('wireToGoal', () => {
  it('uses the slug as the domain id, dropping the cuid', () => {
    expect(wireToGoal(wire).id).toBe('sos');
  });

  it('lowercases the goal type', () => {
    expect(wireToGoal(wire).type).toBe('emergencia');
    expect(wireToGoal({ ...wire, type: 'SONHO' }).type).toBe('sonho');
  });

  it('maps the remaining fields one to one', () => {
    expect(wireToGoal(wire)).toEqual({
      id: 'sos',
      label: 'Reserva de emergência',
      target: 30000,
      balance: 18420,
      monthly: 800,
      color: '#A16207',
      subtitle: 'colchão · 6 meses',
      type: 'emergencia',
      history: [500, 500, 500, 600, 600, 700, 700, 800, 800, 800, 800, 800],
    });
  });
});

describe('goalToUpdateWire', () => {
  const goal = {
    id: 'sos',
    label: 'Reserva',
    target: 30000,
    balance: 0,
    monthly: 800,
    color: '#0B6E2F',
    subtitle: 'emergência',
    type: 'emergencia' as const,
    history: [],
  };

  it('devolve o type em maiúsculo, como o wire espera', () => {
    expect(goalToUpdateWire(goal)).toMatchObject({ type: 'EMERGENCIA' });
  });

  it('não envia o slug — não é editável', () => {
    expect(goalToUpdateWire(goal)).not.toHaveProperty('slug');
  });

  it('não envia balance nem history — são derivados', () => {
    const wire = goalToUpdateWire(goal);
    expect(wire).not.toHaveProperty('balance');
    expect(wire).not.toHaveProperty('history');
  });
});
