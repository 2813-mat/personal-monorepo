# API Financial — Backend Design (NestJS + Prisma + DDD)

> **Status:** aprovado no brainstorming em 2026-06-06.
> **Escopo deste spec:** apenas o backend (API + banco + Docker + Keycloak). A troca do `AppDataService` (Angular) por um `DataService` HTTP fica para um plano/spec separado.

## Contexto

O frontend `ui-financial` (Angular 21, signals) está completo como POC, consumindo mocks de `libs/shared-mocks` via `AppDataService`. Todas as tarefas de UI (T1–T11 em `docs/plans/future.md`) estão concluídas. Falta o backend que vai substituir os mocks.

Contrato de dados atual (fonte da verdade para o domínio):
- Tipos: `libs/shared-types/src/lib/finance.types.ts`
- Mocks: `libs/shared-mocks/src/lib/shared-mocks.ts`
- Utils de domínio: `libs/shared-utils/src/lib/card.ts` (`daysUntilClosing`, `cardUtilization`, `installmentProgress`, `installmentsRemaining`)

## Decisões de arquitetura (do brainstorming)

| # | Tema | Decisão |
|---|---|---|
| Identidade | `Holder` enum (Mateus/Thais/shared) | **Multi-household (multi-tenant).** Toda tabela ganha `householdId`. `Holder` vira `memberId` (FK→Member) nullable; `null` = compartilhado da casa. |
| Parcelamento | `{n, of}` embutido | **Tabela `Installment` separada** (`InstallmentPlan` 1─N `Installment`). |
| Históricos | `MOCK_HISTORY`/`MOCK_INCOME_HISTORY` | **Snapshot mensal** materializado (`MonthlySummary`). |
| Escopo | — | **Só backend agora.** |
| #2 Fatura | entidade vs query | **Híbrido:** ciclo aberto = derivado por query em tempo real; ciclos fechados = snapshot consolidado em `InvoiceHistory` gerado no fechamento. |
| #3 Gasto fixo | template vs filtro | **Template + link:** `FixedExpense` é o template; `Transaction.fixedExpenseId` (FK) marca o pagamento real. |
| #4 Aporte em meta | tx especial vs entidade | **Entidade `GoalContribution`** separada, opcionalmente ligada a uma `Transaction`. Goal não guarda `balance` cru (= soma das contribuições). |
| #5 Compartilhado | tag vs split | **Soft tag:** `memberId = null` = da casa. Divisão de valor entre membros fica como evolução futura (YAGNI). |

## Arquitetura (DDD)

App Nx novo: `apps/api-financial` (Nx já tem `@nx/nest`). Camadas por bounded context:

```
api-financial/src/
├─ shared-kernel/        → Money (Decimal), DateOnly, BillingCycle (VOs), base Entity, Result
├─ modules/<context>/
│   ├─ domain/           → entidades, value objects, eventos, ports (interfaces de repositório)
│   ├─ application/      → use-cases (commands/queries), DTOs de aplicação
│   ├─ infrastructure/   → PrismaXRepository (adapters), mappers domain↔persistence
│   └─ interface/        → controllers REST, DTOs HTTP (class-validator), guards
└─ infrastructure/
    ├─ prisma/           → PrismaService, schema.prisma, migrations, seed
    ├─ auth/             → Keycloak JWT strategy, guards, tenant-context
    └─ config/           → env (zod), módulo de config
```

**Regra DDD chave:** controllers e Prisma nunca se falam direto. Use-case depende de uma *porta* (interface no domínio); a infra fornece o adapter Prisma. Mapeamento explícito domain↔Prisma — tipos do Prisma não vazam para o domínio.

**Bounded contexts (módulos):**
- **Identity & Access** — Household, Member, integração Keycloak, tenant-context.
- **Catalog** — Category, Card.
- **Ledger** — Transaction, InstallmentPlan/Installment, Income, PaymentMethod.
- **Budgeting** — orçamento por categoria, FixedExpense.
- **Goals** — Goal, GoalContribution.
- **Reporting** — MonthlySummary e InvoiceHistory (snapshots) + queries de agregação.

## Modelo de dados (Prisma / PostgreSQL)

Convenções: toda tabela de domínio tem `householdId` (FK→Household, indexado). Dinheiro em `Decimal(12,2)`. Data de transação em `date`. `memberId` nullable em todo lugar que antes usava `Holder` (`null` = compartilhado).

| Tabela | Campos principais | Relações |
|---|---|---|
| `Household` | id, name, createdAt | 1─N tudo |
| `Member` | id, householdId, keycloakSub (uniq), name, role(`ADMIN`/`EDITOR`), color | N─1 Household |
| `Category` | id, householdId, slug, label, color, budget | N─1 Household |
| `Card` | id, householdId, ownerMemberId?, name, bank, color, closingDay, dueDay, creditLimit, last4 | N─1 Household, N─1 Member |
| `Income` | id, householdId, memberId?, label, value, date, recurring | N─1 Household/Member |
| `FixedExpense` | id, householdId, categoryId, memberId?, label, value, dueDay | N─1 Category/Member |
| `Transaction` | id, householdId, date, label, value, categoryId, memberId?, method(`PIX`/`CARD`), cardId?, note?, recurring, fixedExpenseId?, installmentId? | FKs p/ Category, Card, Member, FixedExpense, Installment |
| `InstallmentPlan` | id, householdId, totalCount, totalAmount, description | 1─N Installment |
| `Installment` | id, householdId, planId, number, dueDate, amount, status(`PENDING`/`PAID`) | N─1 Plan, 1─1 Transaction (parcela realizada, opcional) |
| `Goal` | id, householdId, slug, label, target, monthly, color, subtitle, type(`SONHO`/`EMERGENCIA`) | 1─N Contribution |
| `GoalContribution` | id, householdId, goalId, amount, date, transactionId? | N─1 Goal, 1─1 Transaction (opcional) |
| `MonthlySummary` | id, householdId, year, month, expenseTotal, incomeTotal, perCategory(jsonb), closed | uniq(householdId, year, month) |
| `InvoiceHistory` | id, householdId, cardId, year, month, closingDate, dueDate, total, perCategory(jsonb), status(`CLOSED`/`PAID`), createdAt | N─1 Card; uniq(householdId, cardId, year, month) |

**Derivados (não armazenados):** `card.current` (= soma do ciclo aberto), fatura do ciclo aberto, `daysUntilClosing`. Faturas de ciclos fechados ficam em `InvoiceHistory`.

## Multi-tenancy + Auth (Keycloak)

- **Keycloak** via Docker, realm `caixa-familia` importado de `realm-export.json`. Clients: `ui-financial` (público, SPA) e `api-financial` (bearer-only). Roles: `admin`, `editor`.
- **NestJS** valida JWT via JWKS do Keycloak (passport-jwt + jwks-rsa). `AuthGuard` global.
- **TenantContext:** guard extrai `sub` do token → busca `Member` (JIT-provision no 1º login) → injeta `{ memberId, householdId, role }` num provider request-scoped.
- **Isolamento:** repositórios Prisma sempre filtram por `householdId` do contexto (enforce em camada de repositório + Prisma `$extends` como rede de segurança). Nenhum endpoint aceita `householdId` do cliente.
- **Seed:** 1 household + 2 members (Mateus `ADMIN`, Thais `EDITOR`) mapeados aos usuários Keycloak; migra todos os mocks para esse household.

## Infra Docker

`docker-compose.yml` na raiz:
- `postgres` (app) — volume persistente, porta 5432.
- `keycloak` + `keycloak-db` (Postgres próprio) — dev mode, import de realm, porta 8080.
- (opcional) `pgadmin`.

`.env` validado por zod: `DATABASE_URL`, `KEYCLOAK_URL`, `KEYCLOAK_REALM`, `KEYCLOAK_CLIENT_ID`, etc. `.env.example` versionado.

## Superfície da API (REST)

Todos os recursos sob o tenant do token. Respostas mapeadas para o **mesmo shape** que o frontend já consome (integração futura trivial).

- `GET /households/me`, `GET /members`
- `GET/POST/PATCH/DELETE /categories`
- `GET/POST/PATCH/DELETE /cards`, `GET /cards/:id/invoice` (ciclo aberto, derivada), `GET /cards/:id/invoices` (histórico, `InvoiceHistory`)
- `GET/POST/PATCH/DELETE /transactions` (filtros: month, holder, cat, method)
- `GET/POST/PATCH/DELETE /incomes`
- `GET/POST/PATCH/DELETE /fixed-expenses`
- `GET/POST/PATCH/DELETE /goals`, `GET/POST /goals/:id/contributions`
- `GET /reports/monthly` (MonthlySummary), `GET /reports/summary`

DTOs validados com class-validator.

## Processos de fechamento (snapshots)

- **Fechamento de mês** → grava/atualiza `MonthlySummary` (expenseTotal, incomeTotal, perCategory).
- **Fechamento de fatura** (no `closingDay` de cada cartão) → grava `InvoiceHistory` consolidando o ciclo.
- Implementação inicial: use-cases acionáveis manualmente (endpoint admin/CLI). Agendamento (cron) fica como evolução; o design não depende dele para o POC.

## Migração mocks → seed

Script de seed Prisma traduz `MOCK_*` de `libs/shared-mocks`:
- `MOCK_CARDS/CATEGORIES/INCOMES/FIXED/GOALS` → tabelas diretas.
- `MOCK_TRANSACTIONS`: `{n, of}` → `InstallmentPlan` (of parcelas) + `Installment` (a #n realizada liga-se à transaction); `recurring` de fixos → `fixedExpenseId`; aportes `reserva`/`casamento` → `GoalContribution`.
- `MOCK_HISTORY`/`MOCK_INCOME_HISTORY` → `MonthlySummary` dos 12 meses (a partir daí, derivado/fechado em runtime).

## Verificação (gates)

- `docker compose up` sobe Postgres + Keycloak.
- `prisma migrate` aplica o schema; `prisma db seed` popula.
- `nx build api-financial` verde; `nx test api-financial` (use-cases) verde.
- Smoke test: `GET /transactions` autenticado retorna os 33 lançamentos do household; `GET /cards/:id/invoice` bate com a soma das compras do ciclo.

## Fora de escopo (evoluções futuras)

- Integração Angular (DataService HTTP) — spec separado.
- Agendamento (cron) dos fechamentos.
- Divisão de despesa compartilhada entre membros (split de valor).
- Fluxo de convite/onboarding de novos households via UI.
