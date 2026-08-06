import { wireToCategory, categoryToCreateWire } from './catalog.mapper';

describe('wireToCategory', () => {
  it('uses slug as the id so transaction.cat lookups resolve', () => {
    const c = wireToCategory({
      id: 'db-1',
      slug: 'mercado',
      label: 'Mercado',
      color: '#0a0',
      budget: 800,
      order: 1,
    });
    expect(c).toEqual({ id: 'mercado', label: 'Mercado', color: '#0a0', budget: 800, order: 1 });
  });
});

describe('categoryToCreateWire', () => {
  it('sends the domain id as the slug', () => {
    expect(
      categoryToCreateWire({
        id: 'farmacia',
        label: 'Farmácia',
        color: '#2E7D5B',
        budget: 300,
        order: 2,
      }),
    ).toEqual({ slug: 'farmacia', label: 'Farmácia', color: '#2E7D5B', budget: 300 });
  });
});

describe('wireToCategory — order', () => {
  it('traz order do wire', () => {
    const c = wireToCategory({
      id: 'db-1',
      slug: 'casa',
      label: 'Casa',
      color: '#7A4F1D',
      budget: 500,
      order: 3,
    });
    expect(c.order).toBe(3);
  });
});
