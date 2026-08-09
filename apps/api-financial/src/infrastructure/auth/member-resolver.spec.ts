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

/**
 * O `name` do membro não é enfeite: é por ele que todo `holder` do domínio
 * ('Mateus' | 'Thais' | 'shared') é casado na escrita e devolvido na leitura.
 * Guardar aqui o nome completo do token quebra esse casamento inteiro.
 */
describe('resolveMember — nome do membro provisionado', () => {
  function provisioning() {
    const create = jest.fn(async (_a: any) => ({ id: 'm2', householdId: 'h2', role: 'EDITOR' }));
    const prisma = {
      member: { findFirst: async () => null, create },
      household: { create: async () => ({ id: 'h2' }) },
    };
    return { prisma, create };
  }

  const nameOf = async (payload: Record<string, unknown>) => {
    const { prisma, create } = provisioning();
    await resolveMember(prisma as any, { sub: 'kc-9', preferred_username: 'mateus', ...payload } as any);
    return create.mock.calls[0][0].data.name;
  };

  it('guarda o primeiro nome quando o token traz o nome completo', async () => {
    await expect(nameOf({ name: 'Mateus Bispo' })).resolves.toBe('Mateus');
  });

  it('prefere given_name, que é a claim canônica do primeiro nome', async () => {
    await expect(nameOf({ given_name: 'Mateus', name: 'Mateus Bispo' })).resolves.toBe('Mateus');
  });

  it('mantém um nome que já é só o primeiro', async () => {
    await expect(nameOf({ name: 'Thais' })).resolves.toBe('Thais');
  });

  it('cai no username quando o token não traz nome', async () => {
    await expect(nameOf({})).resolves.toBe('mateus');
  });
});
