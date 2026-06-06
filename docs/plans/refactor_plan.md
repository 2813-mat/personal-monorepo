# Refactor: separar template e estilos por componente — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Mover o template e o CSS inline de cada componente do `ui-financial` para arquivos `.html`/`.scss` próprios, sem mudar nenhum comportamento.

**Architecture:** Refator puramente mecânico. Cada `@Component` troca `template`/`styles` inline por `templateUrl`/`styleUrl`, com o conteúdo movido verbatim para arquivos irmãos. Os dois subcomponentes privados (`ReportChartComponent`, `GoalCardComponent`) são extraídos para arquivos próprios. Execução em lotes por área (arquivos disjuntos), com `nx build` (AOT) como gate de verificação ao fim de cada lote.

**Tech Stack:** Angular 21 (standalone + signals), Nx monorepo, SCSS. Sem testes unitários no projeto — a verificação é o build AOT (que type-checa os templates externos).

---

## Decisões (do brainstorming)

- **Alcance:** todos os componentes (consistência total), inclusive os atoms de `ui/`.
- **O que separar:** `template` → `<nome>.component.html`; `styles` → `<nome>.component.scss`. Componentes **sem** `styles` não ganham `.scss`.
- **Subcomponentes:** extraídos para arquivos próprios (um componente por arquivo).
- **Sem mudança de comportamento:** nenhuma alteração em lógica, rotas, DI, inputs/outputs ou seletores.
- **Naming:** mantém o padrão atual (`x.component.ts/html/scss`); o root continua `app.ts` → `app.html`.
- **`styleUrl` singular** (Angular ≥17; o projeto é 21).

## Pré-condições

- Árvore de trabalho limpa antes de começar (`git status` vazio).
- Commit por lote (5 commits no total). Trunk-based, em `master`, como o resto do repo — ou criar branch se preferir.

---

## Transform Recipe (aplicar a cada componente)

Para um arquivo `<dir>/<nome>.component.ts`:

1. Localizar o decorator `@Component({ ... })`.
2. Se existir `` template: `...` ``:
   - Criar `<dir>/<nome>.component.html` com **o conteúdo entre as crases, verbatim** (sem reescrever nada; templates Angular usam `{{ }}`/`@if`/`@for`, não interpolação JS, então não há `${}` para escapar).
   - No decorator, trocar o bloco `` template: `...`, `` por `templateUrl: './<nome>.component.html',`.
3. Se existir `` styles: [`...`] ``:
   - Criar `<dir>/<nome>.component.scss` com **o conteúdo CSS verbatim**.
   - No decorator, trocar `` styles: [`...`], `` por `styleUrl: './<nome>.component.scss',`.
   - **Se não houver `styles`, não criar `.scss` nem adicionar `styleUrl`.**
4. Não mexer em imports, corpo da classe, nem nas demais chaves do decorator (`selector`, `standalone`, `imports`, `host`, etc.).

**Exemplo concreto — `progress-bar.component.ts` (tem template + styles):**

Antes:
```ts
@Component({
  selector: 'cf-progress-bar',
  standalone: true,
  template: `
    <div class="pbar" [style.height.px]="height()">...</div>
  `,
  styles: [`
    .pbar { width: 100%; background: var(--line-soft); ... }
  `],
})
export class ProgressBarComponent { /* inalterado */ }
```

Depois (`progress-bar.component.ts`):
```ts
@Component({
  selector: 'cf-progress-bar',
  standalone: true,
  templateUrl: './progress-bar.component.html',
  styleUrl: './progress-bar.component.scss',
})
export class ProgressBarComponent { /* inalterado */ }
```
+ `progress-bar.component.html` (texto do template) + `progress-bar.component.scss` (texto dos estilos).

**Exemplo sem styles — `donut.component.ts` (só template):** cria apenas `donut.component.html` e usa só `templateUrl`. Não criar `.scss`.

---

## Verificação (gate ao fim de cada lote)

- [x] Rodar: `npx nx build ui-financial`
- Esperado: `Successfully ran target build for project ui-financial`.
- Conferir que os chunks lazy continuam presentes (`dashboard-component`, `transactions-component`, `reports-component`, `cards-component`, `settings-component`, `goals-component`, `fixed-component`, `budgets-component`, `invoice-component`).
- Warnings **pré-existentes** continuam e NÃO contam como regressão: `NG8107` em `cards.component.ts`; budgets de estilo (4 kB) em vários componentes. Qualquer **erro** novo, ou chunk/feature sumindo, é regressão → corrigir antes do commit.

---

## File Structure

| Lote | Área | Componentes |
|------|------|-------------|
| A | `ui/` | 13 |
| B | `layout/` + root | 4 |
| C | `features/` simples | 8 |
| D | `features/` reports + goals (com extração) | 2 (+2 extraídos, +1 utils) |
| E | `features/dashboard/` | 4 |

Não tocar: `app-data.service.ts`, `ui/toast/toast.service.ts` (sem template), `ui/index.ts` (barrel — os caminhos de import não mudam), `app.routes.ts`, `app.config.ts`.

---

## Task A: `ui/` (atoms + UI states)

**Files (aplicar Transform Recipe a cada um):**
- `ui/avatar/avatar.component.ts`
- `ui/cat-dot/cat-dot.component.ts`
- `ui/card-chip/card-chip.component.ts`
- `ui/icon/icon.component.ts`
- `ui/progress-bar/progress-bar.component.ts`
- `ui/sparkbars/sparkbars.component.ts`
- `ui/donut/donut.component.ts`
- `ui/money/money.component.ts`
- `ui/skeleton/skeleton.component.ts`
- `ui/empty-state/empty-state.component.ts`
- `ui/confirm-modal/confirm-modal.component.ts`
- `ui/success-modal/success-modal.component.ts`
- `ui/toast/toast-container.component.ts`

- [x] **Passo 1:** Para cada arquivo acima, aplicar o **Transform Recipe**. Atenção aos que **não têm `styles`** (ex.: `donut`, e quaisquer outros só com template) — esses ganham apenas `.html`.
- [x] **Passo 2:** Verificação — `npx nx build ui-financial` → build verde, sem erros novos.
- [x] **Passo 3:** Commit
```bash
git add apps/ui-financial/src/app/ui
git commit -m "refactor(ui-financial): externalize ui component templates and styles"
```

---

## Task B: `layout/` + root

**Files:**
- `layout/topbar.component.ts` (template + styles)
- `layout/sidebar.component.ts` (template + styles)
- `layout/app-shell.component.ts` (template + styles)
- `app.ts` (root): template `'<router-outlet />'`, **sem** styles → criar `app.html` e usar `templateUrl: './app.html'`. Sem `.scss`.

- [x] **Passo 1:** Aplicar Transform Recipe aos 3 de `layout/`.
- [x] **Passo 2:** No `app.ts`, mover o template de uma linha para `apps/ui-financial/src/app/app.html` e trocar para `templateUrl: './app.html'`. (Caso de borda trivial; incluído por causa da decisão "consistência total".)
- [x] **Passo 3:** Verificação — `npx nx build ui-financial` → build verde.
- [x] **Passo 4:** Commit
```bash
git add apps/ui-financial/src/app/layout apps/ui-financial/src/app/app.ts apps/ui-financial/src/app/app.html
git commit -m "refactor(ui-financial): externalize layout and root templates/styles"
```

---

## Task C: `features/` simples (1 classe por arquivo)

**Files (aplicar Transform Recipe — todos têm template + styles):**
- `features/cards/cards.component.ts`
- `features/budgets/budgets.component.ts`
- `features/fixed/fixed.component.ts`
- `features/settings/settings.component.ts`
- `features/invoice/invoice.component.ts`
- `features/expense-drawer/expense-drawer.component.ts`
- `features/tx-detail-drawer/tx-detail-drawer.component.ts`
- `features/transactions/transactions.component.ts` (o `<ng-template #txRow>` faz parte do template e vai verbatim para o `.html`)

- [x] **Passo 1:** Aplicar Transform Recipe a cada arquivo acima.
- [x] **Passo 2:** Verificação — `npx nx build ui-financial` → build verde; conferir chunks `cards/budgets/fixed/settings/invoice/transactions`.
- [x] **Passo 3:** Commit
```bash
git add apps/ui-financial/src/app/features/cards apps/ui-financial/src/app/features/budgets apps/ui-financial/src/app/features/fixed apps/ui-financial/src/app/features/settings apps/ui-financial/src/app/features/invoice apps/ui-financial/src/app/features/expense-drawer apps/ui-financial/src/app/features/tx-detail-drawer apps/ui-financial/src/app/features/transactions
git commit -m "refactor(ui-financial): externalize feature screen templates/styles"
```

---

## Task D: `features/reports` e `features/goals` (com extração de subcomponente)

Estes dois arquivos têm 2 classes cada. Extrair o subcomponente para arquivo próprio evita ciclo de import movendo helpers compartilhados para um arquivo neutro.

### D1 — Reports

**Files:**
- Create: `features/reports/report-chart.component.ts`, `report-chart.component.html`, `report-chart.component.scss`
- Modify: `features/reports/reports.component.ts`
- Create: `features/reports/reports.component.html`, `reports.component.scss`

- [x] **Passo 1:** Criar `report-chart.component.ts` movendo a classe `ReportChartComponent` (com seu decorator) **e** as interfaces `ChartBar` e `ChartModel` (que são o contrato do chart). `export`ar `ChartModel` (e `ChartBar` se quiser). Aplicar o Transform Recipe a esse componente (template → `report-chart.component.html`, styles → `report-chart.component.scss`). Manter `@Input({ required: true }) model!: ChartModel` e os campos `H`/`labelY`.
- [x] **Passo 2:** Em `reports.component.ts`: remover a classe `ReportChartComponent` e as interfaces `ChartBar`/`ChartModel`; adicionar `import { ReportChartComponent, ChartModel } from './report-chart.component';`. Manter `fmtNum` e as interfaces `KpiCard`/`TopCatRow`/`SplitLine`/`HolderBlock` (usadas só por `ReportsComponent`). Aplicar o Transform Recipe à `ReportsComponent` (template → `reports.component.html`, styles → `reports.component.scss`). `ReportChartComponent` continua no array `imports` do decorator.
- [x] **Passo 3:** Verificação — `npx nx build ui-financial` → build verde; chunk `reports-component` presente.

### D2 — Goals

**Files:**
- Create: `features/goals/goal-format.utils.ts` (helpers compartilhados)
- Create: `features/goals/goal-card.component.ts`, `goal-card.component.html`, `goal-card.component.scss`
- Modify: `features/goals/goals.component.ts`
- Create: `features/goals/goals.component.html`, `goals.component.scss`

- [x] **Passo 4:** Criar `goal-format.utils.ts` exportando o helper `fmtShort` e a const `MONTH_ABBR` (movidos de `goals.component.ts`). Isso evita import circular, já que tanto `GoalsComponent` quanto `GoalCardComponent` usam `fmtShort`.
```ts
export const MONTH_ABBR = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

export function fmtShort(v: number): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
```
- [x] **Passo 5:** Criar `goal-card.component.ts` movendo a classe `GoalCardComponent` (com decorator); `import { fmtShort } from './goal-format.utils';`. Aplicar Transform Recipe (template → `goal-card.component.html`, styles → `goal-card.component.scss`).
- [x] **Passo 6:** Em `goals.component.ts`: remover a classe `GoalCardComponent` e as definições locais de `fmtShort`/`MONTH_ABBR`; adicionar `import { GoalCardComponent } from './goal-card.component';` e `import { fmtShort, MONTH_ABBR } from './goal-format.utils';`. Manter o tipo `ProjectionRow`. Aplicar Transform Recipe à `GoalsComponent`. `GoalCardComponent` continua em `imports`.
- [x] **Passo 7:** Verificação — `npx nx build ui-financial` → build verde; chunk `goals-component` presente.
- [x] **Passo 8:** Commit
```bash
git add apps/ui-financial/src/app/features/reports apps/ui-financial/src/app/features/goals
git commit -m "refactor(ui-financial): externalize reports/goals and extract chart/card subcomponents"
```

---

## Task E: `features/dashboard/`

**Files (aplicar Transform Recipe — todos têm template + styles):**
- `features/dashboard/dashboard.component.ts` (container)
- `features/dashboard/dashboard-a.component.ts`
- `features/dashboard/dashboard-b.component.ts`
- `features/dashboard/dashboard-c.component.ts`

- [x] **Passo 1:** Aplicar Transform Recipe aos 4 arquivos.
- [x] **Passo 2:** Verificação — `npx nx build ui-financial` → build verde; chunk `dashboard-component` presente.
- [x] **Passo 3:** Commit
```bash
git add apps/ui-financial/src/app/features/dashboard
git commit -m "refactor(ui-financial): externalize dashboard templates/styles"
```

---

## Definition of Done

- [x] Todo `@Component` do app usa `templateUrl` (+ `styleUrl` quando há estilos); nenhum `template`/`styles` inline restante em `apps/ui-financial/src/app` (exceto serviços, que não têm template).
- [x] `npx nx build ui-financial` verde, com os mesmos warnings pré-existentes e nada de erro novo.
- [x] `ReportChartComponent` e `GoalCardComponent` em arquivos próprios; sem import circular (`goal-format.utils.ts` criado).
- [x] Nenhuma mudança de comportamento: rotas, seletores, inputs/outputs, lógica e DI idênticos.
- [x] (Opcional) Rodar o app e conferir 1–2 telas + um drawer para validação visual.

## Verificação rápida final (grep)

Procurar resíduos inline depois de tudo:
- `template: \`` e `styles: [` dentro de `apps/ui-financial/src/app/**/*.component.ts` devem retornar **zero** ocorrências (fora de serviços).

---

## Notas / riscos

- Risco baixo: conteúdo movido verbatim; o AOT type-check de template externo é equivalente ao inline.
- Único ponto com reestruturação além do recorte: `reports` e `goals` (Task D).
- Caso de borda: `app.ts` (template de 1 linha, sem styles) — incluído por consistência; é o único onde separar tem ganho ~nulo.
- Os 2 warnings de budget de estilo novos (invoice, expense-drawer) e o `NG8107` (cards) são **pré-existentes a este refactor** e permanecem — não tratá-los aqui.
