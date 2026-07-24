import { wireToGoal } from './goal.mapper';
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
