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
    const rows = await this.prisma.category.findMany({ where: this.scoped(), orderBy: { label: 'asc' } });
    return rows.map(toDomain);
  }

  async create(data: CreateCategoryData) {
    const row = await this.prisma.category.create({ data: { ...data, householdId: this.householdId } });
    return toDomain(row);
  }
}
