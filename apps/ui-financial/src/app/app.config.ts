import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  AbstractSecurityStorage,
  DefaultLocalStorageService,
  OidcSecurityService,
  provideAuth,
  authInterceptor,
} from 'angular-auth-oidc-client';
import { appRoutes } from './app.routes';
import { restoreSession } from './core/auth/session-restore';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
    provideHttpClient(withInterceptors([authInterceptor()])),
    provideAuth({
      config: {
        authority: environment.auth.authority,
        redirectUrl: window.location.origin,
        postLogoutRedirectUri: window.location.origin,
        clientId: environment.auth.clientId,
        scope: environment.auth.scope,
        responseType: 'code',
        silentRenew: true,
        useRefreshToken: true,
        secureRoutes: [environment.apiBaseUrl],
      },
    }),
    // O iOS pode apagar o sessionStorage ao fechar o app instalado na tela de início.
    { provide: AbstractSecurityStorage, useClass: DefaultLocalStorageService },
    provideAppInitializer(() => restoreSession(inject(OidcSecurityService))),
  ],
};
