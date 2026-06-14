import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';

function ctx(roles: string[]): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user: { realm_access: { roles } } }) }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('permite quando role exigido está presente', () => {
    const reflector = { getAllAndOverride: () => ['admin'] } as unknown as Reflector;
    expect(new RolesGuard(reflector).canActivate(ctx(['admin']))).toBe(true);
  });
  it('bloqueia quando role exigido falta', () => {
    const reflector = { getAllAndOverride: () => ['admin'] } as unknown as Reflector;
    expect(new RolesGuard(reflector).canActivate(ctx(['editor']))).toBe(false);
  });
  it('permite quando nenhum role é exigido', () => {
    const reflector = { getAllAndOverride: () => undefined } as unknown as Reflector;
    expect(new RolesGuard(reflector).canActivate(ctx([]))).toBe(true);
  });
});
