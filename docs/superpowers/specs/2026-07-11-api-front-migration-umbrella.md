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

**O gargalo de backend foi resolvido em 2026-08-06.** Spec em
`2026-08-06-api-write-endpoints-design.md`, plano em
`../plans/2026-08-06-api-write-endpoints.md`. Sete endpoints novos, mais duas colunas
(`Category.order`, `Transaction.reviewed`). Fechamento: **119 testes** de `api-financial`,
build verde, e fumaça de ponta a ponta atrás do guard do Keycloak nos sete.

| Stub | Onde | Endpoint | Estado |
|---|---|---|---|
| Editar meta / aportar pelo card | `features/goals/goal-card.component.html` | `PATCH /goals/:slug` | **ligado** |
| Editar orçamento | `features/settings` | `PATCH /categories/:slug` | **ligado** |
| Reordenar categorias | `features/settings` | `PATCH /categories/order` | **ligado** |
| Excluir categoria | `features/settings` | `DELETE /categories/:slug` | **ligado** |
| Editar transação | `features/tx-detail-drawer` | `PATCH /transactions/:id` | **ligado** |
| Marcar como conferido | `features/tx-detail-drawer` | `PATCH /transactions/:id` (`reviewed`) | **ligado** |
| Editar/remover gasto fixo | `features/fixed` | `PATCH`/`DELETE /fixed-expenses/:id` | **ligado** |
| Cadastro de cartão | `features/settings` | `POST`/`PATCH`/`DELETE`/`archive /cards` | **ligado** |
| Convidar pessoa | `features/settings` | módulo de membros inteiro | fora de escopo |
| Boleto, Pagar agora | `features/invoice` | integração de pagamento | fora de escopo |

**Projeto 3 entregue em 2026-08-07.** Spec em `2026-08-06-ui-write-actions-design.md`, plano em
`../plans/2026-08-06-ui-write-actions.md`. Todos os stubs de escrita estão ligados: três
drawers de edição novos (`category`, `goal`, `fixed`), modo edição dentro do `expense-drawer`
para transação, reordenação de categorias por setas, exclusão com confirmação em categoria e
gasto fixo, e o 409 de categoria em uso traduzido com as contagens que a API devolve.
Fechamento: **288 testes** de `ui-financial`, lint e build verdes, e os nove fluxos percorridos
no Chrome em 1280px e 375px. A passagem visual pegou quatro defeitos que a suíte verde
escondia — o drawer de detalhe defasado depois de um PATCH, os chips de tipo ainda clicáveis
na edição, o `cursor: not-allowed` gravado na classe dos botões que deixaram de ser stubs, e
as colunas de ação estreitas demais para dois botões.

O que resta fora de escopo continua igual: módulo de membros ("Convidar pessoa"), integração
de pagamento ("Boleto"/"Pagar agora"), e os dois botões mortos abaixo.

**Comportamento alterado de propósito:** `DELETE /transactions/:id` respondia 204 mesmo com id
inexistente (usava `deleteMany` sem olhar o `count`). Agora responde **404**.

**Dois botões mortos**, sem `(click)` e sem `disabled`, continuam pendentes de decisão de
produto (implementar ou remover): "Importar" (`topbar.component.html`) e "Exportar"
(`transactions.component.html`).

**Responsividade mobile-first entregue em 2026-08-06.** Spec em
`2026-08-06-responsividade-mobile-design.md`, plano em
`../plans/2026-08-06-responsividade-mobile.md`. Breakpoint único de 768px, bottom-nav com
botão central de novo gasto, 9 das 14 tabelas viram cards no celular, drawers em tela cheia.
Fechamento: **225 testes**, lint e build verdes, e validação visual em 375/768/1280 com
`scrollWidth == clientWidth` nas 8 rotas.

**Cadastro de cartão entregue em 2026-08-07.** Spec em `2026-08-07-cards-crud-design.md`, plano
em `../plans/2026-08-07-cards-crud.md`. Produção já não depende de `INSERT` na mão: dá para
criar, editar, arquivar e excluir cartão pela tela. `Card` ganhou `archived`; excluir cartão em
uso responde 409 com as contagens e a UI oferece arquivar. Fechamento: **api-financial 143
testes**, **ui-financial 330**, e os oito fluxos percorridos em 1280px e 375px.

É a **primeira de três fatias**. O "substituir cartão" pedido — passado fica no antigo, futuro
migra para o novo — depende de dado que ainda não existe: uma compra em 12× grava só a parcela
atual, e `FixedExpense` não tem coluna de cartão. Restam:

- **Fatia 2:** materializar o cronograma de parcelas, com o cartão no `InstallmentPlan`;
- **Fatia 3:** `cardId` no gasto fixo e `POST /cards/:id/replace` com a migração.

**Dívidas da fatia de ações de escrita (2026-08-07) — as duas pagas no mesmo dia:**
- ~~`app-data.service.ts` passou de 400 linhas~~ — **resolvido**: sete stores em
  `core/state/` (catalog, transaction, income, fixed, goal, invoice, report), mais
  `ViewContextService` (mês corrente e filtro de titular) e `FailureReporter` (o par
  sinal-de-erro + toast que estava duplicado em cada `error:`). `AppDataService` continua
  como fachada — reexporta sinais e delega métodos, superfície pública idêntica. A fachada
  fica porque ~15 componentes a injetam e 15 specs a mockam. Os 288 testes passaram sem uma
  linha de spec alterada, o que é a prova de que nada mudou de comportamento.
- ~~Os três drawers de edição compartilham a mesma folha de estilo **copiada**~~ —
  **resolvido**: `styles/_edit-drawer.scss`, com os três fazendo `@use 'edit-drawer'`.
- `tsc -p tsconfig.spec.json --noEmit` segue como disciplina manual, fora do target `test` do
  Nx. Ele pegou dois erros reais que a suíte verde escondia (um mock de `Income` com `reviewed`,
  campo que `Income` não tem).
- `reports.component.spec.ts` tem três fixtures de `MonthEntry` sem `year`/`month`/`perCategory`.
  Preexistente; enquanto existirem, o `tsc` dos specs nasce com ruído.

**Dívidas menores registradas:**
- ~~`settings.component.scss` acima do budget de 4 kB~~ — **resolvido**: o budget
  `anyComponentStyle` subiu para 8 kB (aviso) / 16 kB (erro) na fatia de responsividade. O
  limite antigo já não descrevia o projeto (10 de 16 componentes o estouravam) e o
  `maximumError` de 8 kB bloquearia os estilos mobile.
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
