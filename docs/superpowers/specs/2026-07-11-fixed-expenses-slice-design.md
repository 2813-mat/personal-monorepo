# Fatia 2 — Fixed expenses (conectar API ↔ front)

**Data:** 2026-07-11
**Umbrella:** `2026-07-11-api-front-migration-umbrella.md`
**Template:** fatia de Incomes (`2026-07-11-incomes-slice-design.md`)

---

## 1. Objetivo e escopo

Conectar o recurso **Fixed expenses** API↔front.

**No escopo:**
- **Ler:** `fixed` deixa de ser mock; vem de `GET /fixed-expenses?year&month`, carregado **por
  mês** (o `paidThisMonth` depende do mês corrente). Alimenta a tela `fixed`, Budgets e
  Dashboard.
- **Criar:** ligar a criação de gasto fixo pelo drawer (despesa com `recurring`/gasto fixo) a
  `POST /fixed-expenses`.
- **Alinhar contrato:** `memberId → holder` (mesmo padrão de tx/income) e **expor
  `paidThisMonth`**.

**Fora de escopo:** editar/remover gasto fixo; marcar como pago manualmente (o `paidThisMonth`
é derivado de existir transação com aquele `fixedExpenseId` no mês).

## 2. Decisões
- **D1 — paidThisMonth exposto:** `FixedExpense` do shared-types ganha `paidThisMonth: boolean`;
  a tela mostra status pago/pendente.
- **D2 — dimensão mensal:** `loadFixed()` reage a `currentMonth()` (como transactions), pois
  `paidThisMonth` é relativo ao mês.
- **D3 — holder:** alinhamento idêntico a Income (view inclui `member`, emite nome;
  `create` resolve `holder → memberId`).

## 3. Backend (`api-financial`)

Módulo `budgeting/fixed-expense/`. Wire resultante:
`{ id, label, value, dueDay, categorySlug, holder, paidThisMonth }`.

- **`domain/fixed-expense.repository.ts`**: em `FixedExpenseView`, trocar `memberId: string | null`
  por `holder: string`; em `CreateFixedExpenseData`, trocar `memberId?` por `holder: string`.
- **`infrastructure/fixed-expense.mapper.ts`**: `FixedExpenseRow` passa a incluir `member`
  (`Prisma.FixedExpenseGetPayload<{ include: { category: true; member: true } }>`); `toView`
  emite `holder = r.member?.name ?? 'shared'` (remove `memberId`).
- **`infrastructure/fixed-expense.prisma.repository.ts`**:
  - `findAllWithStatus`: `include: { category: true, member: true }`.
  - `create`: resolver `holder → memberId` por nome quando `holder !== 'shared'`
    (`member.findFirst({ where: { householdId, name: holder } })`), incluir `member` no retorno.
- **`interface/dto/create-fixed-expense.dto.ts`**: substituir `@IsOptional() @IsString() memberId?`
  por `@IsString() holder!: string`.
- **Testes:** ajustar specs de mapper/usecase/repo que citam `memberId`; cobrir
  `member.name → holder` e `null → 'shared'`.

## 4. Shared-types

`libs/shared-types/src/lib/finance.types.ts` — `FixedExpense` ganha:
```ts
paidThisMonth: boolean;
```
(campos existentes: `id, label, value, due, cat, holder`).

## 5. UI (`ui-financial`)

- **`core/api/wire.types.ts`**: `FixedExpenseWire { id, label, value, dueDay, categorySlug,
  holder, paidThisMonth }` e `CreateFixedExpenseWire { label, value, dueDay, categorySlug, holder }`.
- **`core/api/fixed-api.service.ts`** (novo): `list(params: { year, month }): Observable<FixedExpenseWire[]>`
  (query `year`/`month`) e `create(body): Observable<FixedExpenseWire>`.
- **`core/api/fixed.mapper.ts`** (novo): `wireToFixed(w)` (`due=dueDay`, `cat=categorySlug`,
  `holder as Holder`, `paidThisMonth`) e `fixedToCreateWire(f)`.
- **`layout/app-data.service.ts`**: `fixed` vira `signal<FixedExpense[]>([])`; `loadFixed()`
  (usa `currentMonth()`), `createFixed()`; signals `fixedLoading`/`fixedError`.
- **`layout/app-shell.component.ts`**: incluir `loadFixed()` no `effect` que reage a auth **e**
  `currentMonth()` (junto de `loadTransactions`).
- **Componentes:** `features/fixed` lê real (já usa `data.fixed()` para totais/listagem);
  exibir `paidThisMonth`. Criação de gasto fixo: reaproveitar o drawer (despesa recorrente)
  roteando para `createFixed` quando aplicável — **decisão aberta**: manter o gasto fixo como
  um `FixedExpense` dedicado (recomendado) vs. tratar `recurring` só como flag de transação.
  Resolver no plano da fatia observando o fluxo real do drawer.

## 6. Testes e gate
- Backend: mapper (`holder`/`shared`), usecase/repo (`holder`, `paidThisMonth`).
- UI: `fixed.mapper.spec`, `fixed-api.service.spec` (query params + POST), `app-data.service.spec`
  (`loadFixed` por mês; `createFixed` recarrega).
- `nx build` das duas apps + smoke: login → ver fixos do mês com status → criar → conferir.

## 7. Riscos
- **Fluxo de criação no drawer** (decisão aberta em §5) é o ponto de maior incerteza — validar
  no plano.
- `due`/`cat` já são 1:1; o único mapeamento não-trivial é `holder` e `paidThisMonth`.
