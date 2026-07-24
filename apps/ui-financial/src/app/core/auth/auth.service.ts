import { Injectable, inject, signal, computed } from '@angular/core';
import { OidcSecurityService } from 'angular-auth-oidc-client';

export function rolesFromPayload(payload: unknown): string[] {
  const p = payload as { realm_access?: { roles?: string[] } } | null;
  return p?.realm_access?.roles ?? [];
}

export function canWriteFromRoles(roles: string[]): boolean {
  return roles.includes('admin') || roles.includes('editor');
}

/** Ações de fechamento são admin-only — um editor escreve, mas não fecha período. */
export function isAdminFromRoles(roles: string[]): boolean {
  return roles.includes('admin');
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private oidc = inject(OidcSecurityService);

  private readonly _authenticated = signal(false);
  private readonly _userName = signal('');
  private readonly _roles = signal<string[]>([]);

  readonly isAuthenticated = this._authenticated.asReadonly();
  readonly userName = this._userName.asReadonly();
  readonly roles = this._roles.asReadonly();
  readonly canWrite = computed(() => canWriteFromRoles(this._roles()));
  readonly isAdmin = computed(() => isAdminFromRoles(this._roles()));

  // checkAuth runs at app init via withAppInitializerAuthCheck() in app.config,
  // so here we only mirror the resolved auth state into signals.
  init(): void {
    this.oidc.isAuthenticated$.subscribe(({ isAuthenticated }) => {
      this._authenticated.set(isAuthenticated);
      if (isAuthenticated) {
        this.oidc.getPayloadFromAccessToken().subscribe((payload) => {
          this._roles.set(rolesFromPayload(payload));
        });
      } else {
        this._roles.set([]);
      }
    });
    this.oidc.userData$.subscribe(({ userData }) => {
      this._userName.set(
        (userData?.name as string) ?? (userData?.preferred_username as string) ?? '',
      );
    });
  }

  login(): void {
    this.oidc.authorize();
  }

  logout(): void {
    this.oidc.logoff().subscribe();
  }
}
