import { BadRequestException } from '@nestjs/common';
import { resolveHolderMemberId } from './holder-member';

type Args = { where?: Record<string, unknown>; orderBy?: unknown };

function prismaWith(members: { id: string; name: string }[]) {
  return {
    member: {
      findFirst: jest.fn(async (a: Args) => {
        const or = (a.where?.['OR'] ?? []) as { name: Record<string, string> }[];
        const hit = members
          .slice()
          .sort((x, y) => x.name.localeCompare(y.name))
          .find((m) =>
            or.some((c) =>
              c.name.equals !== undefined
                ? m.name.toLowerCase() === c.name.equals.toLowerCase()
                : m.name.toLowerCase().startsWith(c.name.startsWith.toLowerCase()),
            ),
          );
        return hit ?? null;
      }),
    },
  };
}

const call = (members: { id: string; name: string }[], holder: string) =>
  resolveHolderMemberId(prismaWith(members) as never, 'h1', holder);

describe('resolveHolderMemberId', () => {
  it('atravessa undefined — PATCH sem titular não pode zerar o dono', async () => {
    const prisma = prismaWith([{ id: 'm1', name: 'Mateus' }]);
    await expect(resolveHolderMemberId(prisma as never, 'h1', undefined)).resolves.toBeUndefined();
    expect(prisma.member.findFirst).not.toHaveBeenCalled();
  });

  it('não consulta o banco para shared — ausência de dono não é um membro', async () => {
    const prisma = prismaWith([]);
    await expect(resolveHolderMemberId(prisma as never, 'h1', 'shared')).resolves.toBeNull();
    expect(prisma.member.findFirst).not.toHaveBeenCalled();
  });

  it('casa o membro pelo nome exato', async () => {
    await expect(call([{ id: 'm1', name: 'Mateus' }], 'Mateus')).resolves.toBe('m1');
  });

  it('casa ignorando maiúsculas e minúsculas', async () => {
    await expect(call([{ id: 'm1', name: 'mateus' }], 'Mateus')).resolves.toBe('m1');
  });

  // O membro provisionado pelo Keycloak nasce com o nome completo do token,
  // enquanto o domínio inteiro fala em primeiro nome. Sem isto, todo cartão
  // criado em produção caía em 'shared'.
  it('casa o primeiro nome contra o membro de nome completo', async () => {
    await expect(call([{ id: 'm1', name: 'Mateus Bispo' }], 'Mateus')).resolves.toBe('m1');
  });

  it('prefere o nome exato quando os dois existem', async () => {
    const members = [
      { id: 'm-completo', name: 'Mateus Bispo' },
      { id: 'm-curto', name: 'Mateus' },
    ];
    await expect(call(members, 'Mateus')).resolves.toBe('m-curto');
  });

  it('não confunde um nome que só começa igual', async () => {
    await expect(call([{ id: 'm1', name: 'Mateusa Silva' }], 'Mateus')).rejects.toThrow(
      BadRequestException,
    );
  });

  // Falhar alto é o ponto: antes o titular não encontrado virava null e o
  // registro nascia compartilhado sem que ninguém percebesse.
  it('recusa o titular que não existe no household em vez de virar shared', async () => {
    await expect(call([{ id: 'm1', name: 'Mateus Bispo' }], 'Thais')).rejects.toThrow(
      /Thais.*household/i,
    );
  });

  it('escopa a busca ao household', async () => {
    const prisma = prismaWith([{ id: 'm1', name: 'Mateus' }]);
    await resolveHolderMemberId(prisma as never, 'h9', 'Mateus');
    expect(prisma.member.findFirst.mock.calls[0][0].where?.['householdId']).toBe('h9');
  });
});
