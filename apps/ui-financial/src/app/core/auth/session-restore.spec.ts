import { TestBed } from '@angular/core/testing';
import {
  AbstractSecurityStorage,
  DefaultLocalStorageService,
  LoginResponse,
  OidcSecurityService,
} from 'angular-auth-oidc-client';
import { NEVER, Observable, of, throwError, firstValueFrom } from 'rxjs';
import { appConfig } from '../../app.config';
import { restoreSession, SESSION_RESTORE_TIMEOUT_MS } from './session-restore';

function loginResponse(isAuthenticated: boolean): LoginResponse {
  return { isAuthenticated, userData: null, accessToken: 'a', idToken: 'i', configId: 'c' };
}

function oidcMock(opts: {
  checkAuth: boolean[];
  forceRefreshSession?: () => Observable<LoginResponse>;
}) {
  return {
    checkAuth: jest.fn(() => of(loginResponse(opts.checkAuth.shift() ?? false))),
    forceRefreshSession: jest.fn(opts.forceRefreshSession ?? (() => of(loginResponse(true)))),
  };
}

describe('restoreSession', () => {
  afterEach(() => jest.useRealTimers());

  it('does not renew when the stored tokens are still valid', async () => {
    const oidc = oidcMock({ checkAuth: [true] });

    await firstValueFrom(restoreSession(oidc));

    expect(oidc.checkAuth).toHaveBeenCalledTimes(1);
    expect(oidc.forceRefreshSession).not.toHaveBeenCalled();
  });

  it('renews an expired access token, then checks again to publish the user data', async () => {
    const oidc = oidcMock({ checkAuth: [false, true] });

    await firstValueFrom(restoreSession(oidc));

    expect(oidc.forceRefreshSession).toHaveBeenCalledTimes(1);
    expect(oidc.checkAuth).toHaveBeenCalledTimes(2);
  });

  it('does not check again when the renewal did not authenticate', async () => {
    const oidc = oidcMock({
      checkAuth: [false],
      forceRefreshSession: () => of(loginResponse(false)),
    });

    await firstValueFrom(restoreSession(oidc));

    expect(oidc.checkAuth).toHaveBeenCalledTimes(1);
  });

  it('does not fail app startup when there is no session to renew', async () => {
    const oidc = oidcMock({
      checkAuth: [false],
      forceRefreshSession: () => throwError(() => new Error('no refresh token')),
    });

    await expect(firstValueFrom(restoreSession(oidc))).resolves.toBeNull();
  });

  it('gives up on a stalled network, so the app does not stay on a blank screen', async () => {
    jest.useFakeTimers();
    const oidc = oidcMock({ checkAuth: [false], forceRefreshSession: () => NEVER });

    const result = firstValueFrom(restoreSession(oidc));
    jest.advanceTimersByTime(SESSION_RESTORE_TIMEOUT_MS);

    await expect(result).resolves.toBeNull();
  });
});

describe('appConfig auth providers', () => {
  it('keeps tokens in localStorage, which survives iOS closing the installed app', () => {
    TestBed.configureTestingModule({
      providers: [
        ...appConfig.providers,
        { provide: OidcSecurityService, useValue: oidcMock({ checkAuth: [true] }) },
      ],
    });

    expect(TestBed.inject(AbstractSecurityStorage)).toBeInstanceOf(DefaultLocalStorageService);
  });
});
