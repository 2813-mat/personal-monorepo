import { Prisma } from '@prisma/client';
import { GoalRow, monthlyHistory, toView } from './goal.mapper';

const dec = (n: number) => new Prisma.Decimal(n);

describe('monthlyHistory', () => {
  const ref = new Date(2026, 4, 15); // Mai/2026

  it('coloca a contribuição do mês corrente no último bucket', () => {
    const h = monthlyHistory([{ amount: dec(300), date: new Date(2026, 4, 22) }], ref);
    expect(h).toHaveLength(12);
    expect(h[11]).toBe(300);
    expect(h.slice(0, 11).every((x) => x === 0)).toBe(true);
  });

  it('soma múltiplas contribuições no mesmo mês', () => {
    const h = monthlyHistory(
      [
        { amount: dec(100), date: new Date(2025, 5, 10) }, // Jun/2025 -> bucket 0
        { amount: dec(50), date: new Date(2025, 5, 20) },
      ],
      ref,
    );
    expect(h[0]).toBe(150);
  });

  it('ignora contribuições fora da janela de 12 meses', () => {
    const h = monthlyHistory([{ amount: dec(999), date: new Date(2025, 3, 1) }], ref); // Abr/2025, 13 meses atrás
    expect(h.every((x) => x === 0)).toBe(true);
  });
});

describe('toView.contributionCount', () => {
  const ref = new Date(2026, 4, 15);
  const row = (contributions: { amount: Prisma.Decimal; date: Date }[]) =>
    ({
      id: 'cuid-1',
      householdId: 'h1',
      slug: 'sos',
      label: 'Reserva',
      target: dec(30000),
      monthly: dec(800),
      color: '#0B6E2F',
      subtitle: 'emergência',
      type: 'EMERGENCIA',
      contributions,
    }) as unknown as GoalRow;

  it('conta zero para uma meta recém-criada, mesmo com history de 12 posições', () => {
    const view = toView(row([]), ref);
    expect(view.contributionCount).toBe(0);
    expect(view.history).toHaveLength(12);
  });

  it('conta cada aporte, e não os meses em que houve aporte', () => {
    const view = toView(
      row([
        { amount: dec(100), date: new Date(2026, 4, 2) },
        { amount: dec(200), date: new Date(2026, 4, 20) },
      ]),
      ref,
    );
    expect(view.contributionCount).toBe(2);
  });

  it('conta aportes antigos que a janela de 12 meses já não mostra', () => {
    const view = toView(row([{ amount: dec(999), date: new Date(2024, 0, 1) }]), ref);
    expect(view.contributionCount).toBe(1);
    expect(view.history.every((x) => x === 0)).toBe(true);
  });
});
