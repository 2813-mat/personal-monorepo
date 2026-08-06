import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { TenantContext } from '../../../../infrastructure/auth/tenant-context';
import { TenantRepository } from '../../../../infrastructure/auth/tenant-repository.base';
import {
  CategoryRepository,
  CategoryUsage,
  CreateCategoryData,
  UpdateCategoryData,
} from '../domain/category.repository';
import { toDomain } from './category.mapper';

@Injectable()
export class CategoryPrismaRepository extends TenantRepository implements CategoryRepository {
  constructor(prisma: PrismaService, tenant: TenantContext) {
    super(prisma, tenant);
  }

  async findAll() {
    // `label` como desempate mantém a lista estável se duas categorias
    // acabarem com o mesmo `order`.
    const rows = await this.prisma.category.findMany({
      where: this.scoped(),
      orderBy: [{ order: 'asc' }, { label: 'asc' }],
    });
    return rows.map(toDomain);
  }

  async create(data: CreateCategoryData) {
    // Sem isto toda categoria nova nasce com order 0 e vai para o topo da lista.
    const last = await this.prisma.category.findFirst({
      where: this.scoped(),
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const row = await this.prisma.category.create({
      data: { ...data, householdId: this.householdId, order: (last?.order ?? 0) + 1 },
    });
    return toDomain(row);
  }

  async update(slug: string, data: UpdateCategoryData) {
    const existing = await this.prisma.category.findFirst({ where: this.scoped({ slug }) });
    if (!existing) return null;
    // `order` fica de fora: quem muda ordem é o reorder, em lote.
    const row = await this.prisma.category.update({
      where: { id: existing.id },
      data: { label: data.label, color: data.color, budget: data.budget },
    });
    return toDomain(row);
  }

  async countUsage(slug: string): Promise<CategoryUsage | null> {
    const existing = await this.prisma.category.findFirst({ where: this.scoped({ slug }) });
    if (!existing) return null;
    const [transactions, fixedExpenses] = await Promise.all([
      this.prisma.transaction.count({ where: this.scoped({ categoryId: existing.id }) }),
      this.prisma.fixedExpense.count({ where: this.scoped({ categoryId: existing.id }) }),
    ]);
    return { transactions, fixedExpenses };
  }

  async remove(slug: string): Promise<boolean> {
    const existing = await this.prisma.category.findFirst({ where: this.scoped({ slug }) });
    if (!existing) return false;
    await this.prisma.category.delete({ where: { id: existing.id } });
    return true;
  }

  async reorder(slugs: string[]) {
    // updateMany já escopado por household: um slug de outro household
    // simplesmente não casa nenhuma linha.
    await this.prisma.$transaction(
      slugs.map((slug, i) =>
        this.prisma.category.updateMany({
          where: this.scoped({ slug }),
          data: { order: i + 1 },
        }),
      ),
    );
    return this.findAll();
  }
}
