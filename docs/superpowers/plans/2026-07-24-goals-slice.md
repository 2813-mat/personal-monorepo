# Fatia 3 — Goals (API ↔ front) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer a tela de Metas ler `GET /goals` em vez de mock e ligar o tipo "Aporte" do drawer a `POST /goals/:slug/contributions`.

**Architecture:** Mesmo padrão das fatias de Transactions, Incomes e Fixed. No backend, uma única mudança: `addContribution` passa a resolver a meta por **slug** (a UI só conhece o slug, porque a convenção do projeto é `Goal.id = slug`). Na UI, entra o par `goal-api.service.ts` + `goal.mapper.ts`, o `AppDataService` ganha `loadGoals()`/`addContribution()`, e o drawer ganha o ramo de aporte que hoje não existe.

**Tech Stack:** Nx 22 monorepo · NestJS 11 + Prisma (api-financial) · Angular 21 standalone + signals (ui-financial) · Jest 30 · libs `shared-types`, `shared-mocks`.

**Spec:** `docs/superpowers/specs/2026-07-11-goals-slice-design.md`
**Umbrella:** `docs/superpowers/specs/2026-07-11-api-front-migration-umbrella.md`

## Global Constraints

- **Convenção `id = slug`.** O `Goal.id` do shared-types carrega o `slug` do wire, nunca o cuid. Já vale para `Category`.
- **Camada de dados na UI.** Por recurso: `app/core/api/<recurso>-api.service.ts` (tipado pelo wire, testado com `HttpTestingController`) + `app/core/api/<recurso>.mapper.ts` (wire ↔ shared-types, com unit test). `AppDataService` é a fachada de signals.
- **Erro/loading.** Cada recurso tem `<recurso>Loading` / `<recurso>Error`; falhas passam por `AppDataService.fail(message, errorSignal)`, que seta o signal e dispara toast `neg`.
- **Disparo de loads.** `goals` **não** tem dimensão de mês: carrega no `effect` de auth, junto de catálogo e receitas — **não** no effect que reage a `currentMonth()`.
- **Gate de write.** `@Roles('admin','editor')` no backend e `auth.canWrite()` na UI já existem; não mexer.
- **Fora de escopo:** criar/editar/remover metas; histórico detalhado de contribuições.
- **Comandos:** `npx nx test <projeto>`, `npx nx build <projeto>`. Jest 30 usa `--testPathPatterns` (plural).
- **Branch:** trabalhar direto em `master` (decisão do usuário nesta sessão).
- **Sintaxe de shell:** a ferramenta Bash aqui é Git Bash (POSIX sh). Para mensagem de commit multi-linha usar heredoc (`git commit -F - <<'EOF'`), **nunca** here-string de PowerShell (`@'...'@`).

## File Structure

**Backend (`apps/api-financial/src/modules/goals/goal/`)**
- `infrastructure/goal.prisma.repository.ts` — `addContribution` resolve por slug.
- `infrastructure/goal.prisma.repository.spec.ts` (novo) — cobre o resolve-por-slug.

**UI (`apps/ui-financial/src/app/`)**
- `core/api/wire.types.ts` — `GoalWire`, `CreateContributionWire`.
- `core/api/goal-api.service.ts` (novo) — só HTTP.
- `core/api/goal.mapper.ts` (novo) — só tradução wire ↔ domínio.
- `layout/app-data.service.ts` — `loadGoals()`, `addContribution()`, signals de estado.
- `layout/app-shell.component.ts` — `loadGoals()` no effect de auth.
- `features/expense-drawer/expense-drawer.component.{ts,html}` — ramo `contribution` + seletor de meta.

`features/goals/goals.component.ts` **não muda**: já lê `data.goals`.

---

### Task 1: Backend — `addContribution` resolve a meta por slug

**Files:**
- Modify: `apps/api-financial/src/modules/goals/goal/infrastructure/goal.prisma.repository.ts:23-32`
- Test: `apps/api-financial/src/modules/goals/goal/infrastructure/goal.prisma.repository.spec.ts` (novo)

**Interfaces:**
- Consumes: nada (primeira task).
- Produces: `POST /goals/:slug/contributions` passa a aceitar o **slug** no path. A Task 2 depende disso.

Contexto: hoje o método faz `this.scoped({ id: goalId })` e grava `goalId` cru na contribuição. A UI só possui o slug (`Goal.id = slug`), então a chamada quebraria. O resolve por slug também garante que a contribuição gravada aponte para o cuid real.

- [ ] **Step 1: Escrever o teste que falha**

Criar `apps/api-financial/src/modules/goals/goal/infrastructure/goal.prisma.repository.spec.ts`:

```typescript
import { GoalPrismaRepository } from './goal.prisma.repository';

function setup() {
  const goal = { id: 'cuid-1', slug: 'sos', householdId: 'h1' };
  const prisma = {
    goal: { findFirstOrThrow: jest.fn(async () => goal), findMany: jest.fn(async () => []) },
    goalContribution: { create: jest.fn(async () => undefined) },
  };
  const tenant = { householdId: 'h1' };
  const repo = new GoalPrismaRepository(prisma as any, tenant as any);
  return { repo, prisma, goal };
}

describe('GoalPrismaRepository.addContribution', () => {
  it('looks the goal up by slug, not by id', async () => {
    const { repo, prisma } = setup();
    await repo.addContribution('sos', { amount: 100, date: '2026-05-22' });
    const where = prisma.goal.findFirstOrThrow.mock.calls[0][0].where;
    expect(where).toMatchObject({ slug: 'sos' });
    expect(where).not.toHaveProperty('id');
  });

  it('stores the contribution against the resolved cuid', async () => {
    const { repo, prisma } = setup();
    await repo.addContribution('sos', { amount: 100, date: '2026-05-22' });
    expect(prisma.goalContribution.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ goalId: 'cuid-1', householdId: 'h1', amount: 100 }),
    });
  });

  it('scopes the lookup to the household', async () => {
    const { repo, prisma } = setup();
    await repo.addContribution('sos', { amount: 100, date: '2026-05-22' });
    expect(prisma.goal.findFirstOrThrow.mock.calls[0][0].where).toMatchObject({ householdId: 'h1' });
  });
});
```

Nota: se `TenantRepository` expuser `householdId` por outro caminho que não `tenant.householdId`, ajustar o stub `tenant` para o formato real — conferir `infrastructure/auth/tenant-repository.base.ts` antes de rodar.

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx nx test api-financial --testPathPatterns=goal.prisma.repository`
Expected: FAIL — o `where` tem `id: 'sos'` em vez de `slug: 'sos'`, e a contribuição é gravada com `goalId: 'sos'`.

- [ ] **Step 3: Resolver por slug**

Em `apps/api-financial/src/modules/goals/goal/infrastructure/goal.prisma.repository.ts`, substituir o método inteiro:

```typescript
  async addContribution(slug: string, data: AddContributionData): Promise<void> {
    const goal = await this.prisma.goal.findFirstOrThrow({ where: this.scoped({ slug }) });
    await this.prisma.goalContribution.create({
      data: {
        householdId: this.householdId,
        goalId: goal.id,
        amount: data.amount,
        date: new Date(data.date),
      },
    });
  }
```

- [ ] **Step 4: Alinhar o nome do parâmetro no contrato**

Em `apps/api-financial/src/modules/goals/goal/domain/goal.repository.ts`, o abstract passa a nomear o parâmetro pelo que ele é:

```typescript
  abstract addContribution(slug: string, data: AddContributionData): Promise<void>;
```

E em `apps/api-financial/src/modules/goals/goal/application/add-contribution.usecase.ts`:

```typescript
  execute(slug: string, data: AddContributionData) {
    return this.repo.addContribution(slug, data);
  }
```

(Mudança de nome apenas — a assinatura posicional é a mesma, então `add-contribution.usecase.spec.ts` continua válido.)

- [ ] **Step 5: Rodar os testes do módulo**

Run: `npx nx test api-financial --testPathPatterns=goal`
Expected: PASS — o spec novo (3 testes), `goal.mapper.spec` e `add-contribution.usecase.spec`.

- [ ] **Step 6: Rodar a suíte inteira do backend**

Run: `npx nx test api-financial`
Expected: PASS (21+ suites).

- [ ] **Step 7: Commit**

```bash
git add apps/api-financial/src/modules/goals
git commit -F - <<'EOF'
feat(api-financial): resolve goal contributions by slug

The UI only ever holds the slug (Goal.id = slug by convention), so the
contribution endpoint has to resolve the goal by slug and store the
contribution against the resolved cuid.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 2: UI — wire types + `GoalApiService`

**Files:**
- Modify: `apps/ui-financial/src/app/core/api/wire.types.ts`
- Create: `apps/ui-financial/src/app/core/api/goal-api.service.ts`
- Test: `apps/ui-financial/src/app/core/api/goal-api.service.spec.ts`

**Interfaces:**
- Consumes: o endpoint por slug da Task 1.
- Produces: `GoalApiService.list(): Observable<GoalWire[]>` e `GoalApiService.addContribution(slug: string, body: CreateContributionWire): Observable<void>`. A Task 4 injeta esse serviço.

- [ ] **Step 1: Escrever o teste que falha**

Criar `apps/ui-financial/src/app/core/api/goal-api.service.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { GoalApiService } from './goal-api.service';
import { environment } from '../../../environments/environment';

describe('GoalApiService', () => {
  let service: GoalApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GoalApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(GoalApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('GETs goals without params', () => {
    service.list().subscribe();
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/goals`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('POSTs a contribution to the goal slug', () => {
    const body = { amount: 500, date: '2026-05-22' };
    service.addContribution('sos', body).subscribe();
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/goals/sos/contributions`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush(null);
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx nx test ui-financial --testPathPatterns=goal-api.service`
Expected: FAIL — `Cannot find module './goal-api.service'`.

- [ ] **Step 3: Adicionar os wire types**

Acrescentar ao final de `apps/ui-financial/src/app/core/api/wire.types.ts`:

```typescript
export interface GoalWire {
  id: string;
  slug: string;
  label: string;
  target: number;
  monthly: number;
  color: string;
  subtitle: string;
  type: 'SONHO' | 'EMERGENCIA';
  balance: number;
  history: number[];
}

export interface CreateContributionWire {
  amount: number;
  date: string;
}
```

- [ ] **Step 4: Escrever o serviço**

Criar `apps/ui-financial/src/app/core/api/goal-api.service.ts`:

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { GoalWire, CreateContributionWire } from './wire.types';

@Injectable({ providedIn: 'root' })
export class GoalApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/goals`;

  list(): Observable<GoalWire[]> {
    return this.http.get<GoalWire[]>(this.base);
  }

  addContribution(slug: string, body: CreateContributionWire): Observable<void> {
    return this.http.post<void>(`${this.base}/${slug}/contributions`, body);
  }
}
```

- [ ] **Step 5: Rodar o teste e confirmar que passa**

Run: `npx nx test ui-financial --testPathPatterns=goal-api.service`
Expected: PASS — 2 testes.

- [ ] **Step 6: Commit**

```bash
git add apps/ui-financial/src/app/core/api/wire.types.ts apps/ui-financial/src/app/core/api/goal-api.service.ts apps/ui-financial/src/app/core/api/goal-api.service.spec.ts
git commit -F - <<'EOF'
feat(ui-financial): add GoalApiService

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 3: UI — `goal.mapper`

**Files:**
- Create: `apps/ui-financial/src/app/core/api/goal.mapper.ts`
- Test: `apps/ui-financial/src/app/core/api/goal.mapper.spec.ts`

**Interfaces:**
- Consumes: `GoalWire` (Task 2).
- Produces: `wireToGoal(w: GoalWire): Goal`. A Task 4 importa isso. **Não há** `goalToCreateWire`: criar meta está fora de escopo, e a contribuição usa `CreateContributionWire` montado direto no `AppDataService`.

- [ ] **Step 1: Escrever o teste que falha**

Criar `apps/ui-financial/src/app/core/api/goal.mapper.spec.ts`:

```typescript
import { wireToGoal } from './goal.mapper';
import type { GoalWire } from './wire.types';

const wire: GoalWire = {
  id: 'cuid-1',
  slug: 'sos',
  label: 'Reserva de emergência',
  target: 30000,
  monthly: 800,
  color: '#A16207',
  subtitle: 'colchão · 6 meses',
  type: 'EMERGENCIA',
  balance: 18420,
  history: [500, 500, 500, 600, 600, 700, 700, 800, 800, 800, 800, 800],
};

describe('wireToGoal', () => {
  it('uses the slug as the domain id, dropping the cuid', () => {
    const goal = wireToGoal(wire);
    expect(goal.id).toBe('sos');
  });

  it('lowercases the goal type', () => {
    expect(wireToGoal(wire).type).toBe('emergencia');
    expect(wireToGoal({ ...wire, type: 'SONHO' }).type).toBe('sonho');
  });

  it('maps the remaining fields one to one', () => {
    expect(wireToGoal(wire)).toEqual({
      id: 'sos',
      label: 'Reserva de emergência',
      target: 30000,
      balance: 18420,
      monthly: 800,
      color: '#A16207',
      subtitle: 'colchão · 6 meses',
      type: 'emergencia',
      history: [500, 500, 500, 600, 600, 700, 700, 800, 800, 800, 800, 800],
    });
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx nx test ui-financial --testPathPatterns=goal.mapper`
Expected: FAIL — `Cannot find module './goal.mapper'`.

- [ ] **Step 3: Escrever o mapper**

Criar `apps/ui-financial/src/app/core/api/goal.mapper.ts`:

```typescript
import type { Goal } from '@caixa-familia/shared-types';
import type { GoalWire } from './wire.types';

export function wireToGoal(w: GoalWire): Goal {
  return {
    id: w.slug,
    label: w.label,
    target: w.target,
    balance: w.balance,
    monthly: w.monthly,
    color: w.color,
    subtitle: w.subtitle,
    type: w.type.toLowerCase() as Goal['type'],
    history: w.history,
  };
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx nx test ui-financial --testPathPatterns=goal.mapper`
Expected: PASS — 3 testes.

- [ ] **Step 5: Commit**

```bash
git add apps/ui-financial/src/app/core/api/goal.mapper.ts apps/ui-financial/src/app/core/api/goal.mapper.spec.ts
git commit -F - <<'EOF'
feat(ui-financial): add goal mapper

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 4: UI — `AppDataService.loadGoals()/addContribution()` + load no shell

**Files:**
- Modify: `apps/ui-financial/src/app/layout/app-data.service.ts`
- Modify: `apps/ui-financial/src/app/layout/app-shell.component.ts` (effect de auth)
- Test: `apps/ui-financial/src/app/layout/app-data.service.spec.ts`

**Interfaces:**
- Consumes: `GoalApiService` (Task 2), `wireToGoal` (Task 3).
- Produces: `AppDataService.goals: Signal<Goal[]>` (agora vazio por padrão), `loadGoals(): void`, `addContribution(slug: string, amount: number, date: string): void`, `goalsLoading`, `goalsError`. A Task 5 chama `addContribution`.

- [ ] **Step 1: Escrever os testes que falham**

Em `apps/ui-financial/src/app/layout/app-data.service.spec.ts`:

Nos imports:

```typescript
import { GoalApiService } from '../core/api/goal-api.service';
import type { TransactionWire, IncomeWire, FixedExpenseWire, GoalWire } from '../core/api/wire.types';
```

Fixture nova, depois de `fixedWire`:

```typescript
const goalWire: GoalWire = {
  id: 'cuid-1',
  slug: 'sos',
  label: 'Reserva de emergência',
  target: 30000,
  monthly: 800,
  color: '#A16207',
  subtitle: 'colchão · 6 meses',
  type: 'EMERGENCIA',
  balance: 18420,
  history: [500, 500, 500, 600, 600, 700, 700, 800, 800, 800, 800, 800],
};
```

No `setup()`, acrescentar o stub e o provider (mantendo os já existentes):

```typescript
  const goalApi = {
    list: overrides.goalList ?? jest.fn(() => of([goalWire])),
    addContribution: jest.fn(() => of(undefined)),
  };
```

```typescript
      { provide: GoalApiService, useValue: goalApi },
```

Ampliar a assinatura de overrides e o retorno:

```typescript
function setup(overrides: { txList?: jest.Mock; incList?: jest.Mock; fixList?: jest.Mock; goalList?: jest.Mock } = {}) {
```

```typescript
  return { svc: TestBed.inject(AppDataService), txApi, incApi, fixApi, goalApi };
```

E ao final do arquivo:

```typescript
describe('AppDataService.loadGoals', () => {
  it('fills the goals signal with mapped domain objects', () => {
    const { svc, goalApi } = setup();
    svc.loadGoals();
    expect(goalApi.list).toHaveBeenCalled();
    expect(svc.goals()[0]).toMatchObject({ id: 'sos', type: 'emergencia', balance: 18420 });
    expect(svc.goalsLoading()).toBe(false);
  });

  it('starts empty instead of serving mock data', () => {
    const { svc } = setup();
    expect(svc.goals()).toEqual([]);
  });
});

describe('AppDataService.addContribution', () => {
  it('posts to the goal slug and reloads goals', () => {
    const { svc, goalApi } = setup();
    svc.addContribution('sos', 500, '2026-05-22');
    expect(goalApi.addContribution).toHaveBeenCalledWith('sos', { amount: 500, date: '2026-05-22' });
    expect(goalApi.list).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npx nx test ui-financial --testPathPatterns=app-data.service`
Expected: FAIL — `svc.loadGoals is not a function`.

- [ ] **Step 3: Implementar no `AppDataService`**

Em `apps/ui-financial/src/app/layout/app-data.service.ts`:

Tirar `MOCK_GOALS` do import de `@caixa-familia/shared-mocks` (restam `MOCK_HISTORY`, `MOCK_INCOME_HISTORY`, `CURRENT_MONTH`), acrescentar `Goal` ao import de tipos do shared-types, e adicionar:

```typescript
import { GoalApiService } from '../core/api/goal-api.service';
import { wireToGoal } from '../core/api/goal.mapper';
```

Injetar:

```typescript
  private goalApi = inject(GoalApiService);
```

Trocar `readonly goals = signal(MOCK_GOALS);` por um signal vazio, movido para junto de `fixed` (fora do bloco "still-mock"):

```typescript
  readonly goals = signal<Goal[]>([]);
```

Signals de estado, junto dos de fixed:

```typescript
  readonly goalsLoading = signal(false);
  readonly goalsError = signal<string | null>(null);
```

E os métodos, ao final da classe:

```typescript
  loadGoals(): void {
    this.goalsLoading.set(true);
    this.goalsError.set(null);
    this.goalApi.list().subscribe({
      next: (rows) => {
        this.goals.set(rows.map(wireToGoal));
        this.goalsLoading.set(false);
      },
      error: () => {
        this.fail('Falha ao carregar metas', this.goalsError);
        this.goalsLoading.set(false);
      },
    });
  }

  addContribution(slug: string, amount: number, date: string): void {
    this.goalApi.addContribution(slug, { amount, date }).subscribe({
      next: () => this.loadGoals(),
      error: () => this.fail('Falha ao registrar aporte', this.goalsError),
    });
  }
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npx nx test ui-financial --testPathPatterns=app-data.service`
Expected: PASS — incluindo os 3 novos.

- [ ] **Step 5: Disparar o load no shell**

Em `apps/ui-financial/src/app/layout/app-shell.component.ts`, o **primeiro** effect (o de auth, sem mês) passa a carregar metas — `goals` não tem dimensão de mês:

```typescript
    // Load the catalog, incomes and goals once the user is authenticated.
    effect(() => {
      if (this.auth.isAuthenticated()) {
        this.data.loadCatalog();
        this.data.loadIncomes();
        this.data.loadGoals();
      }
    });
```

- [ ] **Step 6: Rodar a suíte da UI**

Run: `npx nx test ui-financial`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/ui-financial/src/app/layout
git commit -F - <<'EOF'
feat(ui-financial): load goals and post contributions via AppDataService

goals stops being mock-backed. It has no month dimension, so it loads on
the auth effect alongside the catalog and incomes.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 5: UI — ramo "Aporte" no drawer com seletor de meta

**Files:**
- Modify: `apps/ui-financial/src/app/features/expense-drawer/expense-drawer.component.ts`
- Modify: `apps/ui-financial/src/app/features/expense-drawer/expense-drawer.component.html`
- Test: `apps/ui-financial/src/app/features/expense-drawer/expense-drawer.component.spec.ts`

**Interfaces:**
- Consumes: `AppDataService.goals` e `addContribution(slug, amount, date)` (Task 4).
- Produces: nada. Fecha a fatia.

Contexto (D5): hoje `save()` **não tem ramo para `'contribution'`** — o tipo Aporte cai no ramo final e cria uma transação. Esta task conserta isso.

- [ ] **Step 1: Escrever os testes que falham**

Em `apps/ui-financial/src/app/features/expense-drawer/expense-drawer.component.spec.ts`, acrescentar `goals` ao mock e um describe novo.

No `mockDataService()`, adicionar (mantendo o resto):

```typescript
    goals: signal([
      { id: 'sos', label: 'Reserva', target: 30000, balance: 1000, monthly: 800, color: '#A16207', subtitle: '', type: 'emergencia' as const, history: [] },
    ]),
    addContribution: jest.fn(),
```

E o describe novo, ao final do arquivo:

```typescript
describe('ExpenseDrawerComponent — contribution type', () => {
  let component: ExpenseDrawerComponent;
  let data: ReturnType<typeof mockDataService>;

  beforeEach(async () => {
    data = mockDataService();
    await TestBed.configureTestingModule({
      imports: [ExpenseDrawerComponent],
      providers: [{ provide: AppDataService, useValue: data }],
    }).compileComponents();

    const fixture = TestBed.createComponent(ExpenseDrawerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function fillContribution(goal: string | null) {
    component.form.patchValue({
      type: 'contribution',
      label: 'Aporte de maio',
      value: 500,
      date: '2026-05-22',
      holder: 'shared',
      goal,
    });
  }

  it('requires a target goal', () => {
    fillContribution(null);
    expect(component.form.controls.goal.valid).toBe(false);
    expect(component.form.invalid).toBe(true);
  });

  it('does not require a category', () => {
    fillContribution('sos');
    expect(component.form.valid).toBe(true);
  });

  it('routes a valid contribution to addContribution', () => {
    fillContribution('sos');
    component.save();
    expect(data.addContribution).toHaveBeenCalledWith('sos', 500, '2026-05-22');
  });

  it('no longer creates a transaction for a contribution', () => {
    fillContribution('sos');
    component.save();
    expect(data.createTransaction).not.toHaveBeenCalled();
  });

  it('does not submit without a goal', () => {
    fillContribution(null);
    component.save();
    expect(data.addContribution).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npx nx test ui-financial --testPathPatterns=expense-drawer`
Expected: FAIL — o control `goal` não existe; e o teste "no longer creates a transaction" mostra o bug atual (chama `createTransaction`).

- [ ] **Step 3: Adicionar o control e os validators condicionais**

Em `expense-drawer.component.ts`, adicionar o control ao `FormGroup` (logo depois de `dueDay`):

```typescript
    goal: new FormControl<string | null>(null),
```

No `constructor`, estender o subscribe de `type` — o `cat` não se aplica a aporte, e a meta é obrigatória só nele:

```typescript
      const cat = this.form.controls.cat;
      if (type === 'income' || type === 'contribution') {
        cat.clearValidators();
      } else {
        cat.setValidators([Validators.required]);
      }
      cat.updateValueAndValidity();

      const goal = this.form.controls.goal;
      if (type === 'contribution') {
        goal.setValidators([Validators.required]);
      } else {
        goal.clearValidators();
      }
      goal.updateValueAndValidity();
```

(Manter os blocos de `dueDay`/`date` já existentes como estão.)

- [ ] **Step 4: Adicionar o ramo no `save()`**

Em `save()`, antes do ramo de `income`:

```typescript
    if (v.type === 'contribution') {
      this.data.addContribution(String(v.goal), Number(v.value), v.date);
      this.onClose();
      return;
    }
```

- [ ] **Step 5: Rodar os testes e confirmar que passam**

Run: `npx nx test ui-financial --testPathPatterns=expense-drawer`
Expected: PASS — os 6 testes do tipo fixed e os 5 novos.

- [ ] **Step 6: Adicionar o seletor de meta no template**

Em `expense-drawer.component.html`, no bloco de Categoria, mostrar o seletor de meta no lugar do de categoria quando o tipo for aporte (D4 — mesmo padrão visual de chips). Envolver o bloco de categoria existente e acrescentar o irmão:

```html
    @if (form.controls.type.value === 'contribution') {
      <!-- Meta -->
      <div class="label mt">Meta</div>
      <div class="cat-grid">
        @for (g of data.goals(); track g.id) {
          <button
            type="button"
            class="cat-chip"
            [class.active]="form.controls.goal.value === g.id"
            (click)="form.controls.goal.setValue(g.id)"
          >
            {{ g.label }}
          </button>
        }
      </div>
    } @else {
      <!-- Categoria -->
      <div class="label mt">Categoria</div>
      <div class="cat-grid">
        @for (cat of data.categories(); track cat.id) {
          <button
            type="button"
            class="cat-chip"
            [class.active]="form.controls.cat.value === cat.id"
            (click)="form.controls.cat.setValue(cat.id)"
          >
            <cf-cat-dot [catId]="cat.id" [size]="8" />
            {{ cat.label }}
          </button>
        }
      </div>
    }
```

O método de pagamento também não se aplica ao aporte: estender a condição que já esconde o bloco para o tipo `fixed`, de `!== 'fixed'` para `!== 'fixed' && form.controls.type.value !== 'contribution'`. Ajustar também o texto do cabeçalho/botão se o `@if` de título já existir (padrão da fatia anterior).

- [ ] **Step 7: Build para type-check de template**

Run: `npx nx build ui-financial`
Expected: build verde. O jest da UI **não** faz type-check estrito de template — este passo é o que pega erro de binding.

- [ ] **Step 8: Commit**

```bash
git add apps/ui-financial/src/app/features/expense-drawer
git commit -F - <<'EOF'
feat(ui-financial): wire the drawer 'Aporte' type to goal contributions

The contribution chip had no branch in save(), so picking it silently
created a transaction. It now posts to the goal's contributions endpoint,
with the target goal picked from a chip grid.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 6: Gate da fatia — suíte completa, builds e smoke

**Files:** nenhum. Verificação de fechamento.

- [ ] **Step 1: Suíte completa dos dois apps**

Run: `npx nx test api-financial && npx nx test ui-financial`
Expected: PASS nos dois.

- [ ] **Step 2: Builds**

Run: `npx nx build api-financial && npx nx build ui-financial`
Expected: build verde nos dois.

- [ ] **Step 3: Lint**

Run: `npx nx lint ui-financial`
Expected: "All files pass linting".

- [ ] **Step 4: Confirmar que `goals` saiu do bloco de mocks**

Run: `grep -n "MOCK_" apps/ui-financial/src/app/layout/app-data.service.ts`
Expected: apenas `MOCK_HISTORY`, `MOCK_INCOME_HISTORY` e `CURRENT_MONTH`. **Nenhuma** menção a `MOCK_GOALS`.

- [ ] **Step 5: Smoke manual**

Com o stack rodando e logado:
1. Tela **Metas** lista as metas reais da API, com saldo e barra de progresso coerentes.
2. Drawer → tipo **Aporte** → escolher meta, valor e data → salvar.
3. O saldo da meta **sobe** pelo valor aportado e a tela recarrega sozinha.
4. Conferir que o aporte **não** apareceu na lista de Transações (era o bug antigo).
5. Dashboard: o card de metas reflete o novo saldo.

- [ ] **Step 6: Gate de review**

Rodar `/code-review` sobre o diff da fatia e endereçar os achados.

---

## Self-Review

**Cobertura da spec:**
- §3 Backend (resolve por slug + testes) → Task 1.
- §4 UI: wire types + api service → Task 2; mapper → Task 3; `AppDataService` + shell → Task 4; drawer (D3/D4/D5) → Task 5.
- §5 Testes e gate → distribuídos e consolidados na Task 6.
- `features/goals` não aparece em nenhuma task **de propósito**: já consome `data.goals()` e não precisa de mudança.

**Type consistency:** `wireToGoal` é a única função do mapper (não existe `goalToCreateWire`); `addContribution(slug, amount, date)` tem a mesma assinatura na Task 4 (produz) e na Task 5 (consome); `GoalWire.type` é `'SONHO'|'EMERGENCIA'` no wire e `'sonho'|'emergencia'` no domínio, convertido só no mapper.

**Ponto de atenção conhecido:** o `Goal.id` passa a ser o slug, e o cuid do wire é descartado. Qualquer código futuro que precise do cuid terá de buscá-lo no backend — é o mesmo trade-off já aceito em `Category`.
