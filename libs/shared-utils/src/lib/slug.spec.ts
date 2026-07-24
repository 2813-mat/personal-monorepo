import { slugify } from './slug';

describe('slugify', () => {
  it('lowercases and trims', () => {
    expect(slugify('  Farmácia  ')).toBe('farmacia');
  });

  it('strips accents', () => {
    expect(slugify('Educação')).toBe('educacao');
    expect(slugify('Saúde')).toBe('saude');
  });

  it('replaces runs of non-alphanumerics with a single dash', () => {
    expect(slugify('Casa & Lar')).toBe('casa-lar');
    expect(slugify('Cartão (pgto)')).toBe('cartao-pgto');
  });

  it('does not leave leading or trailing dashes', () => {
    expect(slugify('!! Lazer !!')).toBe('lazer');
  });

  it('keeps digits', () => {
    expect(slugify('Plano 2026')).toBe('plano-2026');
  });

  it('returns an empty string for input with no alphanumerics', () => {
    expect(slugify('---')).toBe('');
  });
});
