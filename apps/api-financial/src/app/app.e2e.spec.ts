/**
 * Smoke e2e contra a stack completa (Postgres + Keycloak + servidor no ar).
 * Pré-requisitos: `docker compose up -d`, `prisma migrate deploy`, `prisma db seed`
 * e `nx serve api-financial`. Rodar com: `nx e2e api-financial`.
 */
const API = process.env.E2E_API_URL ?? 'http://localhost:3000/api';
const KEYCLOAK = process.env.KEYCLOAK_URL ?? 'http://localhost:8080';
const REALM = process.env.KEYCLOAK_REALM ?? 'caixa-familia';

async function getToken(user = 'mateus', pass = 'mateus'): Promise<string> {
  const body = new URLSearchParams({
    grant_type: 'password',
    client_id: 'ui-financial',
    username: user,
    password: pass,
  });
  const res = await fetch(`${KEYCLOAK}/realms/${REALM}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`token grant falhou: ${res.status} ${await res.text()}`);
  return (await res.json()).access_token;
}

describe('api-financial e2e (smoke)', () => {
  it('rejeita requisição sem token com 401', async () => {
    const res = await fetch(`${API}/transactions`);
    expect(res.status).toBe(401);
  });

  it('GET /transactions retorna 33 lançamentos autenticado', async () => {
    const token = await getToken();
    const res = await fetch(`${API}/transactions?year=2026&month=5`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(33);
  });

  it('GET /categories retorna 11 categorias escopadas ao household', async () => {
    const token = await getToken();
    const res = await fetch(`${API}/categories`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    expect((await res.json()).length).toBe(11);
  });

  it('GET /cards retorna 7 cartões com fatura derivada (current numérico)', async () => {
    const token = await getToken();
    const res = await fetch(`${API}/cards`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const cards = await res.json();
    expect(cards.length).toBe(7);
    expect(typeof cards[0].current).toBe('number');
  });

  it('GET /cards/:id/invoice com cartão inexistente retorna 404', async () => {
    const token = await getToken();
    const res = await fetch(`${API}/cards/nao-existe/invoice`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(404);
  });

  it('GET /goals retorna metas com balance e history derivados', async () => {
    const token = await getToken();
    const res = await fetch(`${API}/goals`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const goals = await res.json();
    expect(goals.length).toBeGreaterThan(0);
    expect(Array.isArray(goals[0].history)).toBe(true);
    expect(typeof goals[0].balance).toBe('number');
  });
});
