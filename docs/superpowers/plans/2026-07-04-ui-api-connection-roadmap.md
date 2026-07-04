# Roadmap — Conectar API ↔ Front de forma incremental

**Data:** 2026-07-04
**Branch de origem do padrão:** `feat/ui-api-connection-transactions`
**Natureza:** roadmap de decomposição. Cada fatia abaixo é um sub-projeto que ganha seu
próprio ciclo **spec → plano → implementação (TDD)**, exatamente como a fatia de
Transactions já feita. Este documento define **o quê**, **em que ordem** e **o que se
reaproveita** — não o detalhamento bite-sized de cada fatia (isso vem no plano de cada uma).

---

## 1. O que já está pronto (base reutilizável)

A fatia de **Transactions** (feita) entregou a fundação que todas as próximas fatias herdam:

- **Auth OIDC completa:** login Keycloak (Auth Code + PKCE), `authInterceptor` anexando o
  Bearer nas chamadas de `apiBaseUrl`, `AuthService` (signals `isAuthenticated`,
  `userName`, `roles`, `canWrite`), guard de rota, e o tema de login custom.
- **Camada de dados padrão:** `AppDataService` como fachada de signals; por recurso há um
  **API service** (`*-api.service.ts`) + **mapper** (wire ↔ shared-types) em
  `app/core/api/`.
- **Erro/loading:** helper `AppDataService.fail()` → toast `neg`; signals de loading.
- **Disparo de loads:** `effect()` no `AppShell` que carrega ao autenticar e reage a
  `currentMonth()`.
- **Alinhamento de contrato no backend:** padrão `member.name` como `holder` (aplicado em
  transaction read/create e no card list).

## 2. Template de cada fatia (o que se repete)

Cada fatia nova segue **o mesmo roteiro** de Transactions:

1. **Backend (só se preciso):** alinhar o contrato do recurso ao `shared-types`
   (tipicamente `memberId → holder`; `categorySlug → cat`; `slug → id`). Mudança pequena
   e testada no mapper/view do módulo.
2. **UI — API service:** `app/core/api/<recurso>-api.service.ts` (GET/POST) tipado pelo
   wire, com teste `HttpTestingController`.
3. **UI — mapper:** `app/core/api/<recurso>.mapper.ts` (wire ↔ shared-types), com unit test.
4. **UI — AppDataService:** métodos `load<Recurso>()` / `create<...>()` que preenchem os
   signals e usam `fail()` em erro.
5. **UI — componentes:** trocar leitura de mock por signal real; rotear writes pela API;
   gate de write por `auth.canWrite()`.
6. **Loads:** incluir o `load` no `effect` do shell (por auth e, se aplicável, por mês).
7. **Testes/gate:** unit (mapper + api service + AppDataService) + `nx build` (o jest não
   faz type-check estrito) + smoke manual contra o stack rodando.

**Nota recorrente de contrato:** `incomes` e `fixed-expenses` têm `memberId` no wire e
`holder` no `shared-types` → recebem o **mesmo alinhamento** de Transactions. `goals`,
`reports` e `invoices` **não** têm member.

## 3. Ordem recomendada (dependency-aware)

Recursos-folha primeiro; páginas de agregação depois (elas ficam "reais de verdade" só
quando suas entradas estão conectadas). O **Dashboard** vem por último porque agrega quase
tudo.

```
Fase A (folhas, writes simples)     Fase B (agregações)          Fase C (fechamento)
  1. Incomes                          4. Categories + Budgets       7. Dashboard
  2. Fixed expenses                   5. Cards detail + Invoice
  3. Goals                            6. Reports (monthly)
```

Alternativa **value-first** (se preferir ver as telas mais usadas reais antes): Budgets →
Dashboard parcial → Goals → Incomes → Fixed → Reports → Invoice. Custo: o Dashboard/Budgets
mostram dados mistos (real+mock) por mais tempo. **Recomendo a ordem dependency-aware.**

---

## 4. As fatias

### Fatia 1 — Incomes
- **Endpoints:** `GET /incomes`, `POST /incomes` (role editor/admin).
- **Contrato:** wire tem `memberId` → **alinhar backend** para `holder` (mesmo padrão de tx);
  demais campos (`label`, `value`, `date`, `recurring`) 1:1 com `Income`.
- **UI:** `IncomeApiService` + `income.mapper`; `AppDataService.loadIncomes()` /
  `createIncome()`; ligar o `expense-drawer` (tipo "income") ao create; `incomes` signal
  deixa de ser mock.
- **Depende de:** nada além da base. **Alimenta:** Dashboard, Reports.

### Fatia 2 — Fixed expenses
- **Endpoints:** `GET /fixed-expenses`, `POST /fixed-expenses`.
- **Contrato:** wire tem `categorySlug`, `memberId`, `dueDay`, `paidThisMonth`. Map:
  `cat = categorySlug`, `holder` (alinhar backend), `due = dueDay`. `paidThisMonth` é extra
  (avaliar expor no `FixedExpense` do shared-types ou ignorar por ora).
- **UI:** `FixedApiService` + mapper; `loadFixed()` / `createFixed()`; feature `fixed`
  passa a ler real.
- **Depende de:** categorias (já carregadas). **Alimenta:** Budgets, Dashboard.

### Fatia 3 — Goals
- **Endpoints:** `GET /goals`, `POST /goals/:id/contributions`.
- **Contrato:** wire tem `slug`, `balance`, `history[]`, `target`, `monthly`, `color`,
  `subtitle`, `type`. Map `id = slug`; sem member. Contribuição = aporte (soma ao `balance`).
- **UI:** `GoalApiService` + mapper; `loadGoals()` / `addContribution()`; feature `goals`
  real, com o fluxo de aporte via API.
- **Depende de:** nada além da base. **Alimenta:** Dashboard.

### Fatia 4 — Categories (writes) + Budgets
- **Endpoints:** `GET /categories` (já usado), `POST /categories`.
- **Contrato:** `Category` já mapeado (`id = slug`). Adicionar o **create/edit** (orçamento
  por categoria).
- **UI:** estender `CatalogApiService` com create; `createCategory()`; feature `budgets`
  passa a computar gasto-vs-orçamento com categorias + transações reais (ambas já
  carregadas) e permite editar orçamento. Feature `settings` (edição de categorias) entra
  aqui se desejado.
- **Depende de:** categorias + transactions (têm). **Alimenta:** Dashboard, Budgets.

### Fatia 5 — Cards detail + Invoice
- **Endpoints:** `GET /cards/:id/invoice` (fatura aberta), `GET /cards/:id/invoices`
  (histórico), `POST /cards/:id/invoices/close`.
- **Contrato:** invoice retorna `{ total, items[] }` com `categorySlug` nos itens →
  mapear itens como transações (reuso do `transaction.mapper` parcial). Histórico:
  `{ total, perCategory, ... }`.
- **UI:** `InvoiceApiService` + mapper; feature `invoice` (rota `cards/:cardId/invoice`)
  passa a ler a fatura real; cartões já vêm reais da Fatia 0 (supporting read).
- **Depende de:** cards + transactions (têm). **Alimenta:** —.

### Fatia 6 — Reports (monthly)
- **Endpoints:** `GET /reports/monthly`, `POST /reports/monthly/close`.
- **Contrato:** `{ year, month, expenseTotal, incomeTotal, perCategory, closed }` →
  mapear para o formato de histórico que a UI usa (`MOCK_HISTORY` / `incomeHistory`).
- **UI:** `ReportApiService` + mapper; `loadMonthlyHistory()`; feature `reports` real;
  ação de "fechar mês" via API (gate por role).
- **Depende de:** transactions + incomes (Fatia 1) para totais coerentes.

### Fatia 7 — Dashboard (fechamento)
- **Endpoints:** nenhum novo — agrega os signals já conectados.
- **Trabalho:** remover as últimas leituras de mock; garantir que os cards do dashboard
  (saldo, gastos, metas, fatura, fixos) leem os signals reais; estados de loading/empty.
- **Depende de:** Fatias 1–6. É essencialmente verificação + limpeza de mock residual.

---

## 5. Execução de cada fatia

Para cada fatia, na ordem: **brainstorm curto** (confirmar escopo/contrato e decisões
abertas) → **writing-plans** (plano bite-sized TDD) → **implementação** (subagent-driven ou
controller-direto, como em Transactions, dado que subagentes não têm Write/Bash neste
ambiente) → **/code-review** como gate → smoke manual. Uma fatia por ciclo mantém os PRs
pequenos e revisáveis.

**Limpeza final (após todas):** remover de `AppDataService` os imports de
`@caixa-familia/shared-mocks` que sobrarem e a lib `shared-mocks` do build de produção
(pode virar dependência só de teste).

## 6. Premissas / riscos transversais
- **Filtro server-side:** hoje a UI filtra holder/categoria/busca no client; manter assim
  por fatia, migrar para query params só se performance pedir (YAGNI).
- **Consistência de mês:** recursos com dimensão mensal (incomes, reports) devem respeitar
  `currentMonth()` no load, como transactions.
- **Contrato member:** se surgirem mais telas que precisam listar membros (ex: seletor de
  titular no form), aí sim vale um endpoint de membros dedicado — fora do escopo até então.
