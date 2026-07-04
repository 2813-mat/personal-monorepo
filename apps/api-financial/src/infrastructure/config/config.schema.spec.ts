import { parseEnv } from './config.schema';

describe('parseEnv', () => {
  it('aceita env válido', () => {
    const cfg = parseEnv({
      DATABASE_URL: 'postgresql://x',
      KEYCLOAK_URL: 'http://localhost:8080',
      KEYCLOAK_REALM: 'caixa-familia',
      KEYCLOAK_CLIENT_ID: 'api-financial',
    });
    expect(cfg.KEYCLOAK_REALM).toBe('caixa-familia');
    expect(cfg.PORT).toBe(3000);
  });

  it('rejeita env sem DATABASE_URL', () => {
    expect(() => parseEnv({})).toThrow();
  });
});
