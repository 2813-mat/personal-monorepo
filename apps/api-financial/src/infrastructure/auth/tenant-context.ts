import { Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.REQUEST })
export class TenantContext {
  memberId!: string;
  householdId!: string;
  role!: string;
  set(v: { memberId: string; householdId: string; role: string }) {
    Object.assign(this, v);
  }
}
