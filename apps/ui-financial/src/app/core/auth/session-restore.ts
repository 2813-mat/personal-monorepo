import { OidcSecurityService } from 'angular-auth-oidc-client';
import { Observable, catchError, of, switchMap, timeout } from 'rxjs';

export const SESSION_RESTORE_TIMEOUT_MS = 10_000;

/**
 * Ao reabrir o app instalado o access token já venceu, e o checkAuth sozinho não
 * usa o refresh token: mandaria para o login. A renovação não publica userData$,
 * daí o segundo checkAuth. Sem sessão, com falha ou com rede parada, a
 * inicialização segue e o autoLoginPartialRoutesGuard decide.
 */
export function restoreSession(
  oidc: Pick<OidcSecurityService, 'checkAuth' | 'forceRefreshSession'>,
): Observable<unknown> {
  return oidc.checkAuth().pipe(
    switchMap((auth) =>
      auth.isAuthenticated
        ? of(auth)
        : oidc
            .forceRefreshSession()
            .pipe(
              switchMap((renewed) => (renewed.isAuthenticated ? oidc.checkAuth() : of(renewed))),
            ),
    ),
    timeout(SESSION_RESTORE_TIMEOUT_MS),
    catchError(() => of(null)),
  );
}
