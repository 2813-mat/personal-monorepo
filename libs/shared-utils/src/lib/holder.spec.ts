import { matchesHolder } from './holder';

describe('matchesHolder', () => {
  it('deixa passar tudo em "todos"', () => {
    expect(matchesHolder('todos', 'Mateus')).toBe(true);
    expect(matchesHolder('todos', 'Thais')).toBe(true);
    expect(matchesHolder('todos', 'shared')).toBe(true);
  });

  it('mostra o próprio titular', () => {
    expect(matchesHolder('Mateus', 'Mateus')).toBe(true);
    expect(matchesHolder('Thais', 'Thais')).toBe(true);
  });

  it('esconde o outro titular', () => {
    expect(matchesHolder('Mateus', 'Thais')).toBe(false);
    expect(matchesHolder('Thais', 'Mateus')).toBe(false);
  });

  it('mostra o compartilhado para os dois', () => {
    expect(matchesHolder('Mateus', 'shared')).toBe(true);
    expect(matchesHolder('Thais', 'shared')).toBe(true);
  });
});
