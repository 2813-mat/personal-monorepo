import { normalizeMethodFilter } from './method-filter';

describe('normalizeMethodFilter', () => {
  it('normaliza minúsculas do frontend para o enum do banco', () => {
    expect(normalizeMethodFilter('pix')).toBe('PIX');
    expect(normalizeMethodFilter('card')).toBe('CARD');
  });

  it('aceita valores já em maiúsculas', () => {
    expect(normalizeMethodFilter('CARD')).toBe('CARD');
  });

  it('retorna undefined para ausente ou inválido', () => {
    expect(normalizeMethodFilter(undefined)).toBeUndefined();
    expect(normalizeMethodFilter('')).toBeUndefined();
    expect(normalizeMethodFilter('boleto')).toBeUndefined();
  });
});
