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
- **Geração de slug:** confirmar no plano de onde vem o `slug` ao criar (input do usuário vs.
  slugify do label). O `CreateCategoryDto` exige `slug` explícito — a UI precisa fornecê-lo.
- Budgets já é real; o valor desta fatia é sobretudo o create + verificação.
