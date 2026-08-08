import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { TenantContext } from '../../../../infrastructure/auth/tenant-context';
import { TenantRepository } from '../../../../infrastructure/auth/tenant-repository.base';
import { slugify } from '@caixa-familia/shared-utils';
import {
  AddContributionData,
  CreateGoalData,
  GoalRepository,
  GoalView,
  UpdateGoalData,
} from '../domain/goal.repository';
import { toView } from './goal.mapper';

/** Label sem letra nem número nenhum ("💰") ainda precisa virar uma chave de URL. */
const SLUG_FALLBACK = 'meta';

@Injectable()
export class GoalPrismaRepository extends TenantRepository implements GoalRepository {
  constructor(prisma: PrismaService, tenant: TenantContext) {
    super(prisma, tenant);
  }

  async findAll(): Promise<GoalView[]> {
    const goals = await this.prisma.goal.findMany({
      where: this.scoped(),
      include: { contributions: true },
      orderBy: { label: 'asc' },
    });
    return goals.map((g) => toView(g));
  }

  async create(data: CreateGoalData): Promise<GoalView> {
    const row = await this.prisma.goal.create({
      data: {
        householdId: this.householdId,
        slug: await this.freeSlug(data.label),
        label: data.label,
        target: data.target,
        monthly: data.monthly,
        color: data.color,
        subtitle: data.subtitle,
        type: data.type,
      },
      include: { contributions: true },
    });
    return toView(row);
  }

  /**
   * `slugify(label)` e, se o household já tiver esse slug, o primeiro sufixo
   * livre: `reserva`, `reserva-2`, `reserva-3`. Duas metas podem se chamar
   * igual — o nome é do usuário, o slug é chave de URL.
   *
   * O `startsWith` traz slugs que só compartilham o prefixo (`reserva-do-carro`
   * quando a base é `reserva`); a comparação abaixo é exata, então eles apenas
   * engordam o conjunto sem afetar a escolha.
   */
  private async freeSlug(label: string): Promise<string> {
    const base = slugify(label) || SLUG_FALLBACK;
    const rows = await this.prisma.goal.findMany({
      where: this.scoped({ slug: { startsWith: base } }),
      select: { slug: true },
    });
    const taken = new Set(rows.map((r) => r.slug));
    if (!taken.has(base)) return base;
    let n = 2;
    while (taken.has(`${base}-${n}`)) n++;
    return `${base}-${n}`;
  }

  async update(slug: string, data: UpdateGoalData): Promise<GoalView | null> {
    const existing = await this.prisma.goal.findFirst({ where: this.scoped({ slug }) });
    if (!existing) return null;
    // `slug` fica fora do data de propósito: é a chave de URL e a referência
    // que a UI usa. Campos undefined o Prisma ignora, então o PATCH é parcial.
    const row = await this.prisma.goal.update({
      where: { id: existing.id },
      data: {
        label: data.label,
        target: data.target,
        monthly: data.monthly,
        color: data.color,
        subtitle: data.subtitle,
        type: data.type,
      },
      include: { contributions: true },
    });
    return toView(row);
  }

  async addContribution(slug: string, data: AddContributionData): Promise<void> {
    const goal = await this.prisma.goal.findFirstOrThrow({ where: this.scoped({ slug }) });
    await this.prisma.goalContribution.create({
      data: {
        householdId: this.householdId,
        goalId: goal.id,
        amount: data.amount,
        date: new Date(data.date),
      },
    });
  }
}
