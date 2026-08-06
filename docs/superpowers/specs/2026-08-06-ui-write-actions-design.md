# Spec — Ações de escrita na UI (`ui-financial`)

**Data:** 2026-08-06
**Projeto 3 de 3** do pedido "responsivo + sem mocks + API completa".
**Branch:** `feat/upgrading-the-system` (commits diretos na branch atual, sem PR).
**Depende de:** Projeto 2 (`2026-08-06-api-write-endpoints-design.md`), já entregue.

---

## 1. Contexto e escopo

Os sete endpoints de escrita existem e foram verificados de ponta a ponta. Falta a UI usá-los.

O levantamento mudou a lista herdada do umbrella: **"Aporte extra" não precisa de nada novo no
backend nem na camada de dados**. A contribuição já está inteiramente ligada
(`AppDataService:324`), pelo chip "Aporte" do `expense-drawer`. O botão do card de meta só
precisa abrir aquele drawer com a meta pré-selecionada.

| # | Stub | Onde | O que falta |
|---|---|---|---|
| 1 | Aporte extra | `features/goals/goal-card.component.html` | abrir o drawer existente |
| 2 | Marcar como conferido | `features/tx-detail-drawer` | `PATCH` de um campo |
| 3 | Remover gasto fixo | `features/fixed` | **o botão não existe** — criar + confirmação |
| 4 | Reordenar categorias | `features/settings` | setas + `PATCH` em lote |
| 5 | Editar meta | `features/goals/goal-card.component.html` | formulário |
| 6 | Editar orçamento | `features/settings` | formulário |
| 7 | Editar transação | `features/tx-detail-drawer` | formulário |
| 8 | Editar gasto fixo | `features/fixed` | **o botão não existe** — criar + formulário |

Os itens 3 e 8 são os únicos sem stub `disabled` na tela: em Gastos fixos não há botão algum
hoje. Os dois precisam ser criados, na tabela do desktop **e** no card do celular — a tela tem
os dois ramos desde o Projeto 1.

### Fora de escopo

- **"Convidar pessoa"** — exige o módulo de membros, que não existe no backend.
- **"Boleto" / "Pagar agora"** — integração de pagamento.
- **Os botões `Importar` e `Exportar`**, que renderizam sem `(click)` e sem `disabled`. Não é
  falta de API: é decisão de produto entre implementar e remover. Continuam registrados.

---

## 2. Camada de dados

Estende o que já existe, seguindo a convenção do umbrella §2.2 — nada de estrutura nova.

| Arquivo | O que ganha |
|---|---|
| `core/api/wire.types.ts` | tipos de `PATCH` por recurso |
| `core/api/<recurso>-api.service.ts` | `update()`, `remove()`, `reorder()` |
| `core/api/<recurso>.mapper.ts` | `<recurso>ToUpdateWire()` |
| `layout/app-data.service.ts` | fachada: `updateGoal`, `updateCategory`, `reorderCategories`, `updateTransaction`, `updateFixed`, `removeFixed` |

Os métodos da fachada seguem o padrão atual sem desvio: `subscribe`, recarrega o recurso no
sucesso, `fail(mensagem, errorSignal)` no erro — que já seta o error-signal e dispara toast
`neg`.

### 2.1 Dois campos novos em `shared-types`

```ts
// Transaction
reviewed: boolean;
// Category
order: number;
```

Os mappers de leitura passam a lê-los. **Com teste.** O umbrella §1b registra que o defeito
mais repetido da migração anterior foi o mapper descartar campo que o wire trazia — três
ocorrências. Descartar campo é decisão, não default.

Atenção aos nomes: o domínio usa `cat`/`due`/`type: 'sonho'` e o wire usa
`categorySlug`/`dueDay`/`type: 'SONHO'`. A conversão é responsabilidade do mapper, como já é
na leitura.

### 2.2 Dívida registrada, não paga agora

`app-data.service.ts` está em 327 linhas e passa de 400 com esta fatia. Continua sendo uma
fachada coesa de signals. Se crescer além disso, vale quebrar por recurso
(`transactions-store`, `catalog-store`, …). **Não faço nesta fatia** — seria refactor não
pedido no meio de uma entrega.

---

## 3. Os formulários de edição

Um componente por recurso, em `features/<recurso>/<recurso>-edit-drawer.component.*`:

| Drawer | Campos editáveis |
|---|---|
| `goal-edit-drawer` | `label`, `target`, `monthly`, `color`, `subtitle`, `type` |
| `category-edit-drawer` | `label`, `color`, `budget` |
| `fixed-edit-drawer` | `label`, `value`, `dueDay`, categoria, titular |

### 3.1 Transação é a exceção: modo edição no `expense-drawer`

Os campos editáveis de uma transação **já são** os do `expense-drawer` (data, descrição, valor,
categoria, método, titular, nota). Criar um quinto drawer duplicaria aquele formulário inteiro
e obrigaria a manter os dois em sincronia para sempre.

O `expense-drawer` ganha um `input()` opcional:

- **vazio** → criar, exatamente o comportamento de hoje;
- **preenchido** → editar, com os campos populados e `PATCH` no salvar.

**Parcelamento fica somente-leitura no modo edição**, porque o `PATCH /transactions/:id` não
aceita alterá-lo (decisão do Projeto 2: parcelas vivem em `InstallmentPlan`/`Installment` e são
fatia própria). O chip de tipo (gasto/receita/aporte) também fica travado: mudar o tipo de um
lançamento existente é outra operação.

### 3.2 Responsividade herdada

Os quatro drawers herdam o comportamento do Projeto 1 sem trabalho extra: tela cheia abaixo de
768px, painel lateral acima. Os drawers novos precisam do mesmo par de regras
(`@use 'responsive' as r`) que `expense-drawer` e `tx-detail-drawer` já têm.

---

## 4. Conferido

O campo `reviewed` aparece em três lugares. **O botão sozinho não bastaria**: marcar como
conferido sem nada mudar fora do drawer deixaria o recurso pela metade.

1. **Botão do drawer com estado.** "Marcar como conferido" quando `false`, "Conferido" (com
   check) quando `true`. Clicar alterna, via `PATCH { reviewed }`.
2. **Indicador na lista.** Um sinal discreto na linha da tabela (desktop) e como etiqueta no
   card (celular).
3. **Filtro "Só não conferidos".** Um chip na faixa de filtros de Transações, ao lado dos de
   categoria. **Client-side**, como os demais filtros — o umbrella §2.6 registra a decisão
   consciente de não migrar filtro para query param sem necessidade de performance.

---

## 5. Reordenação de categorias

Duas setas por linha em Configurações → Categorias.

- Cada toque reordena a lista local e envia a **lista completa** de slugs para
  `PATCH /categories/order`. O endpoint rejeita lista parcial com 400, então mandar tudo não é
  desperdício: é o contrato.
- A primeira linha não tem "subir"; a última não tem "descer".
- Alvos de toque de 44px, como o resto do mobile.
- A resposta traz a lista já ordenada; a UI usa **a resposta**, não o estado otimista, para não
  divergir do servidor se duas abas reordenarem.

Setas em vez de arrastar: funciona igual em celular e desktop, é acessível por teclado e leitor
de tela, e não acrescenta o Angular CDK como dependência. Arrastar no celular competiria com o
scroll da página.

---

## 6. Erros

O backend responde três casos que a UI não pode engolir num "Falha ao salvar" genérico.

| Caso | Tratamento na UI |
|---|---|
| **409** ao excluir categoria | O corpo traz `{ transactions, fixedExpenses }`. Toast com a contagem: *"Não dá para excluir: 5 lançamentos e 4 gastos fixos usam esta categoria."* |
| **404** ao editar | Item removido em outra aba. Toast, como qualquer outro erro de escrita. |
| **400** de corpo vazio | Não deve acontecer: Salvar só habilita com o formulário sujo (`form.dirty`). |

Exclusões (gasto fixo e categoria) passam pelo `cf-confirm-modal` existente, com `danger` — que
já tem `title`, `description`, `confirmLabel`, `cancelLabel`, `confirmed`, `cancelled`.

O 409 é o caso que mais importa: a API foi desenhada para entregar a contagem justamente para
a UI poder explicar. Desperdiçá-la anularia a decisão do Projeto 2.

**O 404 não recebe tratamento especial.** Uma versão anterior desta spec prometia recarregar a
lista nesse caso. Recuei: exigiria inspecionar o status em cada um dos seis métodos de escrita
da fachada, que hoje têm uma linha de erro cada, para cobrir um cenário que só ocorre com duas
abas abertas na mesma conta. O toast informa, e a próxima navegação recarrega. Se o caso se
mostrar real no uso, vira fatia própria.

---

## 7. Testes e verificação

- **API service:** um teste por método novo, com `HttpTestingController` — verifica verbo, URL
  e corpo.
- **Mapper:** um teste por conversão nova, incluindo `reviewed` e `order` na leitura.
- **Drawer:** para cada um — popula do input, emite o `PATCH` esperado, e Salvar fica
  desabilitado enquanto o formulário não está sujo.
- **409:** teste de que a contagem vira a mensagem certa.
- **Reordenação:** teste de que a lista enviada é a completa e de que a UI adota a resposta.
- **Gate:** `nx test ui-financial`, `nx lint ui-financial` e **`nx build ui-financial`**. O
  umbrella §6 registra que o Jest da UI não faz type-check estrito de template e que só o
  build pega esses erros — aconteceu de novo no Projeto 1.
- **Smoke visual** no Chrome em 375 e 1280, percorrendo cada fluxo de edição.

---

## 8. Riscos

| Risco | Mitigação |
|---|---|
| Modo edição quebrar a criação no `expense-drawer` | O input vazio é o caminho atual; testes cobrem os dois modos no mesmo componente |
| Mapper descartar `reviewed`/`order` | Teste por campo, pelo padrão do umbrella §1b |
| Reordenação divergir entre abas | A UI adota a lista da resposta, não o estado otimista |
| 409 virar toast genérico | Teste específico da tradução da contagem |
| `app-data.service.ts` crescendo demais | Registrado em §2.2; quebra fica para uma fatia própria |
| Recarregar a lista inteira após cada `PATCH` | Aceito: é o padrão vigente da fachada e a base é pequena. Mudar para atualização pontual seria otimização sem medida |

---

## 9. O que fecha com esta fatia

Os **oito itens da §1** ligados — os sete que dependiam dos endpoints do Projeto 2, mais o
"Aporte extra", que só precisava de plumbing de UI.

Depois desta fatia, o que resta em `ui-financial` sem função é:

- **"Convidar pessoa"** — depende do módulo de membros (fora de escopo).
- **"Boleto" / "Pagar agora"** — dependem de integração de pagamento (fora de escopo).
- **"Importar" e "Exportar"** — decisão de produto pendente: implementar ou remover.
