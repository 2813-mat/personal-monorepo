# Fatia 8 — Fatura aberta pelo ciclo real

**Data:** 2026-07-24
**Umbrella:** `2026-07-11-api-front-migration-umbrella.md`
**Corrige:** a premissa errada de `2026-07-11-cards-invoice-slice-design.md` §1

---

## 1. Objetivo e escopo

A tela de fatura mostra o **total errado** nas bordas do ciclo de faturamento.

`invoice.component.ts:55-59` deriva a fatura aberta filtrando `t.method === cardId` sobre
`transactions()`, que contém o **mês-calendário** corrente. Um ciclo de faturamento não é um
mês-calendário: para um cartão que fecha dia 5, o ciclo vai de 06/jun a 05/jul. Uma compra de
10/jul pertence à fatura **seguinte**, mas a UI a soma na atual.

**A spec da Fatia 5 afirmava que `GET /cards/:id/invoice` não existia.** Existe
(`card.controller.ts:18`), e usa `billingCycleFor(card.closingDay)` — o ciclo correto.

**No escopo:**
- Backend: `InvoiceItem` ganha `holder` e `installments`, que a tela consome e a view não expõe.
- UI: a fatura aberta passa a vir de `GET /cards/:id/invoice` em vez de ser derivada.

**Fora de escopo:** fechar fatura (admin, fatia futura); o histórico de faturas fechadas (já
real desde a Fatia 5); a sparkline sintética da tabela de cartões.

## 2. Decisões

- **D1 — o client não tem como acertar sozinho.** `loadTransactions` carrega por `year`/`month`;
  um ciclo atravessa dois meses-calendário. Mesmo replicando `billingCycleFor` no front, faltaria
  metade das transações. Ou vem da API, ou continua errado — não é escolha de arquitetura.
- **D2 — a view do backend cresce dois campos.** O template usa `tx.id`, `tx.date`, `tx.label`,
  `tx.value`, `tx.cat`, `tx.holder` e `tx.installments`. O `InvoiceItem` hoje tem os cinco
  primeiros. Entram `holder` (padrão `member?.name ?? 'shared'`, como em transaction/income/fixed)
  e `installments` (`{ n, of } | null`, idêntico ao `transaction.mapper`).
- **D3 — tipo próprio na UI, não `Transaction`.** O item de fatura **não** é uma transação
  completa: não tem `method`, `recurring`, `cardId`, `note`. Entra
  `OpenInvoiceItem { id, date, label, value, cat, holder, installments }` no
  `invoice.mapper`. Os nomes de campo são os que o template já usa, então o template **não muda**.
- **D4 — carga sob demanda, junto do histórico.** A tela já dispara `loadInvoiceHistory(cardId)`
  no construtor; a fatura aberta entra no mesmo ponto. Reage a `currentMonth()`? **Não** — a
  fatura aberta é a do ciclo corrente por definição do backend (`billingCycleFor` usa `new Date()`),
  não do mês que o usuário está navegando.
- **D5 — sem fallback silencioso.** Se a chamada falhar, a tela mostra o erro pelo padrão
  `fail()`, e não volta a derivar do client. Um número plausível e errado é pior que um erro
  visível — é exatamente o que esta fatia está consertando.

## 3. Backend (`api-financial`)

Módulo `catalog/card/`.

- **`domain/card.repository.ts`** — `InvoiceItem` ganha `holder: string` e
  `installments: { n: number; of: number } | null`.
- **`infrastructure/card.prisma.repository.ts`** — `openInvoice` inclui as relações que os campos
  novos exigem: `member` e `installment: { include: { plan: true } }` (o `category` já está lá).
  O `map` dos itens emite os dois campos com a mesma lógica do `transaction.mapper`.
- **Testes:** cobrir `holder` de membro e `'shared'`, e `installments` presente/ausente.

Wire resultante:
`{ total, items: [{ id, date, label, value, categorySlug, holder, installments }] }`.

## 4. UI (`ui-financial`)

- **`core/api/wire.types.ts`**: `OpenInvoiceWire { total, items: OpenInvoiceItemWire[] }`.
- **`core/api/invoice-api.service.ts`**: `getOpen(cardId): Observable<OpenInvoiceWire>`
  (`GET /cards/{cardId}/invoice`) — o serviço já existe para o histórico.
- **`core/api/invoice.mapper.ts`**: `OpenInvoiceItem` e `wireToOpenInvoiceItem`.
- **`layout/app-data.service.ts`**: `openInvoice` (signal com `{ total, items }`),
  `loadOpenInvoice(cardId)`, `openInvoiceLoading`/`openInvoiceError`.
- **`features/invoice`**: `items()` e `total()` passam a ler o signal em vez de derivar de
  `transactions()`; o `constructor` dispara o load. `breakdown()`, `donutSegments()` e
  `futureInstallments()` continuam derivando de `items()`, agora com a base correta.

## 5. Testes e gate

- Backend: spec do repo/mapper de `openInvoice` (`holder`, `installments`, total).
- UI: `invoice-api.service.spec` (GET da fatura aberta), `invoice.mapper.spec`
  (`wireToOpenInvoiceItem`), `app-data.service.spec` (`loadOpenInvoice`),
  `invoice.component.spec` (itens e total vêm do signal, não de `transactions()`).
- `nx build` das duas apps + smoke.

## 6. Riscos

- **Regressão nas parcelas.** `futureInstallments()` depende de `installments` chegar no formato
  `{ n, of }`; se vier `null` por include faltando, o painel de parcelas esvazia em silêncio.
  Coberto por teste no backend e na UI.
- **Contagem de itens muda no smoke.** Numa base semeada, o número de lançamentos da fatura pode
  **legitimamente** diferir do que a tela mostrava antes — é o defeito sendo corrigido, não uma
  regressão. Conferir contra o ciclo do cartão, não contra o valor antigo.
- **`transactions()` continua alimentando outras telas.** Esta fatia só troca a origem da fatura;
  nada mais muda de fonte.
