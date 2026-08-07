# Cadastro de cartões (Fatia 1 de 3) — Design

**Data:** 2026-08-07
**Umbrella:** `2026-07-11-api-front-migration-umbrella.md`

## Problema

Não existe como cadastrar um cartão pelo site. Hoje a base de desenvolvimento tem cartões
semeados e por isso as telas funcionam; **produção não tem nenhum**, e a alternativa é rodar
`INSERT` na mão. `POST`, `PATCH` e `DELETE /cards` não existem — o `CardController` só tem
`GET /` e `GET /:id/invoice`.

## Onde esta fatia se encaixa

O pedido original era "criar, editar, substituir e excluir cartões". A investigação mostrou que
**substituir**, como foi descrito — o que já passou fica no cartão antigo, o parcelamento futuro
e a recorrência passam para o novo — depende de dado que não existe:

- Uma compra em 12× grava **uma** `Transaction`, **um** `InstallmentPlan` com `totalCount: 12` e
  **uma** `Installment`, a parcela atual. As outras 11 não são linha no banco: a tela de fatura
  as projeta no cliente (`futureInstallments()` em `invoice.component.ts` é um `computed`).
- `FixedExpense` não tem coluna de cartão. Um gasto fixo tem categoria, titular, valor e dia —
  nada diz em qual cartão ele cai.

Daí a decomposição em três fatias, todas a construir, nesta ordem:

| Fatia | Escopo | Depende de |
|---|---|---|
| **1 — esta** | CRUD de cartão + arquivar | — |
| 2 | Cronograma de parcelas materializado (as N viram linha) | — |
| 3 | `cardId` no gasto fixo + `POST /cards/:id/replace` com migração | 1 e 2 |

**Decisão registrada para a Fatia 2:** as parcelas futuras viram linhas de `Installment` **sem**
`Transaction`, e o cartão passa a viver também no `InstallmentPlan`. Não se inventa lançamento
que não aconteceu — "gastos do mês" continua significando o que significa hoje — e a migração
da Fatia 3 vira um `UPDATE` em uma linha. A alternativa (materializar as 12 como `Transaction`
com data futura) mudaria o sentido de todo KPI, relatório e fechamento já entregues.

## Decisões desta fatia

1. **Excluir só cartão zerado.** Com lançamento ou fatura fechada atrás, o `DELETE` responde
   **409 com as contagens**, e a UI oferece arquivar no lugar. Motivo estrutural:
   `InvoiceHistory.cardId` é FK obrigatória — apagar o cartão exigiria apagar faturas fechadas.
   E `Transaction.cardId`, embora anulável, não pode ser zerado: um gasto no crédito passaria a
   aparecer como Pix, mentindo sobre o passado.
2. **`GET /cards` devolve todos, com `archived: boolean`.** Esconder arquivados na API quebraria
   o `cardBy` da UI, e um lançamento de março ficaria sem método na tela. A API entrega tudo e a
   UI decide onde cada um aparece.
3. **Os controles ficam em Configurações → Cartões**, no molde que Categorias acabou de receber.
4. **Titular chega como `Holder`** (`'Mateus' | 'Thais' | 'shared'`) e é resolvido para
   `ownerMemberId` por nome no repositório, como transação e gasto fixo já fazem. `'shared'`
   grava `null`.

## Schema

`Card` ganha uma coluna:

```prisma
archivedAt DateTime?
```

Nada mais muda. `ownerMemberId` já existe.

## API

| Verbo | Rota | Papel |
|---|---|---|
| `POST` | `/cards` | cria |
| `PATCH` | `/cards/:id` | edita; corpo vazio → 400, via `requireNonEmptyPatch` |
| `DELETE` | `/cards/:id` | 204 no cartão zerado; 409 com contagens caso contrário |
| `PATCH` | `/cards/:id/archive` | `{ archived: boolean }` grava ou limpa `archivedAt` |

Todas atrás de `@Roles('admin', 'editor')`, como as demais escritas.

**Corpo de criação:**

```ts
{ name, bank, color, closingDay, dueDay, creditLimit, last4, holder }
```

`color` valida `@IsHexColor` (mesma regra de categoria), `closingDay` e `dueDay` ficam em 1–31,
`last4` é exatamente 4 dígitos, `creditLimit` é positivo.

**Corpo do 409:**

```ts
{ message: 'Cartão em uso', transactions: number, invoices: number }
```

Mesma forma do 409 de categoria, para a UI traduzir com um `cardConflictMessage` irmão do
`categoryConflictMessage` que já existe.

**Wire de leitura:** hoje **não existe `CardWire`** — `listCards()` devolve o `Card` de
`shared-types` direto, sem mapper, e a `card.view.ts` da API monta esse mesmo tipo. Esta fatia
cria `CardWire` (cópia de `Card` mais `archived: boolean`), e o `Card` de domínio ganha
`archived` também, porque a UI precisa dele para separar ativos de arquivados.

> **`shared-types` atravessa os dois apps.** Mexer em `Card` quebra o type-check de
> `api-financial`, porque `seed.ts` importa `libs/shared-mocks`. `MOCK_CARDS` precisa ganhar
> `archived: false` e o seed precisa gravar a coluna. É a mesma armadilha que custou uma task
> não prevista na fatia anterior — rodar `npx nx build api-financial` ao tocar no tipo.

> **Atenção ao roteamento:** `@Patch(':id/archive')` precisa vir **antes** de `@Patch(':id')`,
> pela mesma razão que `@Patch('order')` veio antes de `@Patch(':slug')` em categoria.

## UI

**`card-edit-drawer`** em `features/settings/`, terceiro irmão dos drawers de edição — usa a
`styles/_edit-drawer.scss` comum. Serve para os dois modos: sem `card` de entrada abre vazio e
chama `createCard`; com `card` preenche e chama `updateCard`. Campos: nome, banco, cor, últimos
4 dígitos, limite, dia de fechamento, dia de vencimento, titular.

**Configurações → Cartões** ganha `+ Novo cartão` no cabeçalho e, por linha, ⚙ editar e ✕
excluir — célula de ação de 84px, e os mesmos botões-pílula no card mobile.

**Excluir é um fluxo de dois passos.** A UI não tem como saber de antemão se o cartão está em
uso: ela só carrega os lançamentos do mês corrente, e o cartão pode ter histórico de anos.

```
✕ → "Excluir cartão?" → DELETE
                          ├─ 204 → sai da lista
                          └─ 409 → "Não dá para excluir: 47 lançamentos e 8 faturas
                                    usam este cartão. Arquivar em vez disso?"
                                   [Cancelar] [Arquivar]
```

O segundo modal transforma o erro em caminho de saída, em vez de um toast que só reclama.

**Arquivado** aparece só em Configurações, com pílula `Arquivado` e o ✕ trocado por
*Desarquivar*. Some do resto por um `activeCards` novo no `CatalogStore`:

- `cards` — lista completa, alimenta `cardBy` (resolve o cartão de lançamentos antigos) e a
  tabela de Configurações;
- `activeCards` — `cards().filter(c => !c.archived)`, alimenta o seletor de método do
  `expense-drawer` e a tela `/cards`.

Isto encosta em **duas telas já entregues**: `expense-drawer` e `/cards` trocam a fonte da
lista. Uma linha em cada, e os testes das duas entram no gate.

## Camada de dados da UI

Seguindo o padrão da fatia anterior:

- `wire.types.ts`: `CreateCardWire`, `UpdateCardWire`, `archived` em `CardWire`;
- `catalog-api.service.ts`: `createCard`, `updateCard`, `removeCard`, `archiveCard`;
- `card.mapper.ts` novo, ao lado de `catalog.mapper.ts`: `wireToCard`, `cardToCreateWire`,
  `cardToUpdateWire`. Hoje não há mapper de cartão — `listCards` devolve `Card` direto — e
  `archived` é a razão para passar a ter um. `catalog.mapper.ts` fica só com categoria;
- `CatalogStore`: `createCard`, `updateCard`, `removeCard`, `archiveCard`, `activeCards`;
- `AppDataService`: delegação, como o resto.

## Erros

Cada escrita segue o padrão da fachada: recarrega o catálogo no sucesso, e no erro chama
`FailureReporter.report(msg, cardsError)`, que grava o sinal e mostra o toast. A exceção é o
`DELETE`, cujo 409 não vira toast: vira o segundo modal, com a mensagem de
`cardConflictMessage(err)`.

## Testes

**`api-financial`** — casos que precisam existir:

- `POST` cria com `ownerMemberId` resolvido pelo nome; `'shared'` grava `null`;
- `POST` rejeita cor inválida, `last4` com 3 dígitos, dia 0 e dia 32;
- `PATCH` com corpo vazio → 400;
- `PATCH` em id inexistente → 404;
- `DELETE` em cartão zerado → 204;
- `DELETE` em cartão com lançamento → 409 **com a contagem certa**;
- `DELETE` em cartão só com fatura fechada → 409 (o caso que passa despercebido se só se testar
  lançamento);
- `archive` grava e limpa `archivedAt`;
- `GET /cards` devolve `archived` em todos.

**`ui-financial`**:

- mapper: `cardToCreateWire` não manda `id`; `wireToCard` carrega `archived` — a constraint do
  umbrella §1b vale aqui: mapper que descarta campo é bug, e já houve três ocorrências;
- api service: as quatro chamadas com verbo e URL certos;
- `cardConflictMessage`: plural, singular, parte zerada, e não-409;
- drawer: preenche a partir do cartão, Salvar desabilitado enquanto `pristine`, salva com o id
  original, e o modo criação chama `createCard`;
- settings: o fluxo de dois passos — confirma, recebe 409, abre o segundo modal, arquiva;
- `activeCards` esconde arquivado, e `cardBy` continua resolvendo o arquivado.

**Gate:** `npx nx test`, `lint` e `build` nos dois projetos, mais
`npx tsc -p apps/ui-financial/tsconfig.spec.json --noEmit` — a fatia anterior mostrou que ele
pega erro real que a suíte verde esconde.

## Fora de escopo

- Migrar parcelas futuras e recorrência (Fatia 3).
- Materializar o cronograma de parcelas (Fatia 2).
- Módulo de membros: o titular continua sendo o trio fixo `Mateus | Thais | shared`, resolvido
  por nome. Cadastrar pessoas segue fora, como já registrado no umbrella.
- `current` (fatura do ciclo) continua calculado pelo backend a cada `GET /cards`; esta fatia
  não mexe nisso.
