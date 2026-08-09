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

/**
 * O caminho de volta: traduz o nome do membro guardado no banco para o `holder`
 * do domínio. É o inverso de `resolveHolderMemberId`, e precisa existir porque
 * os dois lados não falavam a mesma língua — a escrita aceitava 'Mateus' e
 * achava o membro 'Mateus Bispo', mas a leitura devolvia 'Mateus Bispo' cru.
 * Esse valor não é um `Holder` válido: o avatar caía no ponto de compartilhado e
 * o select de titular abria vazio, como se o PATCH não tivesse funcionado.
 *
 * Reduzir ao primeiro nome é a mesma regra que `member-resolver` aplica ao
 * provisionar o membro — só que aqui ela também alcança quem já nasceu com o
 * nome completo, antes daquela regra existir.
 *
 * Sem dono é 'shared': a coluna nula significa despesa da casa, não membro
 * desconhecido.
 */
export function holderFrom(memberName: string | null | undefined): string {
  return memberName?.trim().split(/\s+/)[0] || 'shared';
}
