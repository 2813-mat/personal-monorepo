import { TenantContext } from './tenant-context';
import { PrismaService } from '../prisma/prisma.service';

export abstract class TenantRepository {
  constructor(protected readonly prisma: PrismaService, protected readonly tenant: TenantContext) {}
  protected get householdId(): string {
    return this.tenant.householdId;
  }
  protected scoped<T extends object>(where?: T) {
    return { ...(where ?? {}), householdId: this.householdId } as T & { householdId: string };
  }
}
