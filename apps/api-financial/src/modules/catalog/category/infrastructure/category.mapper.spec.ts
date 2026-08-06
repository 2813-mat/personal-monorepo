import { Category as PrismaCategory } from '@prisma/client';
import { toDomain } from './category.mapper';

const row = {
  id: 'c1',
  householdId: 'h1',
  slug: 'casa',
  label: 'Casa',
  color: '#7A4F1D',
  budget: 500 as never,
  order: 3,
} as unknown as PrismaCategory;

describe('category.mapper', () => {
  it('emite order no wire', () => {
    expect(toDomain(row).toJSON()).toMatchObject({ order: 3 });
  });

  it('converte budget de Decimal para number', () => {
    expect(typeof toDomain(row).toJSON().budget).toBe('number');
  });
});
