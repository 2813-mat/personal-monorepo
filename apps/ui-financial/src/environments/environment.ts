export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:3000/api',
  auth: {
    authority: 'http://localhost:8080/realms/caixa-familia',
    clientId: 'ui-financial',
    scope: 'openid profile',
  },
};
