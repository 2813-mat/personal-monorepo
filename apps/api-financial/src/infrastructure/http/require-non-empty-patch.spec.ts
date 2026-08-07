import { BadRequestException } from '@nestjs/common';
import { requireNonEmptyPatch } from './require-non-empty-patch';

describe('requireNonEmptyPatch', () => {
  it('devolve o dto quando há ao menos um campo', () => {
    const dto = { label: 'Casa' };
    expect(requireNonEmptyPatch(dto)).toBe(dto);
  });

  it('rejeita corpo vazio', () => {
    expect(() => requireNonEmptyPatch({})).toThrow(BadRequestException);
  });

  it('aceita campo com valor falsy', () => {
    // budget: 0 é uma edição legítima e não pode ser confundida com corpo vazio
    expect(() => requireNonEmptyPatch({ budget: 0 })).not.toThrow();
  });

  it('aceita campo explicitamente nulo', () => {
    expect(() => requireNonEmptyPatch({ note: null })).not.toThrow();
  });
});
