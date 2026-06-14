import { Money } from './money.vo';

describe('Money', () => {
  it('soma sem erro de ponto flutuante', () => {
    expect(Money.of(0.1).add(Money.of(0.2)).toNumber()).toBe(0.3);
  });
  it('rejeita NaN', () => {
    expect(() => Money.of(NaN)).toThrow();
  });
});
