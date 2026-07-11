# Fatia 3 — Goals (conectar API ↔ front)

**Data:** 2026-07-11
**Umbrella:** `2026-07-11-api-front-migration-umbrella.md`
**Template:** fatia de Incomes

---

## 1. Objetivo e escopo

Conectar o recurso **Goals** API↔front.

**No escopo:**
- **Ler:** `goals` deixa de ser mock; vem de `GET /goals` (carregado no login; sem dimensão de
  mês). Alimenta a tela `goals` e o Dashboard.
- **Aportar:** ligar o tipo **"Aporte"** do `expense-drawer` (hoje stub) a
  `POST /goals/:slug/contributions` (`{ amount, date }`).

**Fora de escopo:** criar/editar/remover metas; histórico detalhado de contribuições além do
`history[]` que o backend já agrega.

## 2. Decisões
- **D1 — id = slug:** o `Goal.id` do shared-types mapeia o `slug` do wire (a UI usa
  `g.id === 'sos'`). O `type` do wire vem em MAIÚSCULO (`SONHO`/`EMERGENCIA`) e é mapeado para
  minúsculo (`sonho`/`emergencia`).
- **D2 — contribuição por slug (mudança de backend):** hoje `addContribution` resolve a meta
  por **cuid** (`scoped({ id: goalId })`), mas a UI só possui o **slug**. Alinhar o backend
  para resolver por **slug** (`scoped({ slug: goalId })`), consistente com a convenção
  `id = slug`.
- **D3 — aporte no drawer:** o aporte usa `value` (→ `amount`) e `date`; a meta-alvo vem de um
  seletor de metas no drawer (novo controle, populado por `data.goals()`).

## 3. Backend (`api-financial`)

Módulo `goals/goal/`. Nenhuma mudança de leitura além do que a UI mapeia. Uma mudança de
escrita:

- **`infrastructure/goal.prisma.repository.ts`** — `addContribution(goalIdOrSlug, data)`:
  resolver a meta por slug: `const goal = await this.prisma.goal.findFirstOrThrow({ where:
  this.scoped({ slug: goalIdOrSlug }) });` e gravar a contribuição com `goalId: goal.id`
  (em vez de usar o parâmetro cru como `goalId`).
- **`interface/goal.controller.ts`**: sem mudança estrutural (`@Post(':id/contributions')`); o
  `:id` agora carrega o slug.
- **Testes:** ajustar o spec do repo/usecase de contribuição para o resolve-por-slug.

Wire de leitura (já produzido por `GoalView`):
`{ id, slug, label, target, monthly, color, subtitle, type: 'SONHO'|'EMERGENCIA', balance, history[] }`.

## 4. UI (`ui-financial`)

- **`core/api/wire.types.ts`**: `GoalWire` (espelha `GoalView`) e
  `CreateContributionWire { amount: number; date: string }`.
- **`core/api/goal-api.service.ts`** (novo): `list(): Observable<GoalWire[]>` (`GET /goals`);
  `addContribution(slug, body): Observable<void>` (`POST /goals/{slug}/contributions`).
- **`core/api/goal.mapper.ts`** (novo): `wireToGoal(w): Goal` — `id = w.slug`,
  `type = w.type.toLowerCase()` (cast para `'sonho' | 'emergencia'`), demais campos 1:1.
- **`layout/app-data.service.ts`**: `goals` vira `signal<Goal[]>([])`; `loadGoals()` (no auth);
  `addContribution(slug: string, amount: number, date: string)` que chama a API e recarrega
  `loadGoals()`; signals `goalsLoading`/`goalsError`.
- **`layout/app-shell.component.ts`**: incluir `loadGoals()` no `effect` de auth (sem mês).
- **`features/expense-drawer`**: no tipo **Aporte**, mostrar um seletor de meta (de
  `data.goals()`); em `save()`, ramo `'contribution'` chama
  `data.addContribution(metaSlug, value, date)`. Ajustar validação: para aporte, `cat`/`método`
  não se aplicam; a meta-alvo é obrigatória.
- **`features/goals`**: passa a ler real (já consome `data.goals()`).

## 5. Testes e gate
- Backend: contribuição resolve por slug (spec do repo).
- UI: `goal.mapper.spec` (slug→id, type minúsculo), `goal-api.service.spec` (GET + POST void),
  `app-data.service.spec` (`loadGoals`; `addContribution` recarrega).
- `nx build` das duas apps + smoke: login → ver metas reais → aporte via drawer → saldo sobe.

## 6. Riscos
- **Seletor de meta no drawer** é UI nova — validar o layout no plano.
- Garantir que o `history[]` (agregado por mês pelo backend) casa com o formato que a tela de
  metas espera (array de 12 números).
