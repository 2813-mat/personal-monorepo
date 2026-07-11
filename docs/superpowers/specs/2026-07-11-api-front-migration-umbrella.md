# Umbrella — Migração API ↔ Front (fatias 2–7)

**Data:** 2026-07-11
**Refina:** `docs/superpowers/plans/2026-07-04-ui-api-connection-roadmap.md`
**Natureza:** documento guarda-chuva. Consolida o estado atual, as convenções transversais já
comprovadas e as decisões travadas de cada fatia restante. Cada fatia tem seu **spec próprio**
(nesta mesma pasta) e recebe seu **plano TDD** na hora de implementar.

---

## 1. Estado atual

Prontos e em `master`:
- **Transactions** (PR #2) — fundação: auth OIDC, `authInterceptor`, `AuthService`
  (`canWrite`), camada `*-api.service` + `mapper` + `AppDataService`, toasts de erro, loads
  no `effect` do `AppShell`.
- **Incomes** (PR #3, Fatia 1) — leitura real + criação via drawer; alinhamento
  `memberId → holder` no backend.

Ainda **mock** no `AppDataService`: `goals`, `fixed`, `history`, `incomeHistory`.

Backend: todos os controllers já existem — `fixed-expenses`, `goals`, `categories`, `cards`,
`cards/:id/invoices`, `reports/monthly`.

## 2. Convenções transversais (herdadas, valem para todas as fatias)

1. **Alinhamento de contrato member → holder.** Recursos com dimensão de membro expõem
   `holder` (nome) no wire, nunca `memberId` (cuid). No backend: o mapper/view inclui a
   relação `member` e emite `holder = member?.name ?? 'shared'`; o `create` resolve
   `holder → memberId` por nome (`'shared' → undefined`). Padrão de `transaction` e `income`.
2. **Camada de dados na UI.** Por recurso: `app/core/api/<recurso>-api.service.ts` (tipado
   pelo wire, com teste `HttpTestingController`) + `app/core/api/<recurso>.mapper.ts`
   (wire ↔ shared-types, com unit test). `AppDataService` é a fachada de signals com
   `load<Recurso>()` / `create<...>()`.
3. **Erro/loading.** `AppDataService.fail(message, errorSignal)` seta o error-signal do
   recurso e dispara toast `neg`; cada recurso tem `<recurso>Loading` / `<recurso>Error`.
4. **Disparo de loads.** No `effect` de auth do `AppShell`: recursos **sem** dimensão de mês
   carregam junto do catálogo; recursos **com** dimensão de mês reagem também a
   `currentMonth()` (como transactions).
5. **Gate de write.** Botões de escrita já protegidos por `auth.canWrite()` (topbar) e por
   `@Roles('admin','editor')` no backend. Ações `admin`-only (fechar mês/fatura) ficam fora
   do escopo inicial.
6. **YAGNI de filtro.** Filtros (holder/categoria/busca) permanecem client-side; migrar para
   query params só se a performance pedir.

## 3. Ordem e dependências

Ordem dependency-aware (folhas → agregações → fechamento):

```
Fatia 2  Fixed expenses     → Budgets, Dashboard
Fatia 3  Goals              → Dashboard
Fatia 4  Categories+Budgets → Dashboard, Budgets
Fatia 5  Cards + Invoice    → —
Fatia 6  Reports (monthly)  → Dashboard
Fatia 7  Dashboard          (fechamento: agrega tudo)
```

## 4. Resumo de cada fatia (detalhe no spec de cada uma)

| Fatia | Spec | Backend muda? | Núcleo |
|------|------|---------------|--------|
| 2 Fixed | `2026-07-11-fixed-expenses-slice-design.md` | Sim (holder + paidThisMonth) | leitura por mês + create via drawer |
| 3 Goals | `2026-07-11-goals-slice-design.md` | Sim (contribuição por slug) | leitura + aporte via drawer |
| 4 Categories+Budgets | `2026-07-11-categories-budgets-slice-design.md` | Não | create categoria; Budgets lê real |
| 5 Cards+Invoice | `2026-07-11-cards-invoice-slice-design.md` | Não | histórico de faturas (read); fatura aberta segue client-derived |
| 6 Reports | `2026-07-11-reports-slice-design.md` | Não | summaries → arrays de histórico |
| 7 Dashboard | `2026-07-11-dashboard-slice-design.md` | Não | remover mock residual + estados |

## 5. Execução

Uma fatia por ciclo: **brainstorm curto (se surgir decisão nova)** → **writing-plans** (plano
bite-sized TDD) → **implementação** (controller-direto com TDD; subagentes não têm Write/Bash
neste ambiente) → **/code-review** como gate → smoke manual. **Um PR por fatia**, pequeno e
revisável.

**Limpeza final (Fatia 7):** remover de `AppDataService` os imports remanescentes de
`@caixa-familia/shared-mocks` e rebaixar `shared-mocks` a dependência só de teste.

## 6. Riscos transversais
- **Staleness de spec.** Estas specs foram escritas adiantadas; detalhes podem mudar ao
  implementar (como o filtro-por-mês surgiu em Incomes). Cada spec marca **decisões abertas**
  explicitamente; ao pegar uma fatia, revalide o contrato real antes do plano.
- **Consistência de mês.** Só `fixed` recarrega ao trocar de `currentMonth()` (o
  `paidThisMonth` é relativo ao mês). `reports` também é dado mensal, mas a UI carrega a
  **série inteira** de summaries fechados numa só chamada no login (não reage ao mês).
  `goals`, `categories`, `incomes` não têm dimensão de mês.
- **Contrato member.** Só `fixed` ainda precisa do alinhamento `holder` entre as restantes.
