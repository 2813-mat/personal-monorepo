# Fatia 4 — Categories (writes) + Budgets (conectar API ↔ front)

**Data:** 2026-07-11
**Umbrella:** `2026-07-11-api-front-migration-umbrella.md`
**Template:** fatia de Incomes

---

## 1. Objetivo e escopo

**No escopo:**
- **Criar categoria:** ligar `POST /categories` (criar categoria com orçamento).
- **Budgets real:** a feature `budgets` passa a ler dados reais (já computa gasto-vs-orçamento
  de `categories()` + `transactions()`, ambos já conectados desde Transactions).

**Fora de escopo:**
- **Editar orçamento** (não existe endpoint de update; exigiria `PATCH /categories/:id`).
  Fica para uma fatia futura.
- Remover categoria; reordenar.

A leitura de categorias (`GET /categories`) **já está conectada** (Transactions/Incomes usam
`catBy()`); esta fatia adiciona apenas o **create** e valida que Budgets/Settings leem real.

## 2. Decisões
- **D1 — id = slug:** já mapeado (`wireToCategory`, `id = slug`). Sem mudança de leitura.
- **D2 — create-only:** sem edição de orçamento nesta fatia (decisão do usuário).
- **D3 — sem dimensão de mês:** categorias carregam no login (via `loadCatalog`).
- **D4 — o form não existe, precisa ser construído (2026-07-24):** a spec original dizia
  "ligar o form de nova categoria"; na verdade `settings.component.html:30` tem só um botão
  `+ Nova categoria` **`disabled`** e nenhum formulário. O form é **inline no card de
  Categorias dos Ajustes**, revelado por esse botão (que deixa de ser `disabled`), acima da
  tabela que já lista as categorias.
- **D5 — slug derivado, cor por paleta:** o usuário digita apenas **nome** e **orçamento**.
  - `slug` sai do label via `slugify()` (nova função em `shared-utils`), sem aparecer na UI.
    Colisão com categoria existente vira erro inline — o `id` do `Category` já é o slug, então
    a checagem é contra `data.categories()`.
  - `color` vem de uma paleta fixa de 8 swatches (as cores já usadas nas categorias semeadas),
    o que satisfaz o `@IsHexColor()` do DTO sem input de cor nativo.

## 3. Backend (`api-financial`)

Nenhuma mudança — `POST /categories` já existe (`CreateCategoryDto { slug, label, color, budget }`,
gated por `@Roles('admin','editor')`).

## 4. UI (`ui-financial`)

- **`core/api/wire.types.ts`**: `CreateCategoryWire { slug, label, color, budget }` (o
  `CategoryWire` de leitura já existe).
- **`core/api/catalog-api.service.ts`**: adicionar `createCategory(body: CreateCategoryWire):
  Observable<CategoryWire>` (`POST /categories`).
- **`core/api/catalog.mapper.ts`**: adicionar `categoryToCreateWire(c: Category): CreateCategoryWire`
  — o `slug` deriva do `id` (que já é o slug); `color`/`label`/`budget` 1:1.
- **`layout/app-data.service.ts`**: `createCategory(c: Category)` chama a API e recarrega o
  catálogo (`loadCatalog`) no sucesso; `fail(..., categoriesError)` no erro (adicionar
  `categoriesError` se ainda não existir).
- **Componentes:**
  - `features/settings` (edição/criação de categorias): ligar o form de nova categoria ao
    `createCategory`.
  - `features/budgets`: nenhuma mudança de dados (já lê real); revisar estados de empty/loading.

## 5. Testes e gate
- UI: estender `catalog-api.service.spec` (POST categoria); `catalog.mapper.spec`
  (`categoryToCreateWire`); `app-data.service.spec` (`createCategory` recarrega catálogo).
- `nx build` das duas apps + smoke: login → criar categoria (settings) → aparece em Budgets/
  seletor do drawer.

## 6. Riscos
- ~~**Geração de slug**~~ — resolvido em D5 (slugify do label em `shared-utils`, com checagem
  de duplicata contra `data.categories()`).
- **Cor obrigatória.** O `CreateCategoryDto` exige `@IsHexColor()`; a paleta de D5 garante um
  valor válido, mas o form precisa iniciar com um swatch já selecionado para nunca postar vazio.
- Budgets já é real; o valor desta fatia é sobretudo o create + verificação.
