import { wireToCategory } from './catalog.mapper';

describe('wireToCategory', () => {
  it('uses slug as the id so transaction.cat lookups resolve', () => {
    const c = wireToCategory({ id: 'db-1', slug: 'mercado', label: 'Mercado', color: '#0a0', budget: 800 });
    expect(c).toEqual({ id: 'mercado', label: 'Mercado', color: '#0a0', budget: 800 });
  });
});
