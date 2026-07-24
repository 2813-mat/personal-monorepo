# Fatia 11 — Histórico real na tabela de cartões

**Data:** 2026-07-24
**Fecha:** a decisão D5 de `2026-07-11-cards-invoice-slice-design.md`, que deixou este dado
fabricado de fora por causa do custo de fan-out.

---

## 1. Objetivo e escopo

`cards.component.ts:15-21` gera a coluna **"Hist. 6m"** a partir de um seed do id do cartão:

```ts
// ATENÇÃO: dado fictício exibido ao usuário.
function cardHistory(card: Card): number[] {
  const seed = card.id.charCodeAt(0) + card.id.charCodeAt(1);
  return Array.from({ length: 6 }, (_, i) => Math.round(card.current * (0.55 + ((seed + i * 11) % 80) / 100)));
}
```

É o **último dado inventado** exibido ao usuário na aplicação. O histórico real existe em
`GET /cards/:id/invoices`, mas é por cartão: alimentar a tabela custaria uma requisição por
cartão. Esta fatia adiciona um endpoint em lote e liga a coluna.

**No escopo:** `GET /cards/invoices` (todas as faturas fechadas do household); a tabela de
cartões consumindo-o.

**Fora de escopo:** paginação/filtro do lote (o volume é de faturas fechadas de uma família);
mudar o que a coluna mostra (segue 6 pontos).

## 2. Decisões

- **D1 — lote em vez de fan-out (decisão do usuário).** Uma requisição no lugar de N.
- **D2 — lista achatada, não agrupada.** O endpoint devolve `InvoiceHistoryView[]` — o mesmo
  tipo do `GET /cards/:id/invoices`, já com `cardId` em cada linha. Agrupar no wire criaria um
  segundo formato para o mesmo dado; a UI agrupa por `cardId` no mapper.
- **D3 — a rota estática vem antes da paramétrica.** `@Get('invoices')` é declarado **antes** de
  `@Get(':id/invoices')` no mesmo controller. Os dois têm contagens de segmento diferentes e não
  colidem hoje, mas a ordem defensiva evita que uma rota `:id` futura capture `invoices`.
- **D4 — carrega no login.** Não tem dimensão de mês; entra no `effect` de auth junto de
  catálogo, receitas, metas e relatórios.
- **D5 — os últimos 6, e menos que isso quando não houver.** A coluna mostra os até 6 fechamentos
  mais recentes do cartão. Sem nenhum, a série é vazia — `cf-sparkbars` não desenha barra e não
  produz `NaN` (`d.map` sobre vazio), então o estado vazio é honesto por construção.
- **D6 — a função fabricada morre.** `cardHistory()` é removida, não desativada.

## 3. Backend (`api-financial`)

Módulo `reporting/invoice-history/`.

- **`domain/invoice-history.repository.ts`** — `findAll(): Promise<InvoiceHistoryView[]>`.
- **`infrastructure/invoice-history.prisma.repository.ts`** — `findAll` espelha `findByCard`
  sem o filtro de cartão, ordenando por `cardId`, `year`, `month`.
- **`application/list-all-invoices.usecase.ts`** (novo).
- **`interface/invoice-history.controller.ts`** — `@Get('invoices')`, declarado antes de
  `@Get(':id/invoices')` (D3). Sem `@Roles`: é leitura, como os demais GETs.

## 4. UI (`ui-financial`)

- **`core/api/invoice-api.service.ts`**: `listAll(): Observable<InvoiceHistoryWire[]>`.
- **`core/api/invoice.mapper.ts`**: `groupInvoiceHistoryByCard(rows): Record<string, InvoiceHistoryEntry[]>`.
- **`layout/app-data.service.ts`**: `invoiceHistoryByCard` (signal do mapa) e
  `loadAllInvoiceHistory()`.
- **`layout/app-shell.component.ts`**: chamar no `effect` de auth.
- **`features/cards/cards.component.ts`**: `historyOf(card)` lê o mapa e devolve os até 6 últimos
  totais; `cardHistory()` sai.

## 5. Testes e gate

- Backend: spec do repo (`findAll` sem filtro de cartão, ordenação).
- UI: `invoice-api.service.spec` (GET do lote); `invoice.mapper.spec` (agrupamento, cartão sem
  faturas); `app-data.service.spec` (`loadAllInvoiceHistory`); `cards.component.spec` (novo —
  série real, corte em 6, cartão sem histórico).
- `nx build` + `nx test` + `nx lint`.
- **Gate de dado fabricado:** `grep -rn "charCodeAt" apps/ui-financial/src --include=*.ts`
  (fora de specs) retorna vazio.

## 6. Riscos

- **Volume do lote.** Todas as faturas fechadas de todos os cartões numa chamada. Para uma
  família é trivial; se algum dia crescer, o corte natural é limitar por janela de meses no
  backend. Registrar, não otimizar agora.
- **Cartões sem fechamento.** Numa base recém-semeada pode não haver `invoiceHistory` para
  vários cartões — a coluna fica vazia para eles. É o comportamento correto, mas visualmente
  muda em relação ao que sempre apareceu (barras inventadas para todos).
