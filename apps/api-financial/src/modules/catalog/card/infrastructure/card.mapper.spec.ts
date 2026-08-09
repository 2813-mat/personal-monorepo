import { toDomain } from './card.mapper';

const ROW = {
  id: 'c1',
  householdId: 'h1',
  ownerMemberId: 'm1',
  name: 'Nubank',
  bank: 'Nubank',
  color: '#820AD1',
  closingDay: 5,
  dueDay: 12,
  creditLimit: 4500,
  last4: '4421',
  archivedAt: null as Date | null,
  owner: { name: 'Thais' },
};

describe('toDomain — archived', () => {
  it('traduz archivedAt nulo para archived false', () => {
    expect(toDomain({ ...ROW, archivedAt: null } as never, 0).toJSON().archived).toBe(false);
  });

  it('traduz archivedAt preenchido para archived true', () => {
    const row = { ...ROW, archivedAt: new Date('2026-08-07') };
    expect(toDomain(row as never, 0).toJSON().archived).toBe(true);
  });
});

describe('toDomain — holder', () => {
  it('devolve o titular do dono', () => {
    expect(toDomain(ROW as never, 0).toJSON().holder).toBe('Thais');
  });

  // O membro provisionado pelo Keycloak se chama 'Mateus Bispo'. Devolvê-lo cru
  // fazia o cartão voltar com um titular que a UI não conhece: o avatar caía no
  // ponto de compartilhado e o select de titular abria vazio.
  it('reduz o dono de nome completo ao titular do domínio', () => {
    expect(toDomain({ ...ROW, owner: { name: 'Mateus Bispo' } } as never, 0).toJSON().holder).toBe(
      'Mateus',
    );
  });

  it('traduz cartão sem dono para shared', () => {
    const row = { ...ROW, ownerMemberId: null, owner: null };
    expect(toDomain(row as never, 0).toJSON().holder).toBe('shared');
  });
});
