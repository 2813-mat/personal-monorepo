# Umbrella — Migração API ↔ Front

**Data:** 2026-07-11 · **Estado atualizado em:** 2026-07-24
**Refina:** `docs/superpowers/plans/2026-07-04-ui-api-connection-roadmap.md`
**Natureza:** documento guarda-chuva. Consolida o estado atual, as convenções transversais
comprovadas e o que resta. Cada fatia tem seu **spec próprio** (nesta pasta) e um **plano TDD**
em `docs/superpowers/plans/`.

---

## 1. Estado atual (2026-07-24)

**A migração está concluída.** Nenhuma tela da UI consome dado mock ou fabricado.

Fatias 1–7 (a migração planejada) e 8–12 (defeitos encontrados durante ela) estão em `master`.
Suítes no fechamento: **api-financial 24/56**, **ui-financial 25/177**, builds e lint verdes.

**Zero mock em produção**, garantido por duas travas:
- `grep "shared-mocks\|MOCK_" apps/ui-financial/src --include=*.ts` (fora de specs) → vazio.
- Regra de `@nx/enforce-module-boundaries`: `scope:web` não pode depender de `type:data`.
  Reintroduzir o import **quebra o lint**. Specs seguem liberadas por override; o `seed.ts` do
  backend continua usando a lib.

**Zero dado fabricado**: `grep "charCodeAt" apps/ui-financial/src --include=*.ts` (fora de
specs) → vazio.

### Endpoints × consumo

Dos 18 endpoints do backend, **todos** têm consumidor na UI, exceto os dois sem contrapartida
de produto (`Boleto`/`Pagar agora` não existem no backend).

| Recurso | Leitura | Escrita |
|---|---|---|
| transactions | `GET` por mês | `POST`, `DELETE` |
| incomes | `GET` | `POST` |
| fixed-expenses | `GET` por mês | `POST` |
| goals | `GET` | `POST /:slug/contributions` |
| categories | `GET` | `POST` |
| cards | `GET` | — |
| fatura aberta | `GET /cards/:id/invoice` | — |
| histórico de faturas | `GET /cards/:id/invoices`, `GET /cards/invoices` | `POST /:id/invoices/close` (admin) |
| reports mensais | `GET /reports/monthly` | `POST /reports/monthly/close` (admin) |

## 1b. Defeitos encontrados durante a migração

Todos tinham a mesma causa raiz: **dado mock esconde o caso real**. Ficam registrados porque o
padrão tende a se repetir.

| # | Defeito | Onde |
|---|---|---|
| 1 | Chip "Aporte" do drawer não tinha ramo no `save()` — criava uma **transação** | Fatia 3 |
| 2 | Histórico da fatura fabricado de um seed do `cardId`, com média/máx/mín em cima | Fatia 5 |
| 3 | Gráfico de Relatórios fixava 12 meses (18 meses vazavam até x=1646 num SVG de 1100) e a escala virava `-Infinity` com série vazia (`Math.max()` é `-Infinity`, que é *truthy*) | Fatia 6 |
| 4 | `CURRENT_MONTH` travava o app inteiro em maio/2026 — e o mês vai na query de transações e fixos | Fatia 7 |
| 5 | Rótulo de mês mudava de formato ao navegar (`'Mai/26'` → `'mai. de 26'`) | Fatia 7 |
| 6 | `loadCatalog()` sem ramo de erro: falha de categorias/cartões passava sem toast | Fatia 7 |
| 7 | Fatura aberta derivada do **mês-calendário** em vez do ciclo de faturamento | Fatia 8 |
| 8 | KPIs de Relatórios com ano fixo (`'/26'`, `'/25'`) — zerariam em 01/01/2027 | Fatia 9 |
| 9 | Sparkline dos cartões fabricada de um seed | Fatia 11 |
| 10 | Sparkline **e média histórica** de Orçamentos fabricadas de um seed | Fatia 12 |

**Padrão recorrente (3 ocorrências):** o wire trazia o dado, o **mapper descartava**, e a tela
inventava um substituto. Aconteceu com `holder`/`installments` (fatia 8), `year`/`month`
(fatia 9) e `perCategory` (fatia 12). Ao criar um mapper, **descartar campo é decisão**, não
default.

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

## 3. Fatias entregues

Todas com spec em `docs/superpowers/specs/` e plano TDD em `docs/superpowers/plans/`.

| # | Fatia | Spec | Backend mudou? |
|---|-------|------|----------------|
| 1 | Incomes | `2026-07-11-incomes-slice-design.md` | Sim (`holder`) |
| 2 | Fixed expenses | `2026-07-11-fixed-expenses-slice-design.md` | Sim (`holder`) |
| 3 | Goals | `2026-07-11-goals-slice-design.md` | Sim (contribuição por slug) |
| 4 | Categories + Budgets | `2026-07-11-categories-budgets-slice-design.md` | Não |
| 5 | Cards + Invoice (histórico) | `2026-07-11-cards-invoice-slice-design.md` | Não |
| 6 | Reports (monthly) | `2026-07-11-reports-slice-design.md` | Não |
| 7 | Dashboard + limpeza | `2026-07-11-dashboard-slice-design.md` | Não |
| 8 | Fatura aberta pelo ciclo real | `2026-07-24-open-invoice-slice-design.md` | Sim (`holder`, `installments`) |
| 9 | KPIs sem ano fixo | `2026-07-24-reports-year-slice-design.md` | Não |
| 10 | Ações de fechamento (admin) | `2026-07-24-admin-close-slice-design.md` | Sim (ciclo na fatura aberta) |
| 11 | Histórico real nos cartões | `2026-07-24-cards-history-slice-design.md` | Sim (`GET /cards/invoices`) |
| 12 | Histórico real em Orçamentos | `2026-07-24-budgets-history-slice-design.md` | Não |

## 4. O que falta

Nada da migração. O que resta é **funcionalidade nova**, e o gargalo é backend: fora de
`DELETE /transactions/:id`, **não existe nenhum `PATCH` ou `DELETE` no projeto**.

Os stubs `disabled` da UI marcam exatamente onde:

| Stub | Onde | Endpoint necessário |
|---|---|---|
| Editar meta / aportar pelo card | `features/goals/goal-card.component.html` | `PATCH /goals/:slug` |
| Editar orçamento, Reordenar | `features/settings` | `PATCH`/`DELETE /categories/:slug` |
| Editar transação, "Marcar como conferido" | `features/tx-detail-drawer` | `PATCH /transactions/:id` |
| Convidar pessoa | `features/settings` | módulo de membros inteiro |
| Editar/remover gasto fixo | — | `PATCH`/`DELETE /fixed-expenses/:id` |
| Boleto, Pagar agora | `features/invoice` | integração de pagamento (fora de escopo hoje) |

Cada linha é uma fatia backend + UI, bem maior que as 12 acima.

**Dívidas menores registradas:**
- `settings.component.scss` ~860 bytes acima do budget de 4 kB do build (5 outros componentes já
  estouram o mesmo limite — padrão preexistente, decisão de config pendente).
- `futureInstallments()` da tela de fatura projeta os meses a partir de `currentMonth()`, mas a
  fatura aberta é sempre a do ciclo corrente: navegando de mês, os rótulos das parcelas deslizam
  enquanto a fatura fica parada. Preexistente.
- Filtros de holder/categoria/busca seguem client-side (YAGNI consciente).

## 5. Execução

Uma fatia por ciclo: **brainstorm curto (se surgir decisão nova)** → **writing-plans** (plano
bite-sized TDD) → **implementação** (controller-direto com TDD; subagentes não têm Write/Bash
neste ambiente) → **/code-review** como gate → smoke manual.

Nesta sessão as fatias foram commitadas direto em `master` a pedido do usuário, uma sequência de
commits pequenos por fatia, em vez de um PR por fatia.

### Como os loads são disparados (`AppShell`)

Dois `effect`, e a distinção importa:

- **Efeito de auth** (sem mês): `loadCatalog`, `loadIncomes`, `loadGoals`, `loadMonthlyHistory`,
  `loadAllInvoiceHistory`.
- **Efeito de auth + `currentMonth()`**: `loadTransactions`, `loadFixed` — só estes dois têm
  dimensão de mês.
- **Sob demanda, pela tela**: `loadOpenInvoice(cardId)` e `loadInvoiceHistory(cardId)`, disparados
  no construtor do `InvoiceComponent`, que é quem conhece o cartão da rota.

## 6. Aprendizados que valem para o próximo ciclo

- **O `nx build` é o gate que importa na UI.** O jest de `ui-financial` **não** faz type-check
  estrito de template. Três vezes nesta sessão a suíte inteira passou verde e o build pegou o
  erro (`TS2322` de `Holder`, entre outros). Rodar build antes de dar por pronto.
- **Descartar campo no mapper é decisão.** Ver o padrão recorrente em §1b.
- **Não replicar regra de negócio no front.** O ciclo de faturamento vive em
  `billingCycleFor` no backend; a UI **ecoa** as coordenadas que a API devolve. Há comentário
  no código avisando para não "corrigir" para `currentMonth()`.
- **Verificar que a trava trava.** A regra de fronteira do `shared-mocks` foi validada
  reintroduzindo a violação de propósito e confirmando que o lint falha.
- **Specs escritas adiantadas envelhecem.** Duas premissas herdadas estavam erradas: a Fatia 5
  afirmava que `GET /cards/:id/invoice` não existia (existia), e a Fatia 4 assumia um formulário
  de categoria que não existia (era um botão `disabled`). **Revalidar o contrato real antes do
  plano**, não confiar na spec.

## 7. Riscos transversais (ainda válidos)
- **Consistência de mês.** Só `transactions` e `fixed` reagem a `currentMonth()`. `reports`
  carrega a série inteira uma vez; `goals`, `categories`, `incomes` não têm dimensão de mês;
  a **fatura aberta** é sempre a do ciclo corrente e **não** segue o mês navegado.
- **Contrato member.** Concluído: `transaction`, `income`, `fixed` e os itens da fatura aberta
  emitem `holder`. Qualquer recurso novo com dimensão de membro deve seguir o mesmo padrão.
- **Base sem dados fechados.** Várias telas mostram série vazia quando não há mês/fatura
  fechados (Relatórios, Orçamentos, cartões, painel de histórico). É o comportamento correto,
  mas difere do que aparecia quando tudo era inventado — não confundir com regressão no smoke.
