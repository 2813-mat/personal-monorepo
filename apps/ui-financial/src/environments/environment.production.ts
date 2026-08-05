declare global {
  interface Window {
    __env?: {
      apiBaseUrl?: string;
      authAuthority?: string;
      authClientId?: string;
    };
  }
}

const runtimeEnv = window.__env ?? {};

export const environment = {
  production: true,
  apiBaseUrl: runtimeEnv.apiBaseUrl || 'https://financeiro-api.bispotech.com/api',
  auth: {
    authority:
      runtimeEnv.authAuthority || 'https://financeiro-auth.bispotech.com/realms/caixa-familia',
    clientId: runtimeEnv.authClientId || 'ui-financial',
    scope: 'openid profile',
  },
};
