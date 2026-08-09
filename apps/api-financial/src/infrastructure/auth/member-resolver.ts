import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from './jwt.strategy';

export interface ResolvedTenant {
  memberId: string;
  householdId: string;
  role: string;
}

/**
 * O `name` do membro é a chave por onde todo `holder` do domínio
 * ('Mateus' | 'Thais' | 'shared') é casado na escrita e devolvido na leitura —
 * o seed grava exatamente 'Mateus' e 'Thais'. O token do Keycloak traz o nome
 * completo em `name`, então guardá-lo cru faria o membro nascer como
 * 'Mateus Bispo' e nenhum titular voltaria a casar.
 */
function shortName(payload: JwtPayload): string {
  const full = payload.given_name ?? payload.name ?? payload.preferred_username;
  return full.trim().split(/\s+/)[0];
}

export async function resolveMember(prisma: PrismaService, payload: JwtPayload): Promise<ResolvedTenant> {
  // O seed grava keycloakSub = preferred_username; tokens reais trazem sub UUID.
  // Casamos por qualquer um dos dois para alcançar o household seedado no POC.
  const existing = await prisma.member.findFirst({
    where: { keycloakSub: { in: [payload.sub, payload.preferred_username] } },
  });
  if (existing) {
    return { memberId: existing.id, householdId: existing.householdId, role: existing.role.toLowerCase() };
  }
  // O realm é de uma casa só: quem entra nele mora junto. Abrir um household por
  // pessoa dava à segunda uma casa vazia — ela não via nenhum cartão da
  // primeira, e a primeira não conseguia atribuir nada a ela, porque o titular
  // só é procurado dentro do próprio household. A casa mais antiga é a que tem
  // os dados; entrar nela é só inserir o membro, nada de lá é tocado.
  const household =
    (await prisma.household.findFirst({ orderBy: { createdAt: 'asc' } })) ??
    (await prisma.household.create({
      data: { name: `${payload.name ?? payload.preferred_username} household` },
    }));
  const isAdmin = payload.realm_access?.roles?.includes('admin');
  const member = await prisma.member.create({
    data: {
      householdId: household.id,
      keycloakSub: payload.sub,
      name: shortName(payload),
      role: isAdmin ? 'ADMIN' : 'EDITOR',
      color: '#475569',
    },
  });
  return { memberId: member.id, householdId: member.householdId, role: member.role.toLowerCase() };
}
