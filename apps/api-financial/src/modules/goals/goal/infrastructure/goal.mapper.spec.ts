import { Prisma } from '@prisma/client';
import { monthlyHistory } from './goal.mapper';

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
