# Fatia 7 — Dashboard e fechamento da migração Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar a migração: tirar o último import de `shared-mocks` do caminho de produção — que era o mês corrente **fixo em maio/2026** —, unificar o formatador de mês, dar tratamento de erro ao `loadCatalog()` e pôr estado de carregando/vazio no Dashboard.

**Architecture:** Nenhum endpoint novo. Entra `month.ts` em `shared-utils` como única fonte de contexto de mês, consumido pelo `AppDataService` (valor inicial), pelo topbar (navegação) e pelo `report.mapper` (rótulo da série). A saída do `shared-mocks` do caminho de produção é travada por regra de lint, não por disciplina.

**Tech Stack:** Nx 22 · Angular 21 standalone + signals · Jest 30 · ESLint com `@nx/enforce-module-boundaries`.

**Spec:** `docs/superpowers/specs/2026-07-11-dashboard-slice-design.md`
**Umbrella:** `docs/superpowers/specs/2026-07-11-api-front-migration-umbrella.md`

## Global Constraints

- **Uma definição de formato de mês.** `short` = `'Mai/26'`; `label` = `'Maio 2026'` — exatamente o que o `CURRENT_MONTH` produzia, para nenhuma tela mudar de cara.
- **Determinismo em teste.** Toda função de mês aceita a data como parâmetro com default `new Date()`, para o teste injetar uma data fixa.
- **`shared-mocks` continua existindo.** Só sai do caminho de **produção** da UI. O `seed.ts` do backend e os `*.spec.ts` seguem consumindo.
- **Erro/loading.** Falhas passam por `AppDataService.fail(message, errorSignal)`.
- **Fora de escopo:** redesenho de layout, novos widgets, placeholders card a card (D6), os anos fixos dos KPIs de Relatórios (registrado na spec da fatia 6).
- **Comandos:** `npx nx test <projeto>`, `npx nx build <projeto>`, `npx nx lint <projeto>`. Jest 30 usa `--testPathPatterns`.
- **Branch:** direto em `master`.
- **Shell:** Git Bash. Commit multi-linha por heredoc (`git commit -F - <<'EOF'`).

## File Structure

**Lib**
- `libs/shared-utils/src/lib/month.ts` (novo) — `monthShort`, `monthLabelLong`, `monthContextOf`.
- `libs/shared-utils/src/index.ts` — exporta o módulo novo.

**UI (`apps/ui-financial/src/app/`)**
- `layout/app-data.service.ts` — mês inicial real; `loadCatalog` com erro; **último** import de `shared-mocks` sai.
- `layout/topbar.component.ts` — navegação usa o helper.
- `core/api/report.mapper.ts` — `monthLabel` delega ao helper.
- `features/dashboard/dashboard.component.{ts,html}` — faixa de estado.

**Raiz**
- `eslint.config.mjs` — regra que barra `type:data` em produção.

---

### Task 1: `shared-utils` — o formatador de mês único

**Files:**
- Create: `libs/shared-utils/src/lib/month.ts`
- Modify: `libs/shared-utils/src/index.ts`
- Test: `libs/shared-utils/src/lib/month.spec.ts`

**Interfaces:**
- Consumes: `MonthContext` de `@caixa-familia/shared-types`.
- Produces: `monthShort(year, month): string` → `'Mai/26'`; `monthLabelLong(year, month): string` → `'Maio 2026'`; `MonthView = MonthContext & { label: string; short: string }`; `monthContextOf(date?: Date): MonthView`. Tasks 2, 3 e 4 consomem.

- [ ] **Step 1: Escrever o teste que falha**

Criar `libs/shared-utils/src/lib/month.spec.ts`:

```typescript
import { monthShort, monthLabelLong, monthContextOf } from './month';

describe('monthShort', () => {
  it('formats as capitalised three-letter month and two-digit year', () => {
    expect(monthShort(2026, 5)).toBe('Mai/26');
    expect(monthShort(2025, 12)).toBe('Dez/25');
    expect(monthShort(2026, 1)).toBe('Jan/26');
  });
});

describe('monthLabelLong', () => {
  it('formats as capitalised full month and four-digit year', () => {
    expect(monthLabelLong(2026, 5)).toBe('Maio 2026');
    expect(monthLabelLong(2026, 7)).toBe('Julho 2026');
    expect(monthLabelLong(2025, 2)).toBe('Fevereiro 2025');
  });
});

describe('monthContextOf', () => {
  it('derives the whole context from a date', () => {
    expect(monthContextOf(new Date(2026, 6, 24))).toEqual({
      year: 2026,
      month: 7,
      label: 'Julho 2026',
      short: 'Jul/26',
    });
  });

  it('uses a one-based month, not the Date zero-based one', () => {
    expect(monthContextOf(new Date(2026, 0, 15)).month).toBe(1);
    expect(monthContextOf(new Date(2026, 11, 15)).month).toBe(12);
  });

  it('defaults to today', () => {
    const now = new Date();
    expect(monthContextOf()).toEqual(monthContextOf(now));
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx nx test shared-utils --testPathPatterns=month`
Expected: FAIL — `Cannot find module './month'`.

- [ ] **Step 3: Escrever o módulo**

Criar `libs/shared-utils/src/lib/month.ts`:

```typescript
import type { MonthContext } from '@caixa-familia/shared-types';

const MONTH_ABBR = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

/** Contexto de mês do app: as coordenadas mais os dois rótulos que a UI exibe. */
export type MonthView = MonthContext & { label: string; short: string };

/** `2026, 5` → `'Mai/26'`. */
export function monthShort(year: number, month: number): string {
  return `${MONTH_ABBR[month - 1]}/${String(year).slice(2)}`;
}

/** `2026, 5` → `'Maio 2026'`. */
export function monthLabelLong(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

/**
 * Contexto de mês a partir de uma data. Os meses de `Date` são zero-based; o
 * app trabalha com 1..12.
 */
export function monthContextOf(date: Date = new Date()): MonthView {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  return { year, month, label: monthLabelLong(year, month), short: monthShort(year, month) };
}
```

Nota: a formatação é feita à mão, não por `toLocaleDateString`, porque a saída do ICU varia por ambiente (`'mai. de 26'` no Node desta máquina) e o app precisa de um formato estável.

- [ ] **Step 4: Exportar da lib**

Em `libs/shared-utils/src/index.ts`, acrescentar:

```typescript
export * from './lib/month';
```

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `npx nx test shared-utils --testPathPatterns=month`
Expected: PASS — 7 testes.

- [ ] **Step 6: Commit**

```bash
git add libs/shared-utils
git commit -F - <<'EOF'
feat(shared-utils): add a single month formatter

The app had two: a hardcoded constant producing 'Mai/26' and the topbar's
toLocaleDateString producing 'mai. de 26', so navigating a month changed
the label's shape. Formatting by hand keeps it stable across environments.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 2: `AppDataService` — mês real e `loadCatalog` com erro

**Files:**
- Modify: `apps/ui-financial/src/app/layout/app-data.service.ts`
- Test: `apps/ui-financial/src/app/layout/app-data.service.spec.ts`

**Interfaces:**
- Consumes: `monthContextOf` (Task 1).
- Produces: `currentMonth` inicializado com o mês de hoje; `cardsError` para o caminho de cartões. Nada novo para outras tasks.

Contexto (D3/D7): o `currentMonth` era `CURRENT_MONTH`, fixo em maio/2026 — e `loadTransactions`/`loadFixed` mandam esse mês na query, então o app carregava o mês errado. E `loadCatalog` era o único load sem ramo de erro.

- [ ] **Step 1: Escrever os testes que falham**

Em `app-data.service.spec.ts`, acrescentar ao final:

```typescript
describe('AppDataService.currentMonth', () => {
  it('starts on the real current month, not a hardcoded one', () => {
    const { svc } = setup();
    const now = new Date();
    expect(svc.currentMonth()).toMatchObject({
      year: now.getFullYear(),
      month: now.getMonth() + 1,
    });
  });

  it('exposes both labels', () => {
    const { svc } = setup();
    expect(svc.currentMonth().short).toMatch(/^[A-Z][a-z]{2}\/\d{2}$/);
    expect(svc.currentMonth().label).toMatch(/^[A-ZÇ][a-zç]+ \d{4}$/);
  });
});

describe('AppDataService.loadCatalog', () => {
  it('surfaces a category failure instead of swallowing it', () => {
    const { svc, catApi } = setup();
    catApi.listCategories.mockReturnValueOnce(throwError(() => new Error('boom')));
    svc.loadCatalog();
    expect(svc.categoriesError()).toBe('Falha ao carregar categorias');
  });

  it('surfaces a card failure instead of swallowing it', () => {
    const { svc, catApi } = setup();
    catApi.listCards.mockReturnValueOnce(throwError(() => new Error('boom')));
    svc.loadCatalog();
    expect(svc.cardsError()).toBe('Falha ao carregar cartões');
  });
});
```

E ajustar o import do topo para trazer `throwError`:

```typescript
import { of, throwError } from 'rxjs';
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx nx test ui-financial --testPathPatterns=app-data.service`
Expected: FAIL — o mês é maio/2026 fixo e `svc.cardsError` não existe.

- [ ] **Step 3: Trocar o mês inicial e remover o último import de mocks**

Em `app-data.service.ts`:

Remover inteiramente a linha:

```typescript
import { CURRENT_MONTH } from '@caixa-familia/shared-mocks';
```

Acrescentar ao import de `shared-utils` (ou criar, se não houver):

```typescript
import { monthContextOf, type MonthView } from '@caixa-familia/shared-utils';
```

E a declaração do signal passa a ser:

```typescript
  readonly currentMonth = signal<MonthView>(monthContextOf());
```

Com isso, `MonthContext` pode sair do import de `shared-types` se não for mais usado no arquivo — conferir antes de remover.

- [ ] **Step 4: Dar tratamento de erro ao `loadCatalog`**

Acrescentar o signal de erro de cartões, junto de `categoriesError`:

```typescript
  readonly cardsError = signal<string | null>(null);
```

E o método passa a ser:

```typescript
  loadCatalog(): void {
    this.categoriesError.set(null);
    this.cardsError.set(null);
    this.catApi.listCategories().subscribe({
      next: (rows) => this.categories.set(rows.map(wireToCategory)),
      error: () => this.fail('Falha ao carregar categorias', this.categoriesError),
    });
    this.catApi.listCards().subscribe({
      next: (rows) => this.cards.set(rows),
      error: () => this.fail('Falha ao carregar cartões', this.cardsError),
    });
  }
```

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `npx nx test ui-financial --testPathPatterns=app-data.service`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/ui-financial/src/app/layout/app-data.service.ts apps/ui-financial/src/app/layout/app-data.service.spec.ts
git commit -F - <<'EOF'
fix(ui-financial): start on the real current month

CURRENT_MONTH pinned the whole app to May 2026, and loadTransactions and
loadFixed send that month in their queries, so the app loaded the wrong
month. Also gives loadCatalog the error handling every other load had.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 3: Topbar — navegação pelo mesmo helper

**Files:**
- Modify: `apps/ui-financial/src/app/layout/topbar.component.ts:30-52`
- Test: `apps/ui-financial/src/app/layout/topbar.component.spec.ts` (novo)

**Interfaces:**
- Consumes: `monthContextOf` (Task 1).
- Produces: nada.

Contexto (D4): `prevMonth` e `nextMonth` repetem o mesmo bloco de `toLocaleDateString`, que produz `'mai. de 26'` — formato diferente do inicial.

- [ ] **Step 1: Escrever o teste que falha**

Criar `apps/ui-financial/src/app/layout/topbar.component.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TopBarComponent } from './topbar.component';
import { AppDataService } from './app-data.service';
import { AuthService } from '../core/auth/auth.service';
import { monthContextOf } from '@caixa-familia/shared-utils';

function build() {
  const data = {
    currentMonth: signal(monthContextOf(new Date(2026, 4, 1))),
    holderFilter: signal('todos' as const),
    monthLabel: signal('Maio 2026'),
  };
  TestBed.configureTestingModule({
    imports: [TopBarComponent],
    providers: [
      { provide: AppDataService, useValue: data },
      {
        provide: AuthService,
        useValue: {
          canWrite: signal(true),
          isAuthenticated: signal(true),
          userName: signal('Mateus'),
          roles: signal(['editor']),
          login: jest.fn(),
          logout: jest.fn(),
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(TopBarComponent);
  fixture.detectChanges();
  return { component: fixture.componentInstance, data };
}

afterEach(() => TestBed.resetTestingModule());

describe('TopBarComponent — month navigation', () => {
  it('steps back a month', () => {
    const { component, data } = build();
    component.prevMonth();
    expect(data.currentMonth()).toMatchObject({ year: 2026, month: 4, short: 'Abr/26' });
  });

  it('steps forward a month', () => {
    const { component, data } = build();
    component.nextMonth();
    expect(data.currentMonth()).toMatchObject({ year: 2026, month: 6, short: 'Jun/26' });
  });

  it('crosses the year boundary backwards', () => {
    const { component, data } = build();
    data.currentMonth.set(monthContextOf(new Date(2026, 0, 1)));
    component.prevMonth();
    expect(data.currentMonth()).toMatchObject({ year: 2025, month: 12, short: 'Dez/25' });
  });

  it('crosses the year boundary forwards', () => {
    const { component, data } = build();
    data.currentMonth.set(monthContextOf(new Date(2026, 11, 1)));
    component.nextMonth();
    expect(data.currentMonth()).toMatchObject({ year: 2027, month: 1, short: 'Jan/27' });
  });

  it('keeps the same label shape as the initial month', () => {
    const { component, data } = build();
    const before = data.currentMonth().short;
    component.nextMonth();
    // 'Mai/26' e 'Jun/26' têm o mesmo formato — o bug antigo virava 'jun. de 26'
    expect(data.currentMonth().short).toMatch(/^[A-Z][a-z]{2}\/\d{2}$/);
    expect(before).toMatch(/^[A-Z][a-z]{2}\/\d{2}$/);
  });
});
```

Se o `TopBarComponent` consumir mais membros do `AppDataService` ou do `AuthService`, acrescentar ao stub — rodar e ler o erro dirá quais.

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx nx test ui-financial --testPathPatterns=topbar`
Expected: FAIL — o `short` sai como `'abr. de 26'`.

- [ ] **Step 3: Usar o helper**

Em `topbar.component.ts`, importar:

```typescript
import { monthContextOf } from '@caixa-familia/shared-utils';
```

E os dois métodos viram:

```typescript
  prevMonth() {
    const m = this.data.currentMonth();
    this.data.currentMonth.set(monthContextOf(new Date(m.year, m.month - 2)));
  }

  nextMonth() {
    const m = this.data.currentMonth();
    this.data.currentMonth.set(monthContextOf(new Date(m.year, m.month)));
  }
```

(`m.month` é 1-based: `new Date(y, m.month)` é o mês seguinte e `new Date(y, m.month - 2)` o anterior — a mesma aritmética de antes, agora com um formatador só.)

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx nx test ui-financial --testPathPatterns=topbar`
Expected: PASS — 5 testes.

- [ ] **Step 5: Commit**

```bash
git add apps/ui-financial/src/app/layout/topbar.component.ts apps/ui-financial/src/app/layout/topbar.component.spec.ts
git commit -F - <<'EOF'
fix(ui-financial): keep the month label stable when navigating

prevMonth and nextMonth each rebuilt the month context with
toLocaleDateString, yielding 'mai. de 26' where the initial value was
'Mai/26' — one click changed the label's shape across Budgets, Invoice
and Reports. Both now go through the shared formatter.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 4: `report.mapper` — uma definição só de `'Mai/26'`

**Files:**
- Modify: `apps/ui-financial/src/app/core/api/report.mapper.ts`

**Interfaces:**
- Consumes: `monthShort` (Task 1).
- Produces: `monthLabel` segue exportado com a mesma assinatura — o spec existente não muda.

- [ ] **Step 1: Delegar**

Em `report.mapper.ts`, remover o `MONTH_ABBR` local e fazer:

```typescript
import { monthShort } from '@caixa-familia/shared-utils';
```

```typescript
/** `2026, 5` → `'Mai/26'`. Mantido aqui como nome de domínio da série mensal. */
export const monthLabel = monthShort;
```

- [ ] **Step 2: Confirmar que o spec existente continua passando**

Run: `npx nx test ui-financial --testPathPatterns=report.mapper`
Expected: PASS — os 7 testes de antes, sem alteração no arquivo de teste.

- [ ] **Step 3: Commit**

```bash
git add apps/ui-financial/src/app/core/api/report.mapper.ts
git commit -F - <<'EOF'
refactor(ui-financial): single source for the short month label

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 5: Dashboard — faixa de carregando/vazio

**Files:**
- Modify: `apps/ui-financial/src/app/features/dashboard/dashboard.component.ts`
- Modify: `apps/ui-financial/src/app/features/dashboard/dashboard.component.html`
- Modify: `apps/ui-financial/src/app/features/dashboard/dashboard.component.scss`
- Test: `apps/ui-financial/src/app/features/dashboard/dashboard.component.spec.ts` (novo)

**Interfaces:**
- Consumes: signals de loading e as listas do `AppDataService`.
- Produces: nada. Fecha a fatia.

Decisão D6: uma faixa no container, valendo para as três abas; sem tocar em card nenhum.

- [ ] **Step 1: Escrever os testes que falham**

Criar `apps/ui-financial/src/app/features/dashboard/dashboard.component.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { DashboardComponent } from './dashboard.component';
import { AppDataService } from '../../layout/app-data.service';

function mockData(over: Record<string, unknown> = {}) {
  return {
    transactions: signal([]),
    incomes: signal([]),
    fixed: signal([]),
    goals: signal([]),
    cards: signal([]),
    categories: signal([]),
    history: signal([]),
    incomeHistory: signal([]),
    catBy: signal({}),
    cardBy: signal({}),
    holderFilter: signal('todos'),
    currentMonth: signal({ year: 2026, month: 7, label: 'Julho 2026', short: 'Jul/26' }),
    transactionsLoading: signal(false),
    incomesLoading: signal(false),
    fixedLoading: signal(false),
    goalsLoading: signal(false),
    ...over,
  };
}

function build(over: Record<string, unknown> = {}) {
  TestBed.configureTestingModule({
    imports: [DashboardComponent],
    providers: [{ provide: AppDataService, useValue: mockData(over) }],
  });
  const fixture = TestBed.createComponent(DashboardComponent);
  fixture.detectChanges();
  return fixture.componentInstance;
}

afterEach(() => TestBed.resetTestingModule());

describe('DashboardComponent — data state', () => {
  it('is loading while any resource is in flight', () => {
    expect(build({ transactionsLoading: signal(true) }).loading()).toBe(true);
  });

  it('is not loading once every resource settled', () => {
    expect(build().loading()).toBe(false);
  });

  it('reports empty when nothing loaded and nothing is in flight', () => {
    expect(build().isEmpty()).toBe(true);
  });

  it('does not report empty while still loading', () => {
    expect(build({ goalsLoading: signal(true) }).isEmpty()).toBe(false);
  });

  it('does not report empty when there are transactions', () => {
    const c = build({ transactions: signal([{ id: 't1' }]) });
    expect(c.isEmpty()).toBe(false);
  });

  it('does not report empty when there are only fixed expenses', () => {
    const c = build({ fixed: signal([{ id: 'f1' }]) });
    expect(c.isEmpty()).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx nx test ui-financial --testPathPatterns=dashboard.component`
Expected: FAIL — `component.loading is not a function`.

- [ ] **Step 3: Implementar os computeds**

Em `dashboard.component.ts`, injetar o serviço e acrescentar:

```typescript
import { Component, signal, effect, computed, inject } from '@angular/core';
import { AppDataService } from '../../layout/app-data.service';
```

```typescript
  private data = inject(AppDataService);

  /** Qualquer recurso do mês ainda em voo. */
  loading = computed(
    () =>
      this.data.transactionsLoading() ||
      this.data.incomesLoading() ||
      this.data.fixedLoading() ||
      this.data.goalsLoading(),
  );

  /** Nada carregado e nada mais por vir — household sem dados no mês. */
  isEmpty = computed(
    () =>
      !this.loading() &&
      this.data.transactions().length === 0 &&
      this.data.incomes().length === 0 &&
      this.data.fixed().length === 0 &&
      this.data.goals().length === 0,
  );

  monthLabel = computed(() => this.data.currentMonth().label);
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx nx test ui-financial --testPathPatterns=dashboard.component`
Expected: PASS — 6 testes.

- [ ] **Step 5: Faixa no template**

Em `dashboard.component.html`, logo depois da barra de abas e antes do bloco que renderiza a aba ativa:

```html
@if (loading()) {
  <p class="dash-state">Carregando os dados de {{ monthLabel() }}…</p>
} @else if (isEmpty()) {
  <p class="dash-state">
    Nenhum lançamento em {{ monthLabel() }}. Use o botão de novo lançamento para começar.
  </p>
}
```

E em `dashboard.component.scss`:

```scss
.dash-state {
  margin: 0 0 12px;
  padding: 10px 14px;
  font-size: 12.5px;
  color: var(--ink-3);
  background: var(--surface-alt);
  border: 1px solid var(--line);
}
```

Conferir os nomes das variáveis no arquivo antes de colar.

- [ ] **Step 6: Build**

Run: `npx nx build ui-financial`
Expected: build verde.

- [ ] **Step 7: Commit**

```bash
git add apps/ui-financial/src/app/features/dashboard
git commit -F - <<'EOF'
feat(ui-financial): show loading and empty state on the dashboard

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 6: Travar `shared-mocks` fora da produção e fechar a migração

**Files:**
- Modify: `eslint.config.mjs`
- Modify: `libs/shared-mocks/project.json` (se a tag precisar de ajuste)

**Interfaces:** nenhuma.

Decisão D5: a saída do mock do caminho de produção vira regra, não disciplina. As tags já existem: `ui-financial` é `scope:web`; `shared-mocks` é `scope:shared`, `type:data`.

- [ ] **Step 1: Verificar que nenhum código de produção importa a lib**

Run: `grep -rn "shared-mocks" apps/ui-financial/src --include=*.ts | grep -v "\.spec\.ts"`
Expected: **vazio**. Se aparecer algo, resolver antes de seguir — a regra da Step 2 quebraria o lint.

- [ ] **Step 2: Adicionar a restrição**

Em `eslint.config.mjs`, acrescentar ao array `depConstraints`, junto das entradas de `scope:`:

```javascript
            {
              // shared-mocks é fixture: só specs podem depender dela.
              sourceTag: '*',
              onlyDependOnLibsWithTags: ['*'],
              notDependOnLibsWithTags: ['type:data'],
              allSourceFiles: false,
            },
```

Nota: `@nx/enforce-module-boundaries` aplica `depConstraints` a arquivos de produção; arquivos de teste são avaliados quando `allSourceFiles` é verdadeiro. Se a versão do plugin no repo não suportar a combinação acima, a alternativa equivalente é `bannedExternalImports`/uma entrada `sourceTag: 'scope:web'` com `notDependOnLibsWithTags: ['type:data']`. Rodar a Step 3 e ajustar conforme o erro.

- [ ] **Step 3: Confirmar que o lint passa com o código atual**

Run: `npx nx lint ui-financial`
Expected: "All files pass linting" — nenhum arquivo de produção importa a lib.

- [ ] **Step 4: Confirmar que a regra realmente morde**

Reintroduzir temporariamente, em `apps/ui-financial/src/app/layout/app-data.service.ts`, a linha:

```typescript
import { CURRENT_MONTH } from '@caixa-familia/shared-mocks';
```

Run: `npx nx lint ui-financial`
Expected: **FALHA** apontando a violação de fronteira. Remover a linha de volta e rodar o lint de novo para confirmar verde. Se a regra **não** falhar, ela não está funcionando — ajustar a configuração antes de seguir.

- [ ] **Step 5: Gate de mock zero**

Run: `grep -rn "shared-mocks\|MOCK_" apps/ui-financial/src --include=*.ts | grep -v "\.spec\.ts"`
Expected: **vazio**.

- [ ] **Step 6: Suítes, builds e lint**

Run: `npx nx test api-financial && npx nx test ui-financial && npx nx test shared-utils`
Expected: PASS nos três.

Run: `npx nx build api-financial && npx nx build ui-financial`
Expected: verde nos dois.

Run: `npx nx lint ui-financial`
Expected: "All files pass linting".

- [ ] **Step 7: Confirmar que o seed do backend continua íntegro**

Run: `npx tsc --noEmit -p apps/api-financial/tsconfig.app.json`
Expected: sem erros — o `seed.ts` importa `shared-mocks` por caminho relativo e deve seguir funcionando.

- [ ] **Step 8: Smoke manual**

Com o stack rodando e logado:
1. O mês no topo é o **mês de hoje**, não maio/2026.
2. Navegar para o mês anterior e seguinte: o rótulo mantém o formato (`Jun/26`, `Jul/26`), sem virar `jun. de 26`.
3. Dashboard num mês sem lançamentos: a faixa de vazio aparece; num mês com dados, não aparece.
4. Derrubar a API e recarregar: aparece toast de falha para categorias e cartões, que antes falhavam em silêncio.

- [ ] **Step 9: Commit**

```bash
git add eslint.config.mjs
git commit -F - <<'EOF'
chore: keep shared-mocks out of the production path

The migration is done, so no production file should import fixtures
again. A module-boundary rule makes a regression fail the lint instead of
slipping in unnoticed; specs and the backend seed keep using the lib.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

## Self-Review

**Cobertura da spec:**
- §3 `app-data.service` (mocks residuais + D3 + D7) → Task 2.
- §3 build de produção sem `shared-mocks` (D5) → Task 6.
- §3 `features/dashboard` estados (D6) → Task 5.
- D4 (formatador único) → Tasks 1, 3 e 4.
- §4 gate de limpeza e testes → Task 6.

**Type consistency:** `MonthView` é declarado em `shared-utils` (Task 1) e usado pelo `AppDataService` (Task 2) no lugar do inline `MonthContext & { label, short }`; `monthContextOf(date?)` tem a mesma assinatura nas Tasks 2 e 3; `monthLabel` do `report.mapper` mantém assinatura `(year, month) => string` ao virar alias de `monthShort`, então o spec da fatia 6 não muda.

**Ponto de atenção conhecido:** o Step 4 da Task 6 é uma verificação destrutiva-e-revertida (introduzir a violação de propósito). Se for executada por um agente, garantir que a linha seja **removida** antes do commit — o Step 5 pega isso se escapar.
