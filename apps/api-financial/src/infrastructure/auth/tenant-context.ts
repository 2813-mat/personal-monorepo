import { Inject, Injectable, Scope, UnauthorizedException } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import type { AuthenticatedUser } from './jwt.strategy';

/**
 * Request-scoped tenant context. Reads the authenticated user lazily so it
 * works regardless of whether the instance is constructed before or after the
 * auth guard runs — the getters are only touched during handler execution,
 * by which point JwtStrategy.validate() has attached the resolved tenant to
 * req.user.
 */
@Injectable({ scope: Scope.REQUEST })
export class TenantContext {
  constructor(@Inject(REQUEST) private readonly req: { user?: AuthenticatedUser }) {}

  private get user(): AuthenticatedUser {
    const u = this.req?.user;
    if (!u) throw new UnauthorizedException('Nenhum usuário autenticado na requisição');
    return u;
  }

  get memberId(): string {
    return this.user.memberId;
  }
  get householdId(): string {
    return this.user.householdId;
  }
  get role(): string {
    return this.user.role;
  }
}
