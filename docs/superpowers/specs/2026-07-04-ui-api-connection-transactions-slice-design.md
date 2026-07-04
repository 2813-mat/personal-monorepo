# Conexão UI ↔ API — Fatia Vertical: Transactions

**Data:** 2026-07-04
**Status:** Aprovado (design)

## Contexto

A API (`apps/api-financial`, NestJS, prefixo `/api`) está construída e é **totalmente
protegida por um guard JWT global do Keycloak** (RS256/jwks, realm `caixa-familia`).
A UI (`apps/ui-financial`, Angular 21, standalone + signals) hoje é **100% mockada**:
todos os dados passam pelo `AppDataService`, que lê de `@caixa-familia/shared-mocks`.
Não há `HttpClient` provido, arquivos de `environment`, nem autenticação na UI.

O objetivo desta etapa é **começar a conectar a UI à API**, entregando uma **fatia
vertical** ponta-a-ponta (login OIDC → interceptor → dados reais → writes) na feature
**Transactions**, validando o padrão antes de replicá-lo para os demais recursos.

### Decisões tomadas no brainstorming

| Decisão | Escolha |
|---|---|
| Autenticação | Login Keycloak completo (Authorization Code + PKCE) |
| Sequenciamento | Fatia vertical primeiro |
| Feature da fatia | Transactions (GET com filtros + POST + DELETE) |
| Mapeamento `memberId`↔`holder` | Alinhar a API: `transaction.mapper` devolve `holder` |

### Estado da infra já pronta

- `keycloak/realm-export.json`: realm `caixa-familia` com client público `ui-financial`
  (standard flow + PKCE, redirect `http://localhost:4200/*`, webOrigins `:4200`),
  client `api-financial` (bearer-only), roles `admin`/`editor`, e usuários
  `mateus` (admin) e `thais` (editor).
- `docker-compose.yml`: postgres (app) + keycloak + keycloak-db, com `--import-realm`.
- `@caixa-familia/shared-types`: contrato de domínio compartilhado pelos dois lados.

## Descasamento de contrato (Transactions)

Wire da API (`TransactionView`) diverge do tipo `Transaction` do `shared-types`:

| Campo | API retorna | UI espera (`Transaction`) |
|---|---|---|
| categoria | `categorySlug: string` | `cat: Id` |
| titular | `memberId: string \| null` | `holder: 'Mateus' \| 'Thais' \| 'shared'` |
| método | `method: 'PIX' \| 'CARD'` + `cardId: string \| null` | `method: cardId \| 'pix'` (campo único) |
| parcelas | `installments: {n,of} \| null` | igual ✅ |

No **filtro** de leitura a API já aceita `holder` como **nome do membro**
(`where.member = { name }`; `'shared'` → `memberId = null`). Na **resposta**, porém,
devolve `memberId` cru, e **não há endpoint de membros** — logo a UI não consegue
resolver `memberId → nome` sozinha.

## Arquitetura

### 1. Fundação de autenticação (feito uma vez)

- **Biblioteca OIDC:** `angular-auth-oidc-client` (standalone-friendly; interceptor
  funcional que anexa Bearer apenas às URLs da API via allowlist; refresh silencioso).
  Alternativa considerada: `keycloak-angular`. A versão exata compatível com Angular 21
  é fixada na fase de plano.
- **`environments/environment.ts`** (+ `environment.development.ts`):
  - `apiBaseUrl` = `http://localhost:3000/api`
  - `auth.authority` = `http://localhost:8080/realms/caixa-familia`
  - `auth.clientId` = `ui-financial`
  - `auth.scope` = `openid profile` (+ o necessário para roles)
- **`app.config.ts`** passa a prover:
  - `provideHttpClient(withInterceptors([authInterceptor da lib]))`
  - `provideAuth(authConfig)` + checagem inicial de auth (`checkAuth`)
- **`AuthService`** (wrapper fino sobre a lib):
  - `login()`, `logout()`
  - signals: `isAuthenticated`, `userName`, `roles` (de `realm_access.roles`)
  - helper `canWrite` = possui `admin` ou `editor` → habilita/desabilita ações de write
- **`authGuard`** (functional guard) nas rotas filhas do `AppShellComponent`.
  Callback do authorization code é tratado pela própria lib na rota `/`.
- **401** em resposta da API dispara `AuthService.login()` (sessão expirada).

### 2. Camada de dados

Mantém-se o **`AppDataService` como fachada de signals** — os componentes continuam
lendo `data.transactions()`, `data.catBy()`, etc. sem mudança de assinatura. A diferença
é que os signals passam a ser **preenchidos por HTTP**, não por mocks estáticos.

- **`core/api/transaction-api.service.ts`** — `TransactionApiService`:
  - `list(params: { year; month; holder? }): Observable<TransactionWire[]>` → `GET /transactions`
  - `create(dto: CreateTransactionWire): Observable<TransactionWire>` → `POST /transactions`
  - `remove(id): Observable<void>` → `DELETE /transactions/:id`
  - Tipado pelo shape de wire (definido em `core/api/wire.types.ts`), sem vazar `HttpClient`.
- **`core/api/transaction.mapper.ts`** (na UI) — tradução wire ↔ `Transaction`:
  - **read:** `cat = categorySlug`; `method = wire.method === 'CARD' ? wire.cardId : 'pix'`;
    `holder` vem pronto da API (ver ajuste no backend); demais campos 1:1.
  - **write (create):** `'pix' → { method: 'PIX' }`; senão `{ method: 'CARD', cardId }`;
    `categorySlug = cat`; `memberId`/`holder` conforme contrato de create da API
    (`memberId` opcional — mantém-se o envio por `holder`→resolução no backend se aplicável;
    ver "Contrato de create" abaixo).
- **`AppDataService`** ganha métodos assíncronos que orquestram a API e atualizam signals:
  - `loadTransactions()` (usa `currentMonth()` + `holderFilter()` quando aplicável)
  - `createTransaction(input)` → chama API, refaz `loadTransactions()` em sucesso
  - `removeTransaction(id)` → chama API, refaz `loadTransactions()` em sucesso
  - `loadCategories()` e `loadCards()` (read-only, ver escopo de apoio)
- **Estados por recurso** no `AppDataService`: signals `transactionsLoading`,
  `transactionsError` (idem categorias/cards). Falha de write → `ToastService` existente.

### 3. Ajuste no backend (o único)

Alinhar o read de transactions ao `shared-types`:

- `apps/api-financial/.../transaction.mapper.ts` (`toView`): incluir `member` no
  include e retornar **`holder: r.member?.name ?? 'shared'`** no lugar de `memberId`.
- Atualizar `TransactionView` (domain) para `holder: string` no lugar de `memberId`.
- Ajustar o `INCLUDE` do repositório para trazer `member`.
- Atualizar specs do backend que assumem `memberId` no retorno.

`categorySlug` e `method`+`cardId` **permanecem** no wire — a tradução para `cat`/`method`
único é feita no mapper da UI (mecânica e sem perda).

### Contrato de create

`CreateTransactionDto` da API espera `categorySlug`, `method: 'PIX'|'CARD'`, `cardId?`,
`memberId?`, `installments?`. O mapper de write da UI converte a partir do formato de
formulário atual da UI. O envio do titular usa `memberId` quando disponível; enquanto não
houver seleção de membro na UI, o create parte do usuário autenticado/`holder` conforme o
formulário existente do `expense-drawer`. (A checagem fina do fluxo de create é
responsabilidade da fase de plano, olhando o `expense-drawer.component`.)

## Escopo da fatia

**Entra agora:**

- **Transactions:** read do mês atual, create, delete — refletidos no signal
  (refetch após write). Writes gated por role (`canWrite`).
- **Leituras de apoio (read-only):** `GET /categories` e `GET /cards` preenchem
  `categories`/`cards`/`catBy`/`cardBy`, para que labels de categoria e chips de cartão
  das transações reais resolvam por id.
- **Infra local:** `docker-compose up` (postgres + keycloak) + `prisma migrate` + `seed`.

**Fica fora (continua mock):** incomes, goals, fixed, budgets, reports, dashboard.

## Erros, loading & testes

- Loading/error por recurso via signals no `AppDataService`.
- Falha de write → toast de erro (`ToastService`); 401 → `login()`.
- **Testes:**
  - Unit `transaction.mapper` (UI): wire→domain e domain→wire, ambos os sentidos.
  - Unit `TransactionApiService` com `HttpTestingController` (URLs, params, verbo).
  - Ajuste dos specs do backend afetados pela troca `memberId → holder`.
  - Smoke manual: login (`mateus`) → ver transações reais do mês → criar → deletar.

## Riscos / premissas

1. **Slugs de categoria** da API batem com os ids usados nos lookups da UI — mitigado
   carregando categorias reais junto na fatia.
2. **Seed** popula o household dos usuários `mateus`/`thais` com transações no mês atual.
3. **Compatibilidade** de `angular-auth-oidc-client` com Angular 21 — confirmada/fixada
   na fase de plano; fallback `keycloak-angular` se necessário.

## Fora de escopo (etapas futuras)

- Conectar demais recursos (incomes, goals, fixed, reports, dashboard) via HTTP.
- Filtro server-side completo (hoje a UI filtra holder/categoria/busca no client).
- Seleção de membro/titular explícita no formulário de create.
- Endpoint de membros dedicado.
