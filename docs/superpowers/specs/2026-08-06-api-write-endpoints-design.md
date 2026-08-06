# Spec — Endpoints de escrita (`api-financial`)

**Data:** 2026-08-06
**Projeto 2 de 3** do pedido "responsivo + sem mocks + API completa".
**Branch:** `feat/upgrading-the-system` (commits diretos na branch atual, sem PR).
**Depende de:** nada. **Habilita:** Projeto 3 (ligar os stubs `disabled` da UI).

---

## 1. Contexto e problema

Fora de `DELETE /transactions/:id`, **o projeto não tem nenhum `PATCH` nem `DELETE`**. Os
botões `disabled` da UI marcam exatamente onde falta — o umbrella
(`2026-07-11-api-front-migration-umbrella.md`, §4) já os lista.

Esta fatia entrega **só o backend**. Nenhum arquivo de `ui-financial` é tocado; ligar os
botões é o Projeto 3.

### Fora de escopo, por decisão do usuário

- **Parcelamento no `PATCH` de transação.** Parcelas vivem em `InstallmentPlan`/`Installment`,
  com status por parcela e vínculo com faturas fechadas. É uma fatia própria, bem maior.
- **Módulo de membros** ("Convidar pessoa") — envolve criar usuário no Keycloak.
- **Integração de pagamento** ("Boleto", "Pagar agora").
- **Os botões `Importar` e `Exportar`**, que renderizam sem `(click)` e sem `disabled`. Não são
  falta de endpoint, são decisão de produto: implementar ou remover.

---

## 2. Superfície da API

Sete endpoints, na arquitetura hexagonal já usada (`interface` → `application` → `domain` →
`infrastructure`).

| Recurso | Endpoint | Papéis |
|---|---|---|
| Metas | `PATCH /goals/:slug` | `admin`, `editor` |
| Categorias | `PATCH /categories/:slug` | `admin`, `editor` |
| Categorias | `DELETE /categories/:slug` | `admin`, `editor` |
| Categorias | `PATCH /categories/order` | `admin`, `editor` |
| Transações | `PATCH /transactions/:id` | `admin`, `editor` |
| Gastos fixos | `PATCH /fixed-expenses/:id` | `admin`, `editor` |
| Gastos fixos | `DELETE /fixed-expenses/:id` | `admin`, `editor` |

`admin`+`editor` em tudo segue o padrão já existente — inclusive o `DELETE /transactions/:id`
atual. Ações `admin`-only continuam sendo apenas fechar mês e fechar fatura.

### 2.1 Ordem de rota importa

`PATCH /categories/order` precisa ser **declarado antes** de `PATCH /categories/:slug` no
controller. Declarado depois, o Nest casa `order` como se fosse um `:slug`.

---

## 3. Campos editáveis

**A identidade não é editável.** O `slug` de meta e categoria é a chave de URL e a referência
que transações e gastos fixos usam. `PATCH` altera `label`, nunca `slug`. Renomear a
identidade seria outra operação, com migração de referências.

| Recurso | Campos aceitos no `PATCH` |
|---|---|
| Goal | `label`, `target`, `monthly`, `color`, `subtitle`, `type` |
| Category | `label`, `color`, `budget` |
| Transaction | `date`, `label`, `value`, `categorySlug`, `holder`, `method`, `cardId`, `note`, `reviewed` |
| FixedExpense | `label`, `value`, `dueDay`, `categorySlug`, `holder` |

### 3.1 Semântica do PATCH

- Atualização **parcial**: todos os campos do DTO são opcionais.
- Um corpo **sem nenhum campo reconhecido responde 400**. Sem essa guarda, um nome de campo
  digitado errado no cliente vira no-op silencioso com 200 — o pior modo de falha possível.
- `holder` segue a convenção transversal do umbrella (§2.1): o wire usa **nome**, nunca
  `memberId`; `'shared'` resolve para `memberId: undefined`.
- `categorySlug` resolve para `categoryId` na escrita, como no `create`.

### 3.2 O que as respostas devolvem

- `PATCH` responde **200** com a **entidade atualizada**, no mesmo formato de wire que o `GET`
  do recurso. A UI usa o retorno para atualizar o signal sem precisar de um `GET` extra.
- `DELETE` responde **204**, sem corpo — como o `DELETE /transactions/:id` já faz.
- `PATCH /categories/order` responde **200** com a lista completa de categorias na nova ordem,
  pelo mesmo motivo: a tela reordena a partir da resposta.

### 3.3 Reordenação é em lote

`PATCH /categories/order` recebe `{ slugs: string[] }` com a ordenação **completa**.

Arrastar uma categoria muda a posição de várias. N chamadas `PATCH` deixariam a lista
inconsistente se uma falhasse no meio. O endpoint aplica tudo numa transação Prisma e
**responde 400 se a lista não for exatamente o conjunto de slugs do household** — nem faltando
nem sobrando. Isso impede gravar uma ordem parcial.

---

## 4. Migrações

Duas colunas novas em `schema.prisma`:

```prisma
model Category {
  order Int @default(0)
}

model Transaction {
  reviewed Boolean @default(false)
}
```

- **`Category.order`** — backfill pela ordem de exibição atual, que é `label` ascendente
  (`category.prisma.repository.ts:15`). Depois do backfill, `findAll` passa a ordenar por
  `order` ascendente, com `label` como desempate.
- **`Transaction.reviewed`** — habilita "Marcar como conferido" pelo mesmo `PATCH`.

### 4.1 As duas precisam chegar ao wire

`CategoryView` ganha `order` e `TransactionView` ganha `reviewed`, **explicitamente**, cada uma
com teste de mapper.

O umbrella (§1b) registra que o defeito mais recorrente da migração anterior foi exatamente
este: o wire trazia o dado, o **mapper descartava**, e a tela inventava um substituto —
aconteceu 3 vezes. **Descartar campo no mapper é decisão, não default.**

---

## 5. Erros

| Situação | Resposta |
|---|---|
| `PATCH`/`DELETE` com id ou slug inexistente | **404** |
| `DELETE /categories/:slug` com vínculo | **409**, corpo `{ transactions: number, fixedExpenses: number }` |
| `PATCH` com corpo sem campo reconhecido | **400** |
| `PATCH /categories/order` com lista que não bate | **400** |

### 5.1 Exclusão de categoria: bloquear

`Category.id` é FK **obrigatória** em `Transaction` e `FixedExpense`. Excluir uma categoria em
uso ou falharia na FK, ou exigiria alterar lançamentos históricos.

Bloquear com 409 e devolver a contagem deixa a UI explicar o motivo ("3 lançamentos e 1 gasto
fixo usam esta categoria"). Reatribuir para uma categoria coringa foi descartado: mudaria
relatórios de meses já fechados de forma retroativa e silenciosa.

### 5.2 Exclusão de gasto fixo: desvincular

`Transaction.fixedExpenseId` é FK **opcional**. O `DELETE` zera o vínculo dos lançamentos já
gerados e então exclui o gasto fixo, numa transação Prisma.

O histórico de pagamentos permanece intacto — os lançamentos só deixam de estar marcados como
"fixo". Excluí-los junto apagaria gasto real e mudaria os relatórios dos meses passados.

### 5.3 Correção de rota: `DELETE /transactions/:id`

Hoje usa `deleteMany`, que responde 204 mesmo quando o id não existe — o cliente não distingue
"excluí" de "não existia". Como a família inteira de endpoints está sendo construída agora,
este é alinhado para **404**, junto com os novos.

É mudança de comportamento num endpoint existente, feita de propósito e com o usuário
ciente.

---

## 6. Escopo de household

**Toda** query nova é escopada por `householdId`, como as existentes (`this.scoped()` nos
repositórios Prisma).

Esta é a falha mais séria possível nesta fatia: sem o escopo, um household consegue alterar ou
excluir dado de outro só passando um id. Os endpoints novos recebem id/slug direto da URL, o
que torna o descuido fácil — por isso cada repositório novo tem **teste explícito** de que um
id de outro household resulta em 404, não em escrita.

---

## 7. Testes

Padrão do repositório: spec por use case, spec por mapper, spec por repositório Prisma.

Casos de fronteira que importam mais que o caminho feliz:

1. `DELETE /categories/:slug` com 1 transação vinculada → 409 com a contagem certa.
2. `DELETE /categories/:slug` sem vínculo → exclui.
3. `DELETE /fixed-expenses/:id` → lançamentos sobrevivem com `fixedExpenseId` nulo.
4. `PATCH` de id/slug de **outro household** → 404, sem escrita.
5. `PATCH` com corpo vazio → 400.
6. `PATCH /categories/order` com lista faltando um slug → 400, ordem inalterada.
7. Mapper de categoria emite `order`; mapper de transação emite `reviewed`.
8. `DELETE /transactions/:id` inexistente → 404 (comportamento novo).

`npx nx test api-financial` e `npx nx build api-financial` são o gate.

---

## 8. Riscos

| Risco | Mitigação |
|---|---|
| Rota `order` capturada por `:slug` | Declarar `order` antes de `:slug` no controller; teste cobrindo |
| Migração de `order` rodar em base com dados | Backfill por `label` asc na própria migration, replicando a ordenação atual |
| Escopo de household esquecido numa query nova | Teste explícito de cross-household por recurso (§6) |
| `PATCH` de `categorySlug` para slug inexistente | Resolve slug→id antes de escrever; slug desconhecido → 400 |
| Alinhar o `DELETE` de transação muda o que o front faz | Verificado: `TransactionApiService.remove` devolve `Observable<void>` e `AppDataService.removeTransaction` recarrega a lista no sucesso. Com 404 o ramo de erro passa a disparar o toast "Falha ao remover transação" — só alcançável excluindo um id já removido. É o comportamento correto, mas **é** mudança visível |

---

## 9. O que este projeto deixa pronto para o Projeto 3

Com estes sete endpoints, sete dos oito stubs `disabled` da UI passam a ter contrapartida:

| Stub | Endpoint |
|---|---|
| Editar meta / aportar pelo card | `PATCH /goals/:slug` |
| Editar orçamento | `PATCH /categories/:slug` |
| Reordenar categorias | `PATCH /categories/order` |
| Editar transação | `PATCH /transactions/:id` |
| Marcar como conferido | `PATCH /transactions/:id` (`reviewed`) |
| Editar gasto fixo | `PATCH /fixed-expenses/:id` |
| Remover gasto fixo | `DELETE /fixed-expenses/:id` |

O oitavo ("Convidar pessoa") continua fora de escopo.
