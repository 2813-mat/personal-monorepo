import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../infrastructure/prisma/prisma.service';

/**
 * Só o delegate de membro, para servir tanto ao PrismaService quanto ao cliente
 * de dentro de um `$transaction` — a busca do titular acontece nos dois.
 */
export type MemberLookup = Pick<PrismaService, 'member'>;

/**
 * Traduz o `holder` do domínio ('Mateus' | 'Thais' | 'shared') para o
 * `memberId` que as tabelas guardam.
 *
 * O casamento é pelo nome do membro, e é aí que mora a sutileza: o seed cria
 * membros chamados 'Mateus' e 'Thais', mas o membro provisionado no primeiro
 * login nasce com o `name` do token do Keycloak — 'Mateus Bispo'. Por isso o
 * primeiro nome também casa contra o nome completo, e o nome exato ganha
 * quando os dois existem.
 *
 * Titular que não resolve é erro, não 'shared': o silêncio anterior gravava
 * todo cartão como compartilhado sem que ninguém percebesse.
 *
 * `undefined` atravessa como `undefined` — num PATCH que não fala de titular,
 * "não mexer" é diferente de "tornar compartilhado".
 */
export function resolveHolderMemberId(
  prisma: MemberLookup,
  householdId: string,
  holder: string,
): Promise<string | null>;
export function resolveHolderMemberId(
  prisma: MemberLookup,
  householdId: string,
  holder: string | undefined,
): Promise<string | null | undefined>;
export async function resolveHolderMemberId(
  prisma: MemberLookup,
  householdId: string,
  holder: string | undefined,
): Promise<string | null | undefined> {
  if (holder === undefined) return undefined;
  // 'shared' é ausência de dono, não um membro chamado shared.
  if (holder === 'shared') return null;

  const member = await prisma.member.findFirst({
    where: {
      householdId,
      OR: [
        { name: { equals: holder, mode: 'insensitive' } },
        // O espaço importa: 'Mateus' não pode casar com 'Mateusa'.
        { name: { startsWith: `${holder} `, mode: 'insensitive' } },
      ],
    },
    // 'Mateus' ordena antes de 'Mateus Bispo', então o exato vem primeiro.
    orderBy: { name: 'asc' },
  });

  if (!member) {
    throw new BadRequestException(`Titular ${holder} não é membro deste household`);
  }
  return member.id;
}
