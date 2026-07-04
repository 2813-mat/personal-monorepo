import { resolveMember } from './member-resolver';

describe('resolveMember', () => {
  const payload = { sub: 'kc-123', preferred_username: 'mateus', name: 'Mateus', realm_access: { roles: ['admin'] } };

  it('retorna member existente (match por sub ou username)', async () => {
    const prisma = { member: { findFirst: async () => ({ id: 'm1', householdId: 'h1', role: 'ADMIN' }) } };
    const res = await resolveMember(prisma as any, payload as any);
    expect(res).toEqual({ memberId: 'm1', householdId: 'h1', role: 'admin' });
  });

  it('provisiona member novo no primeiro login', async () => {
    const created = { id: 'm2', householdId: 'h2', role: 'EDITOR' };
    const prisma = {
      member: { findFirst: async () => null, create: async () => created },
      household: { create: async () => ({ id: 'h2' }) },
    };
    const res = await resolveMember(prisma as any, { ...payload, realm_access: { roles: ['editor'] } } as any);
    expect(res.householdId).toBe('h2');
  });
});
