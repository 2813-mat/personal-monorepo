import { monthStartOfIso, occurrenceDate, pendingMonths } from './materialization';

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

describe('occurrenceDate', () => {
  it('usa o dia pedido quando o mês alcança', () => {
    expect(iso(occurrenceDate(2026, 8, 5))).toBe('2026-08-05');
  });

  it('trunca para o último dia em mês curto', () => {
    expect(iso(occurrenceDate(2026, 2, 31))).toBe('2026-02-28');
    expect(iso(occurrenceDate(2024, 2, 31))).toBe('2024-02-29'); // bissexto
    expect(iso(occurrenceDate(2026, 4, 31))).toBe('2026-04-30');
  });
});

describe('monthStartOfIso', () => {
  // new Date('2026-08-01') é meia-noite UTC: lida com getters locais em
  // São Paulo ela volta para 31/07 e o template começaria um mês antes.
  it('lê a data como civil, sem recuar um mês no fuso negativo', () => {
    const d = monthStartOfIso('2026-08-01');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7); // agosto
    expect(d.getDate()).toBe(1);
  });

  it('descarta o dia e mantém o mês', () => {
    expect(iso(monthStartOfIso('2026-12-31'))).toBe('2026-12-01');
  });
});

describe('pendingMonths', () => {
  const start = new Date(2026, 7, 1); // agosto/2026

  it('materializa o mês de início quando nada foi gerado ainda', () => {
    expect(pendingMonths(start, null, { year: 2026, month: 8 })).toEqual([
      { year: 2026, month: 8 },
    ]);
  });

  it('não gera nada para um mês anterior ao início', () => {
    expect(pendingMonths(start, null, { year: 2026, month: 7 })).toEqual([]);
  });

  it('não regenera um mês já materializado', () => {
    const through = new Date(2026, 7, 1); // agosto já gerado
    expect(pendingMonths(start, through, { year: 2026, month: 8 })).toEqual([]);
  });

  it('preenche o buraco de quem pula meses', () => {
    const through = new Date(2026, 7, 1); // agosto
    expect(pendingMonths(start, through, { year: 2026, month: 11 })).toEqual([
      { year: 2026, month: 9 },
      { year: 2026, month: 10 },
      { year: 2026, month: 11 },
    ]);
  });

  it('atravessa a virada do ano', () => {
    const through = new Date(2026, 10, 1); // novembro
    expect(pendingMonths(start, through, { year: 2027, month: 1 })).toEqual([
      { year: 2026, month: 12 },
      { year: 2027, month: 1 },
    ]);
  });

  it('respeita o teto para não gerar uma década de linhas', () => {
    expect(pendingMonths(start, null, { year: 2046, month: 8 }).length).toBe(36);
  });
});
