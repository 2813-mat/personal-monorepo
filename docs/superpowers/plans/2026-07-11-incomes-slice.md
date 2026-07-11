# Incomes Slice (API ↔ front) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the Incomes resource end-to-end — read real incomes into the `incomes` signal and create incomes through the drawer's "Receita" type — aligning the backend contract to `holder`.

**Architecture:** Backend keeps the `Income` domain entity but renames its member dimension from `memberId` to `holder` (name resolved from the `member` relation, `'shared'` when absent), mirroring the Transactions "holder" contract. The UI adds an `IncomeApiService` + `income.mapper` behind `AppDataService`, loaded on login (no month filter), and branches the drawer's `save()` on the selected type.

**Tech Stack:** NestJS + Prisma (api-financial), Angular standalone + signals (ui-financial), Jest, Nx.

## Global Constraints

- Wire contract for incomes (read + create): `{ id, label, holder, value, date, recurring }`; create wire omits `id`. Copied from spec §3.
- `holder` values are `'Mateus' | 'Thais' | 'shared'` (`Holder` type). `'shared'` ⇔ no member.
- No month filter on incomes: `GET /incomes` returns all; UI loads once on auth (spec Decision D1).
- Contribution/aporte drawer type stays untouched (Fatia 3 — spec §1).
- TDD per task; commit at the end of each task. Jest does not strict-type-check — `nx build` is the type gate.

---

### Task 1: Backend — align income contract `memberId → holder`

**Files:**
- Modify: `apps/api-financial/src/modules/ledger/income/domain/income.entity.ts`
- Modify: `apps/api-financial/src/modules/ledger/income/domain/income.repository.ts`
- Create: `apps/api-financial/src/modules/ledger/income/infrastructure/income.mapper.ts` (rewrite existing)
- Create: `apps/api-financial/src/modules/ledger/income/infrastructure/income.mapper.spec.ts`
- Modify: `apps/api-financial/src/modules/ledger/income/infrastructure/income.prisma.repository.ts`
- Modify: `apps/api-financial/src/modules/ledger/income/interface/dto/create-income.dto.ts`
- Test: `apps/api-financial/src/modules/ledger/income/application/create-income.usecase.spec.ts`

**Interfaces:**
- Produces: `Income` entity with `IncomeProps { id, label, holder: string, value, date, recurring }` and `toJSON()` returning those props; `CreateIncomeData { label, holder: string, value, date, recurring }`; `IncomeRow = Prisma.IncomeGetPayload<{ include: { member: true } }>`; `toDomain(r: IncomeRow): Income`.
- Consumes: nothing new (base slice).

- [ ] **Step 1: Write the failing infra mapper test**

Create `apps/api-financial/src/modules/ledger/income/infrastructure/income.mapper.spec.ts`:

```ts
import { toDomain, IncomeRow } from './income.mapper';

const baseRow = {
  id: 'i1',
  label: 'Salário',
  value: '5000' as unknown as never,
  date: new Date('2026-05-05T12:00:00Z'),
  recurring: true,
} as unknown as IncomeRow;

describe('income toDomain', () => {
  it('emits member name as holder', () => {
    const row = { ...baseRow, member: { name: 'Thais' } } as unknown as IncomeRow;
    expect(toDomain(row).toJSON().holder).toBe('Thais');
  });

  it('emits "shared" when there is no member', () => {
    const row = { ...baseRow, member: null } as unknown as IncomeRow;
    expect(toDomain(row).toJSON().holder).toBe('shared');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx nx test api-financial --testPathPattern=income.mapper`
Expected: FAIL (`toDomain`/`IncomeRow` not exported with `holder`, or `member` include absent).

- [ ] **Step 3: Rewrite the entity to use `holder`**

Replace `apps/api-financial/src/modules/ledger/income/domain/income.entity.ts` with:

```ts
export interface IncomeProps {
  id: string;
  label: string;
  holder: string;
  value: number;
  date: string;
  recurring: boolean;
}

export class Income {
  constructor(private readonly props: IncomeProps) {
    if (props.value < 0) throw new Error('value não pode ser negativo');
  }
  get id() {
    return this.props.id;
  }
  toJSON(): IncomeProps {
    return { ...this.props };
  }
}
```

- [ ] **Step 4: Rewrite the infra mapper to include `member` and map `holder`**

Replace `apps/api-financial/src/modules/ledger/income/infrastructure/income.mapper.ts` with:

```ts
import { Prisma } from '@prisma/client';
import { Income } from '../domain/income.entity';

export type IncomeRow = Prisma.IncomeGetPayload<{ include: { member: true } }>;

export const toDomain = (r: IncomeRow): Income =>
  new Income({
    id: r.id,
    label: r.label,
    holder: r.member?.name ?? 'shared',
    value: Number(r.value),
    date: r.date.toISOString().slice(0, 10),
    recurring: r.recurring,
  });
```

- [ ] **Step 5: Update the domain repository `CreateIncomeData`**

Replace `apps/api-financial/src/modules/ledger/income/domain/income.repository.ts` with:

```ts
import { Income } from './income.entity';

export interface CreateIncomeData {
  label: string;
  holder: string;
  value: number;
  date: string;
  recurring: boolean;
}

export abstract class IncomeRepository {
  abstract findAll(): Promise<Income[]>;
  abstract create(data: CreateIncomeData): Promise<Income>;
}
```

- [ ] **Step 6: Update the prisma repository (include member, resolve holder→memberId)**

Replace `apps/api-financial/src/modules/ledger/income/infrastructure/income.prisma.repository.ts` with:

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { TenantContext } from '../../../../infrastructure/auth/tenant-context';
import { TenantRepository } from '../../../../infrastructure/auth/tenant-repository.base';
import { CreateIncomeData, IncomeRepository } from '../domain/income.repository';
import { toDomain } from './income.mapper';

const INCLUDE = { member: true } as const;

@Injectable()
export class IncomePrismaRepository extends TenantRepository implements IncomeRepository {
  constructor(prisma: PrismaService, tenant: TenantContext) {
    super(prisma, tenant);
  }

  async findAll() {
    const rows = await this.prisma.income.findMany({
      where: this.scoped(),
      include: INCLUDE,
      orderBy: { date: 'desc' },
    });
    return rows.map(toDomain);
  }

  async create(data: CreateIncomeData) {
    let memberId: string | undefined;
    if (data.holder && data.holder !== 'shared') {
      const member = await this.prisma.member.findFirst({
        where: { householdId: this.householdId, name: data.holder },
      });
      memberId = member?.id;
    }
    const row = await this.prisma.income.create({
      data: {
        householdId: this.householdId,
        label: data.label,
        memberId,
        value: data.value,
        date: new Date(data.date),
        recurring: data.recurring,
      },
      include: INCLUDE,
    });
    return toDomain(row);
  }
}
```

- [ ] **Step 7: Update the create DTO (`holder` required, drop `memberId`)**

Replace `apps/api-financial/src/modules/ledger/income/interface/dto/create-income.dto.ts` with:

```ts
import { IsBoolean, IsDateString, IsNumber, IsString, Min } from 'class-validator';

export class CreateIncomeDto {
  @IsString() label!: string;
  @IsString() holder!: string;
  @IsNumber() @Min(0) value!: number;
  @IsDateString() date!: string;
  @IsBoolean() recurring!: boolean;
}
```

- [ ] **Step 8: Update the usecase spec to use `holder`**

Replace `apps/api-financial/src/modules/ledger/income/application/create-income.usecase.spec.ts` with:

```ts
import { CreateIncomeUseCase } from './create-income.usecase';
import { Income } from '../domain/income.entity';

describe('CreateIncomeUseCase', () => {
  it('cria income via repositório', async () => {
    const repo = {
      create: jest.fn(async (d) => new Income({ id: 'i1', ...d })),
      findAll: jest.fn(),
    };
    const uc = new CreateIncomeUseCase(repo as any);
    const res = await uc.execute({
      label: 'Salário',
      holder: 'Thais',
      value: 5000,
      date: '2026-05-05',
      recurring: true,
    });
    expect(repo.create).toHaveBeenCalled();
    expect(res.toJSON().label).toBe('Salário');
    expect(res.toJSON().holder).toBe('Thais');
  });
});
```

- [ ] **Step 9: Run the income tests**

Run: `npx nx test api-financial --testPathPattern=income`
Expected: PASS (mapper + usecase specs).

- [ ] **Step 10: Type-check the backend build**

Run: `npx nx build api-financial`
Expected: build succeeds (confirms the controller's `.toJSON()` and DI still compile with the new props).

- [ ] **Step 11: Commit**

```bash
git add apps/api-financial/src/modules/ledger/income
git commit -m "feat(api-financial): align income contract memberId->holder"
```

---

### Task 2: UI — wire types + `IncomeApiService`

**Files:**
- Modify: `apps/ui-financial/src/app/core/api/wire.types.ts`
- Create: `apps/ui-financial/src/app/core/api/income-api.service.ts`
- Test: `apps/ui-financial/src/app/core/api/income-api.service.spec.ts`

**Interfaces:**
- Produces: `IncomeWire { id, label, holder, value, date, recurring }`; `CreateIncomeWire { label, holder, value, date, recurring }`; `IncomeApiService.list(): Observable<IncomeWire[]>`; `IncomeApiService.create(body: CreateIncomeWire): Observable<IncomeWire>`.
- Consumes: `environment.apiBaseUrl`.

- [ ] **Step 1: Write the failing API service test**

Create `apps/ui-financial/src/app/core/api/income-api.service.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { IncomeApiService } from './income-api.service';
import { environment } from '../../../environments/environment';

describe('IncomeApiService', () => {
  let service: IncomeApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [IncomeApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(IncomeApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('GETs incomes without params', () => {
    service.list().subscribe();
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/incomes`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('POSTs a new income', () => {
    const body = { label: 'Salário', holder: 'Thais', value: 5000, date: '2026-05-05', recurring: true };
    service.create(body).subscribe();
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/incomes`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({ id: 'i1', ...body });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx nx test ui-financial --testPathPattern=income-api`
Expected: FAIL (`IncomeApiService` does not exist).

- [ ] **Step 3: Add the wire types**

Append to `apps/ui-financial/src/app/core/api/wire.types.ts`:

```ts
export interface IncomeWire {
  id: string;
  label: string;
  holder: string;
  value: number;
  date: string;
  recurring: boolean;
}

export interface CreateIncomeWire {
  label: string;
  holder: string;
  value: number;
  date: string;
  recurring: boolean;
}
```

- [ ] **Step 4: Create the API service**

Create `apps/ui-financial/src/app/core/api/income-api.service.ts`:

```ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { IncomeWire, CreateIncomeWire } from './wire.types';

@Injectable({ providedIn: 'root' })
export class IncomeApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/incomes`;

  list(): Observable<IncomeWire[]> {
    return this.http.get<IncomeWire[]>(this.base);
  }

  create(body: CreateIncomeWire): Observable<IncomeWire> {
    return this.http.post<IncomeWire>(this.base, body);
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx nx test ui-financial --testPathPattern=income-api`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/ui-financial/src/app/core/api/wire.types.ts apps/ui-financial/src/app/core/api/income-api.service.ts apps/ui-financial/src/app/core/api/income-api.service.spec.ts
git commit -m "feat(ui-financial): add IncomeApiService and income wire types"
```

---

### Task 3: UI — `income.mapper`

**Files:**
- Create: `apps/ui-financial/src/app/core/api/income.mapper.ts`
- Test: `apps/ui-financial/src/app/core/api/income.mapper.spec.ts`

**Interfaces:**
- Consumes: `IncomeWire`, `CreateIncomeWire` (Task 2); `Income`, `Holder` from `@caixa-familia/shared-types`.
- Produces: `wireToIncome(w: IncomeWire): Income`; `incomeToCreateWire(i: Income): CreateIncomeWire`.

- [ ] **Step 1: Write the failing mapper test**

Create `apps/ui-financial/src/app/core/api/income.mapper.spec.ts`:

```ts
import { wireToIncome, incomeToCreateWire } from './income.mapper';
import type { IncomeWire } from './wire.types';
import type { Income } from '@caixa-familia/shared-types';

const wire: IncomeWire = {
  id: 'i1',
  label: 'Salário',
  holder: 'Thais',
  value: 5000,
  date: '2026-05-05',
  recurring: true,
};

describe('wireToIncome', () => {
  it('maps wire to domain Income', () => {
    expect(wireToIncome(wire)).toEqual({
      id: 'i1',
      label: 'Salário',
      holder: 'Thais',
      value: 5000,
      date: '2026-05-05',
      recurring: true,
    });
  });
});

describe('incomeToCreateWire', () => {
  it('drops id and maps to create wire', () => {
    const income: Income = {
      id: 'i1',
      label: 'Salário',
      holder: 'Thais',
      value: 5000,
      date: '2026-05-05',
      recurring: true,
    };
    expect(incomeToCreateWire(income)).toEqual({
      label: 'Salário',
      holder: 'Thais',
      value: 5000,
      date: '2026-05-05',
      recurring: true,
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx nx test ui-financial --testPathPattern=income.mapper`
Expected: FAIL (`income.mapper` does not exist).

- [ ] **Step 3: Create the mapper**

Create `apps/ui-financial/src/app/core/api/income.mapper.ts`:

```ts
import type { Income, Holder } from '@caixa-familia/shared-types';
import type { IncomeWire, CreateIncomeWire } from './wire.types';

export function wireToIncome(w: IncomeWire): Income {
  return {
    id: w.id,
    label: w.label,
    holder: w.holder as Holder,
    value: w.value,
    date: w.date,
    recurring: w.recurring,
  };
}

export function incomeToCreateWire(i: Income): CreateIncomeWire {
  return {
    label: i.label,
    holder: i.holder,
    value: i.value,
    date: i.date,
    recurring: i.recurring,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx nx test ui-financial --testPathPattern=income.mapper`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/ui-financial/src/app/core/api/income.mapper.ts apps/ui-financial/src/app/core/api/income.mapper.spec.ts
git commit -m "feat(ui-financial): add income wire<->domain mapper"
```

---

### Task 4: UI — `AppDataService` load/create incomes + generalize `fail()`

**Files:**
- Modify: `apps/ui-financial/src/app/layout/app-data.service.ts`
- Test: `apps/ui-financial/src/app/layout/app-data.service.spec.ts`

**Interfaces:**
- Consumes: `IncomeApiService` (Task 2); `wireToIncome`, `incomeToCreateWire` (Task 3); `Income` from shared-types.
- Produces: `AppDataService.incomes: Signal<Income[]>`; `incomesLoading`, `incomesError` signals; `loadIncomes(): void`; `createIncome(i: Income): void`; `fail(message, errorSignal)` new signature.

- [ ] **Step 1: Update the existing spec (add income provider) and add the loadIncomes test**

Replace `apps/ui-financial/src/app/layout/app-data.service.spec.ts` with:

```ts
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AppDataService } from './app-data.service';
import { TransactionApiService } from '../core/api/transaction-api.service';
import { CatalogApiService } from '../core/api/catalog-api.service';
import { IncomeApiService } from '../core/api/income-api.service';
import type { TransactionWire, IncomeWire } from '../core/api/wire.types';

const wire: TransactionWire = {
  id: 't1',
  date: '2026-05-10',
  label: 'Mercado',
  value: 100,
  categorySlug: 'mercado',
  holder: 'Mateus',
  method: 'PIX',
  cardId: null,
  recurring: false,
  installments: null,
};

const incomeWire: IncomeWire = {
  id: 'i1',
  label: 'Salário',
  holder: 'Thais',
  value: 5000,
  date: '2026-05-05',
  recurring: true,
};

function setup(overrides: {
  txList?: jest.Mock;
  incList?: jest.Mock;
} = {}) {
  const txApi = { list: overrides.txList ?? jest.fn(() => of([wire])), create: jest.fn(), remove: jest.fn() };
  const catApi = { listCategories: jest.fn(() => of([])), listCards: jest.fn(() => of([])) };
  const incApi = { list: overrides.incList ?? jest.fn(() => of([incomeWire])), create: jest.fn(() => of(incomeWire)) };
  TestBed.configureTestingModule({
    providers: [
      AppDataService,
      { provide: TransactionApiService, useValue: txApi },
      { provide: CatalogApiService, useValue: catApi },
      { provide: IncomeApiService, useValue: incApi },
    ],
  });
  return { svc: TestBed.inject(AppDataService), txApi, incApi };
}

describe('AppDataService.loadTransactions', () => {
  it('fills the transactions signal with mapped domain objects', () => {
    const { svc, txApi } = setup();
    svc.loadTransactions();
    expect(txApi.list).toHaveBeenCalledWith(
      expect.objectContaining({ year: svc.currentMonth().year, month: svc.currentMonth().month }),
    );
    expect(svc.transactions()[0]).toMatchObject({ id: 't1', cat: 'mercado', holder: 'Mateus', method: 'pix' });
    expect(svc.transactionsLoading()).toBe(false);
  });
});

describe('AppDataService.loadIncomes', () => {
  it('fills the incomes signal with mapped domain objects', () => {
    const { svc, incApi } = setup();
    svc.loadIncomes();
    expect(incApi.list).toHaveBeenCalled();
    expect(svc.incomes()[0]).toMatchObject({ id: 'i1', holder: 'Thais', value: 5000 });
    expect(svc.incomesLoading()).toBe(false);
  });
});

describe('AppDataService.createIncome', () => {
  it('reloads incomes after a successful create', () => {
    const { svc, incApi } = setup();
    svc.createIncome({ id: '', label: 'Bônus', holder: 'Mateus', value: 200, date: '2026-05-20', recurring: false });
    expect(incApi.create).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'Bônus', holder: 'Mateus', value: 200 }),
    );
    expect(incApi.list).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx nx test ui-financial --testPathPattern=app-data`
Expected: FAIL (`loadIncomes`/`createIncome`/`incomesLoading` do not exist; `IncomeApiService` not injected).

- [ ] **Step 3: Update `AppDataService`**

In `apps/ui-financial/src/app/layout/app-data.service.ts` apply these edits.

Update the imports at the top:

```ts
import { Injectable, signal, computed, inject, type WritableSignal } from '@angular/core';
import type { Card, Category, HolderFilter, Income, MonthContext, Transaction } from '@caixa-familia/shared-types';
import {
  MOCK_GOALS,
  MOCK_FIXED,
  MOCK_HISTORY,
  MOCK_INCOME_HISTORY,
  CURRENT_MONTH,
} from '@caixa-familia/shared-mocks';
import { TransactionApiService } from '../core/api/transaction-api.service';
import { CatalogApiService } from '../core/api/catalog-api.service';
import { IncomeApiService } from '../core/api/income-api.service';
import { wireToTransaction, transactionToCreateWire } from '../core/api/transaction.mapper';
import { wireToCategory } from '../core/api/catalog.mapper';
import { wireToIncome, incomeToCreateWire } from '../core/api/income.mapper';
import { ToastService } from '../ui/toast/toast.service';
```

Add the injected service next to the others:

```ts
  private incApi = inject(IncomeApiService);
```

Replace the `fail()` method with the generalized version:

```ts
  private fail(message: string, errorSignal: WritableSignal<string | null>): void {
    errorSignal.set(message);
    this.toast.show(message, 'neg');
  }
```

Change the `incomes` signal from mock to real and drop the `MOCK_INCOMES` line:

```ts
  readonly incomes = signal<Income[]>([]);
```

Add the loading/error signals near `transactionsLoading`/`transactionsError`:

```ts
  readonly incomesLoading = signal(false);
  readonly incomesError = signal<string | null>(null);
```

Update the two existing tx error calls to pass the signal — in `loadTransactions` error handler:

```ts
        this.fail('Falha ao carregar transações', this.transactionsError);
```

in `createTransaction` error handler:

```ts
      error: () => this.fail('Falha ao criar transação', this.transactionsError),
```

in `removeTransaction` error handler:

```ts
      error: () => this.fail('Falha ao remover transação', this.transactionsError),
```

Add the income methods after `removeTransaction`:

```ts
  loadIncomes(): void {
    this.incomesLoading.set(true);
    this.incomesError.set(null);
    this.incApi.list().subscribe({
      next: (rows) => {
        this.incomes.set(rows.map(wireToIncome));
        this.incomesLoading.set(false);
      },
      error: () => {
        this.fail('Falha ao carregar receitas', this.incomesError);
        this.incomesLoading.set(false);
      },
    });
  }

  createIncome(i: Income): void {
    this.incApi.create(incomeToCreateWire(i)).subscribe({
      next: () => this.loadIncomes(),
      error: () => this.fail('Falha ao criar receita', this.incomesError),
    });
  }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx nx test ui-financial --testPathPattern=app-data`
Expected: PASS (all three describe blocks).

- [ ] **Step 5: Commit**

```bash
git add apps/ui-financial/src/app/layout/app-data.service.ts apps/ui-financial/src/app/layout/app-data.service.spec.ts
git commit -m "feat(ui-financial): load and create incomes via AppDataService"
```

---

### Task 5: UI — trigger `loadIncomes()` on auth in the shell

**Files:**
- Modify: `apps/ui-financial/src/app/layout/app-shell.component.ts:24-26`

**Interfaces:**
- Consumes: `AppDataService.loadIncomes()` (Task 4).
- Produces: incomes are loaded once the user authenticates (no month dependency).

- [ ] **Step 1: Add the load call to the auth effect**

In `apps/ui-financial/src/app/layout/app-shell.component.ts`, replace:

```ts
    // Load the catalog once the user is authenticated.
    effect(() => {
      if (this.auth.isAuthenticated()) this.data.loadCatalog();
    });
```

with:

```ts
    // Load the catalog and incomes once the user is authenticated.
    effect(() => {
      if (this.auth.isAuthenticated()) {
        this.data.loadCatalog();
        this.data.loadIncomes();
      }
    });
```

- [ ] **Step 2: Type-check the UI build**

Run: `npx nx build ui-financial`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add apps/ui-financial/src/app/layout/app-shell.component.ts
git commit -m "feat(ui-financial): load incomes on authentication"
```

---

### Task 6: UI — create income from the drawer + per-type validation

**Files:**
- Modify: `apps/ui-financial/src/app/features/expense-drawer/expense-drawer.component.ts`

**Interfaces:**
- Consumes: `AppDataService.createIncome(i: Income)` (Task 4); `Income` from shared-types.
- Produces: drawer `save()` routes `type === 'income'` to `createIncome`; `cat` is not required when type is `'income'`.

> Note: the repo has no unit spec for this drawer (verified — only `.html`/`.scss`/`.ts`), so this task is verified by `nx build` + the manual smoke in Task 7. The create path itself is already covered by the `AppDataService.createIncome` test in Task 4.

- [ ] **Step 1: Import the `Income` type**

In `apps/ui-financial/src/app/features/expense-drawer/expense-drawer.component.ts`, change the shared-types import:

```ts
import type { Holder, Income, Transaction } from '@caixa-familia/shared-types';
```

- [ ] **Step 2: Toggle the `cat` validator when the type changes**

Add a constructor to the `ExpenseDrawerComponent` class (place it above `stepInstallments`):

```ts
  constructor() {
    this.form.controls.type.valueChanges.subscribe((type) => {
      const cat = this.form.controls.cat;
      if (type === 'income') {
        cat.clearValidators();
      } else {
        cat.setValidators([Validators.required]);
      }
      cat.updateValueAndValidity();
    });
  }
```

- [ ] **Step 3: Branch `save()` on the selected type**

Replace the `save()` method with:

```ts
  save() {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();

    if (v.type === 'income') {
      const income: Income = {
        id: '', // server assigns
        label: v.label,
        holder: v.holder,
        value: Number(v.value),
        date: v.date,
        recurring: v.recurring,
      };
      this.data.createIncome(income);
      this.onClose();
      return;
    }

    const tx: Transaction = {
      id: '', // server assigns
      date: v.date,
      label: v.label,
      value: Number(v.value),
      cat: v.cat,
      holder: v.holder,
      method: v.method,
      installments: v.installments.enabled ? { n: 1, of: Number(v.installments.total) } : null,
      recurring: v.recurring,
    };
    this.data.createTransaction(tx);
    this.onClose();
  }
```

- [ ] **Step 4: Type-check the UI build**

Run: `npx nx build ui-financial`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add apps/ui-financial/src/app/features/expense-drawer/expense-drawer.component.ts
git commit -m "feat(ui-financial): create income from the drawer 'Receita' type"
```

---

### Task 7: Full verification gate + manual smoke

**Files:** none (verification only).

- [ ] **Step 1: Run the full test suites**

Run: `npx nx test api-financial && npx nx test ui-financial`
Expected: all suites PASS.

- [ ] **Step 2: Run both production builds**

Run: `npx nx build api-financial && npx nx build ui-financial`
Expected: both builds succeed (type gate — jest does not strict-type-check).

- [ ] **Step 3: Manual smoke against the running stack**

Start the stack (`docker-compose up` + the apps as per README), then:
1. Log in via Keycloak as an editor/admin user.
2. Confirm the Dashboard income total reflects real `GET /incomes` data (not the old mock values `1700` / `5793.69` unless those rows exist in the DB).
3. Open the drawer (top bar "+"), pick **Receita**, fill value/description/date/holder (no category needed), save.
4. Confirm no error toast and that the new income is reflected after reload (income total updates).
5. Log in as a viewer (or no write role) and confirm the "+" button is hidden (write gate).

- [ ] **Step 4: (Optional) run /code-review as the merge gate**

Run the `/code-review` slash command on the branch diff and address any findings before opening the PR.

---

## Self-Review Notes

- **Spec coverage:** §3 backend alignment → Task 1; §4 wire+service → Task 2, mapper → Task 3, AppDataService+`fail()` refactor → Task 4, shell load → Task 5; §5 drawer create + per-type validation → Task 6; §6 tests/build/smoke gate → Tasks 1–7. Decision D1 (no month filter) reflected in Task 2 (`list()` has no params) and Task 5 (loaded in the auth effect, not the month effect). D3 (write gate) verified in Task 7 Step 3.5 (already enforced by the topbar; no code task needed).
- **Placeholder scan:** none — every code step carries full code.
- **Type consistency:** `holder: string` on the wire/DTO/entity/`CreateIncomeData`; `Income.holder` is `Holder` in the UI domain (mapper casts `w.holder as Holder`). `IncomeApiService.list()/create()`, `wireToIncome`/`incomeToCreateWire`, `loadIncomes`/`createIncome`, and the `fail(message, errorSignal)` signature are used identically across tasks.
