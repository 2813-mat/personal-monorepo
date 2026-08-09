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
      household: { findFirst: async () => null, create: async () => ({ id: 'h2' }) },
    };
    const res = await resolveMember(prisma as any, { ...payload, realm_access: { roles: ['editor'] } } as any);
    expect(res.householdId).toBe('h2');
  });
});

/**
 * O realm `caixa-familia` é de uma casa só: quem loga nele mora junto. Dar um
 * household novo a cada pessoa que entra era dar uma casa vazia para a segunda —
 * ela não via nenhum cartão da primeira, e a primeira não conseguia atribuir
 * nada a ela, porque `resolveHolderMemberId` só enxerga membros do próprio
 * household. A segunda pessoa entra na casa que já existe.
 */
describe('resolveMember — segunda pessoa da casa', () => {
  function firstLogin(casaExistente: { id: string } | null) {
    const create = jest.fn(async (a: any) => ({ id: 'm2', householdId: a.data.householdId, role: 'EDITOR' }));
    const householdCreate = jest.fn(async () => ({ id: 'novo' }));
    const prisma = {
      member: { findFirst: async () => null, create },
      household: { findFirst: jest.fn(async (_a: any) => casaExistente), create: householdCreate },
    };
    return { prisma, create, householdCreate };
  }

  const thais = { sub: 'kc-thais', preferred_username: 'thais', given_name: 'Thais', name: 'Thais Fontes' };

  it('entra no household que já existe em vez de abrir um novo', async () => {
    const { prisma, householdCreate } = firstLogin({ id: 'h1' });
    const res = await resolveMember(prisma as any, thais as any);
    expect(res.householdId).toBe('h1');
    expect(householdCreate).not.toHaveBeenCalled();
  });

  it('grava o primeiro nome, que é o titular que o domínio usa', async () => {
    const { prisma, create } = firstLogin({ id: 'h1' });
    await resolveMember(prisma as any, thais as any);
    expect(create.mock.calls[0][0].data.name).toBe('Thais');
  });

  it('ainda cria a casa quando o banco está vazio — alguém tem que ser o primeiro', async () => {
    const { prisma, householdCreate } = firstLogin(null);
    const res = await resolveMember(prisma as any, thais as any);
    expect(householdCreate).toHaveBeenCalled();
    expect(res.householdId).toBe('novo');
  });

  // Sem ordem definida, dois logins simultâneos poderiam cair em casas
  // diferentes. A mais antiga é sempre a mesma resposta.
  it('escolhe sempre a casa mais antiga', async () => {
    const { prisma } = firstLogin({ id: 'h1' });
    await resolveMember(prisma as any, thais as any);
    expect(prisma.household.findFirst.mock.calls[0][0]).toEqual({ orderBy: { createdAt: 'asc' } });
  });

  // A casa já tem meses de lançamento dentro. Entrar nela é só inserir uma linha
  // em member — nada do que já está lá é movido ou apagado. Se algum dia alguém
  // acrescentar um update aqui, este teste cai.
  it('não altera nada do que já existe na casa', async () => {
    const update = jest.fn();
    const del = jest.fn();
    const { prisma } = firstLogin({ id: 'h1' });
    const guarded = {
      ...prisma,
      household: { ...prisma.household, update, delete: del, updateMany: update, deleteMany: del },
      member: { ...prisma.member, update, delete: del, updateMany: update, deleteMany: del },
    };
    await resolveMember(guarded as any, thais as any);
    expect(update).not.toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
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
      household: { findFirst: async () => null, create: async () => ({ id: 'h2' }) },
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
