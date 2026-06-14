import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from './jwt.strategy';

export interface ResolvedTenant {
  memberId: string;
  householdId: string;
  role: string;
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
  const household = await prisma.household.create({
    data: { name: `${payload.name ?? payload.preferred_username} household` },
  });
  const isAdmin = payload.realm_access?.roles?.includes('admin');
  const member = await prisma.member.create({
    data: {
      householdId: household.id,
      keycloakSub: payload.sub,
      name: payload.name ?? payload.preferred_username,
      role: isAdmin ? 'ADMIN' : 'EDITOR',
      color: '#475569',
    },
  });
  return { memberId: member.id, householdId: member.householdId, role: member.role.toLowerCase() };
}
