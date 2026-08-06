import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { TenantContext } from '../../../../infrastructure/auth/tenant-context';
import { TenantRepository } from '../../../../infrastructure/auth/tenant-repository.base';
import { CategoryRepository, CreateCategoryData } from '../domain/category.repository';
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
}
