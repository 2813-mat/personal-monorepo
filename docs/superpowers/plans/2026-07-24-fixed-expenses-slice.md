# Fatia 2 — Fixed expenses (API ↔ front) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o recurso `fixed` da UI deixar de ser mock — lendo `GET /fixed-expenses?year&month` com status pago/pendente real — e permitir cadastrar um gasto fixo pelo drawer via `POST /fixed-expenses`.

**Architecture:** Repete o padrão já provado nas fatias de Transactions e Incomes. No backend, o módulo `budgeting/fixed-expense` troca `memberId` (cuid) por `holder` (nome) no wire, como já fazem `transaction` e `income`. Na UI, entra o par `fixed-api.service.ts` + `fixed.mapper.ts` em `app/core/api/`, o `AppDataService` ganha `loadFixed()`/`createFixed()` e o `AppShell` passa a recarregar fixos quando o mês muda (porque `paidThisMonth` é relativo ao mês).

**Tech Stack:** Nx 22 monorepo · NestJS 11 + Prisma (api-financial) · Angular 21 standalone + signals (ui-financial) · Jest 30 · libs `shared-types`, `shared-mocks`.

**Spec:** `docs/superpowers/specs/2026-07-11-fixed-expenses-slice-design.md`
**Umbrella:** `docs/superpowers/specs/2026-07-11-api-front-migration-umbrella.md`

## Global Constraints

- **Contrato member → holder.** Recursos com dimensão de membro expõem `holder` (nome) no wire, nunca `memberId` (cuid). O mapper/view inclui a relação `member` e emite `holder = member?.name ?? 'shared'`; o `create` resolve `holder → memberId` por nome, e `'shared'` vira `undefined`.
- **Camada de dados na UI.** Por recurso: `app/core/api/<recurso>-api.service.ts` (tipado pelo wire, testado com `HttpTestingController`) + `app/core/api/<recurso>.mapper.ts` (wire ↔ shared-types, com unit test). `AppDataService` é a fachada de signals.
- **Erro/loading.** Cada recurso tem `<recurso>Loading` / `<recurso>Error`; falhas passam por `AppDataService.fail(message, errorSignal)`, que seta o signal e dispara toast `neg`.
- **Gate de write.** Escrita protegida por `auth.canWrite()` na UI e `@Roles('admin','editor')` no backend. Não mexer nesses gates nesta fatia.
- **YAGNI de filtro.** Filtros de holder/categoria/busca continuam client-side.
- **Fora de escopo:** editar/remover gasto fixo; marcar pago manualmente; vincular `fixedExpenseId` na criação de transação.
- **Comandos:** `npx nx test <projeto>`, `npx nx build <projeto>`. Jest 30 usa `--testPathPatterns` (plural).
- **Branch:** trabalhar direto em `master` (decisão do usuário nesta sessão).

## File Structure

**Backend (`apps/api-financial/src/modules/budgeting/fixed-expense/`)**
- `domain/fixed-expense.repository.ts` — contrato: `FixedExpenseView.holder`, `CreateFixedExpenseData.holder`.
- `infrastructure/fixed-expense.mapper.ts` — `toView` emite `holder`; row passa a incluir `member`.
- `infrastructure/fixed-expense.prisma.repository.ts` — `include: { category, member }`; `create` resolve nome → id.
- `interface/dto/create-fixed-expense.dto.ts` — `holder` obrigatório no lugar de `memberId` opcional.
- `application/list-fixed-expenses.usecase.spec.ts` — fixtures passam a usar `holder`.

**Libs**
- `libs/shared-types/src/lib/finance.types.ts` — `FixedExpense.paidThisMonth`.
- `libs/shared-mocks/src/lib/*.ts` — `MOCK_FIXED` ganha o campo novo (senão a lib não compila).

**UI (`apps/ui-financial/src/app/`)**
- `core/api/wire.types.ts` — `FixedExpenseWire`, `CreateFixedExpenseWire`.
- `core/api/fixed-api.service.ts` (novo) — só HTTP.
- `core/api/fixed.mapper.ts` (novo) — só tradução wire ↔ domínio.
- `layout/app-data.service.ts` — `loadFixed()`, `createFixed()`, signals de loading/erro.
- `layout/app-shell.component.ts` — dispara `loadFixed()` no effect que reage ao mês.
- `features/fixed/fixed.component.ts` — consome `paidThisMonth` em vez da heurística por valor.
- `features/expense-drawer/expense-drawer.component.{ts,html}` — tipo `'fixed'` + campo `dueDay`.

---

### Task 1: Backend — alinhar contrato `memberId → holder`

**Files:**
- Modify: `apps/api-financial/src/modules/budgeting/fixed-expense/domain/fixed-expense.repository.ts`
- Modify: `apps/api-financial/src/modules/budgeting/fixed-expense/infrastructure/fixed-expense.mapper.ts`
- Modify: `apps/api-financial/src/modules/budgeting/fixed-expense/infrastructure/fixed-expense.prisma.repository.ts`
- Modify: `apps/api-financial/src/modules/budgeting/fixed-expense/interface/dto/create-fixed-expense.dto.ts`
- Modify: `apps/api-financial/src/modules/budgeting/fixed-expense/application/list-fixed-expenses.usecase.spec.ts:7-8`
- Test: `apps/api-financial/src/modules/budgeting/fixed-expense/infrastructure/fixed-expense.mapper.spec.ts` (novo)

**Interfaces:**
- Consumes: nada (primeira task).
- Produces: wire de leitura `{ id: string; label: string; value: number; dueDay: number; categorySlug: string; holder: string; paidThisMonth: boolean }` e wire de criação `{ label: string; value: number; dueDay: number; categorySlug: string; holder: string }`. As Tasks 3–5 dependem exatamente destes nomes.

- [ ] **Step 1: Escrever o teste que falha (mapper)**

Criar `apps/api-financial/src/modules/budgeting/fixed-expense/infrastructure/fixed-expense.mapper.spec.ts`:

```typescript
import { toView } from './fixed-expense.mapper';
import type { FixedExpenseRow } from './fixed-expense.mapper';

const baseRow = {
  id: 'f1',
  label: 'Aluguel',
  value: 2000,
  dueDay: 5,
  householdId: 'h1',
  categoryId: 'c1',
  memberId: null,
  category: { id: 'c1', slug: 'moradia', label: 'Moradia', color: '#000', budget: 0, householdId: 'h1' },
  member: null,
} as unknown as FixedExpenseRow;

describe('toView', () => {
  it('emits the member name as holder', () => {
    const row = { ...baseRow, member: { id: 'm1', name: 'Mateus', householdId: 'h1' } } as unknown as FixedExpenseRow;
    expect(toView(row, false).holder).toBe('Mateus');
  });

  it('falls back to "shared" when there is no member', () => {
    expect(toView(baseRow, false).holder).toBe('shared');
  });

  it('does not leak memberId into the view', () => {
    expect(toView(baseRow, false)).not.toHaveProperty('memberId');
  });

  it('carries paidThisMonth through', () => {
    expect(toView(baseRow, true).paidThisMonth).toBe(true);
    expect(toView(baseRow, false).paidThisMonth).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx nx test api-financial --testPathPatterns=fixed-expense.mapper`
Expected: FAIL — `holder` é `undefined` e a propriedade `memberId` ainda existe.

- [ ] **Step 3: Trocar o contrato no domínio**

Em `domain/fixed-expense.repository.ts`, substituir os campos de membro:

```typescript
export interface FixedExpenseView {
  id: string;
  label: string;
  value: number;
  dueDay: number;
  categorySlug: string;
  holder: string;
  paidThisMonth: boolean;
}

export interface CreateFixedExpenseData {
  label: string;
  value: number;
  dueDay: number;
  categorySlug: string;
  holder: string;
}

export abstract class FixedExpenseRepository {
  abstract findAllWithStatus(year: number, month: number): Promise<FixedExpenseView[]>;
  abstract create(data: CreateFixedExpenseData): Promise<FixedExpenseView>;
}
```

- [ ] **Step 4: Emitir `holder` no mapper**

Substituir todo o conteúdo de `infrastructure/fixed-expense.mapper.ts`:

```typescript
import { Prisma } from '@prisma/client';
import { FixedExpenseView } from '../domain/fixed-expense.repository';

export type FixedExpenseRow = Prisma.FixedExpenseGetPayload<{
  include: { category: true; member: true };
}>;

export const toView = (r: FixedExpenseRow, paidThisMonth: boolean): FixedExpenseView => ({
  id: r.id,
  label: r.label,
  value: Number(r.value),
  dueDay: r.dueDay,
  categorySlug: r.category.slug,
  holder: r.member?.name ?? 'shared',
  paidThisMonth,
});
```

- [ ] **Step 5: Incluir `member` no repositório e resolver `holder → memberId`**

Em `infrastructure/fixed-expense.prisma.repository.ts`, no `findAllWithStatus`, trocar o include (linha ~21):

```typescript
      include: { category: true, member: true },
```

E no `create`, resolver o nome antes de gravar e incluir `member` no retorno (mesmo padrão de `IncomePrismaRepository.create`):

```typescript
  async create(data: CreateFixedExpenseData): Promise<FixedExpenseView> {
    const category = await this.prisma.category.findFirstOrThrow({
      where: { householdId: this.householdId, slug: data.categorySlug },
    });
    let memberId: string | undefined;
    if (data.holder && data.holder !== 'shared') {
      const member = await this.prisma.member.findFirst({
        where: { householdId: this.householdId, name: data.holder },
      });
      memberId = member?.id;
    }
    const row = await this.prisma.fixedExpense.create({
      data: {
        householdId: this.householdId,
        categoryId: category.id,
        memberId,
        label: data.label,
        value: data.value,
        dueDay: data.dueDay,
      },
      include: { category: true, member: true },
    });
    return toView(row, false);
  }
```

Nota: manter o resto do corpo do `create` como está hoje se ele já fizer algo além disso — a única mudança obrigatória é `memberId` resolvido por nome e o `include` com `member`.

- [ ] **Step 6: Trocar o campo no DTO**

Em `interface/dto/create-fixed-expense.dto.ts`:

```typescript
import { IsInt, IsNumber, IsString, Max, Min } from 'class-validator';

export class CreateFixedExpenseDto {
  @IsString() label!: string;
  @IsNumber() @Min(0) value!: number;
  @IsInt() @Min(1) @Max(31) dueDay!: number;
  @IsString() categorySlug!: string;
  @IsString() holder!: string;
}
```

- [ ] **Step 7: Atualizar as fixtures do usecase spec**

Em `application/list-fixed-expenses.usecase.spec.ts:7-8`, trocar `memberId: null` por `holder`:

```typescript
      { id: 'f1', label: 'Aluguel', value: 2000, dueDay: 5, categorySlug: 'moradia', holder: 'shared', paidThisMonth: true },
      { id: 'f2', label: 'Internet', value: 100, dueDay: 10, categorySlug: 'moradia', holder: 'Mateus', paidThisMonth: false },
```

- [ ] **Step 8: Rodar os testes do módulo e confirmar que passam**

Run: `npx nx test api-financial --testPathPatterns=fixed-expense`
Expected: PASS — mapper spec (4 testes) e usecase spec verdes.

- [ ] **Step 9: Confirmar que nada mais no backend cita `memberId` do módulo**

Run: `npx nx test api-financial`
Expected: PASS na suíte inteira. Se algum teste de outro módulo quebrar citando `memberId` de fixed expense, corrigir para `holder` antes de seguir.

- [ ] **Step 10: Commit**

```bash
git add apps/api-financial/src/modules/budgeting/fixed-expense
git commit -m "feat(api-financial): expose fixed expense holder instead of memberId"
```

---

### Task 2: Shared-types — `paidThisMonth` no `FixedExpense`

**Files:**
- Modify: `libs/shared-types/src/lib/finance.types.ts:38-45`
- Modify: `libs/shared-mocks/src/lib/` (o arquivo que declara `MOCK_FIXED`, linhas 39-50)

**Interfaces:**
- Consumes: nada.
- Produces: `FixedExpense { id, label, value, due, cat, holder, paidThisMonth: boolean }` — Tasks 4, 6 e 7 dependem do campo `paidThisMonth`.

- [ ] **Step 1: Adicionar o campo ao tipo**

Em `libs/shared-types/src/lib/finance.types.ts`, o `FixedExpense` passa a ser:

```typescript
export interface FixedExpense {
  id: Id;
  label: string;
  value: number;
  due: number;
  cat: Id;
  holder: Holder;
  paidThisMonth: boolean;
}
```

- [ ] **Step 2: Rodar o build da lib e ver a quebra esperada**

Run: `npx nx test ui-financial --testPathPatterns=fixed`
Expected: FAIL de type-check — `MOCK_FIXED` e as fixtures de `fixed.component.spec.ts` não têm `paidThisMonth`. É exatamente a quebra que a Step 3 conserta (a fixture do spec é corrigida na Task 6).

- [ ] **Step 3: Completar `MOCK_FIXED`**

Localizar o arquivo com `export const MOCK_FIXED` (`grep -rn "MOCK_FIXED" libs/shared-mocks/src`) e adicionar `paidThisMonth` em cada entrada. Os três primeiros itens ficam como pagos para o mock continuar contando uma história plausível:

```typescript
export const MOCK_FIXED: FixedExpense[] = [
  { id: 'f-clube', label: 'Clubinho almoço',  value: 1300.00, due: 5,  cat: 'mercado', holder: 'shared', paidThisMonth: true  },
  { id: 'f-luz',   label: 'Conta de Luz',     value:  550.91, due: 10, cat: 'casa',    holder: 'shared', paidThisMonth: true  },
  { id: 'f-alug',  label: 'Aluguel + IPTU',   value:  150.00, due: 10, cat: 'casa',    holder: 'shared', paidThisMonth: true  },
  { id: 'f-imp',   label: 'Imposto PJ',       value:  540.00, due: 20, cat: 'casa',    holder: 'Mateus', paidThisMonth: false },
  { id: 'f-hon',   label: 'Honorários',       value:  300.00, due: 20, cat: 'casa',    holder: 'Mateus', paidThisMonth: false },
  { id: 'f-net',   label: 'Internet',         value:  114.90, due: 15, cat: 'assin',   holder: 'shared', paidThisMonth: false },
  { id: 'f-corte', label: 'Corte (Mateus)',   value:   80.00, due: 25, cat: 'pessoal', holder: 'Mateus', paidThisMonth: false },
  { id: 'f-unha',  label: 'Unha (Thais)',     value:   50.00, due: 22, cat: 'pessoal', holder: 'Thais',  paidThisMonth: false },
  { id: 'f-facT',  label: 'Faculdade Thais',  value:  711.45, due: 12, cat: 'educ',    holder: 'Thais',  paidThisMonth: false },
  { id: 'f-facM',  label: 'Faculdade Mateus', value:  202.34, due: 12, cat: 'educ',    holder: 'Mateus', paidThisMonth: false },
];
```

- [ ] **Step 4: Confirmar que as libs compilam**

Run: `npx tsc -p libs/shared-mocks/tsconfig.lib.json --noEmit`
Expected: sem erros. (Se o tsconfig tiver outro nome, usar `npx nx build shared-mocks`.)

- [ ] **Step 5: Commit**

```bash
git add libs/shared-types libs/shared-mocks
git commit -m "feat(shared-types): add paidThisMonth to FixedExpense"
```

---

### Task 3: UI — wire types + `FixedApiService`

**Files:**
- Modify: `apps/ui-financial/src/app/core/api/wire.types.ts`
- Create: `apps/ui-financial/src/app/core/api/fixed-api.service.ts`
- Test: `apps/ui-financial/src/app/core/api/fixed-api.service.spec.ts`

**Interfaces:**
- Consumes: o wire definido na Task 1.
- Produces: `FixedApiService.list(params: { year: number; month: number }): Observable<FixedExpenseWire[]>` e `FixedApiService.create(body: CreateFixedExpenseWire): Observable<FixedExpenseWire>`. A Task 5 injeta esse serviço.

- [ ] **Step 1: Escrever o teste que falha**

Criar `apps/ui-financial/src/app/core/api/fixed-api.service.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FixedApiService } from './fixed-api.service';
import { environment } from '../../../environments/environment';

describe('FixedApiService', () => {
  let service: FixedApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FixedApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(FixedApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('GETs fixed expenses with year and month params', () => {
    service.list({ year: 2026, month: 5 }).subscribe();
    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiBaseUrl}/fixed-expenses`,
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('year')).toBe('2026');
    expect(req.request.params.get('month')).toBe('5');
    req.flush([]);
  });

  it('POSTs a new fixed expense', () => {
    const body = { label: 'Aluguel', value: 2000, dueDay: 5, categorySlug: 'casa', holder: 'shared' };
    service.create(body).subscribe();
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/fixed-expenses`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({ id: 'f1', ...body, paidThisMonth: false });
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx nx test ui-financial --testPathPatterns=fixed-api.service`
Expected: FAIL — `Cannot find module './fixed-api.service'`.

- [ ] **Step 3: Adicionar os wire types**

Acrescentar ao final de `apps/ui-financial/src/app/core/api/wire.types.ts`:

```typescript
export interface FixedExpenseWire {
  id: string;
  label: string;
  value: number;
  dueDay: number;
  categorySlug: string;
  holder: string;
  paidThisMonth: boolean;
}

export interface CreateFixedExpenseWire {
  label: string;
  value: number;
  dueDay: number;
  categorySlug: string;
  holder: string;
}
```

- [ ] **Step 4: Escrever o serviço**

Criar `apps/ui-financial/src/app/core/api/fixed-api.service.ts`:

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { FixedExpenseWire, CreateFixedExpenseWire } from './wire.types';

@Injectable({ providedIn: 'root' })
export class FixedApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/fixed-expenses`;

  list(params: { year: number; month: number }): Observable<FixedExpenseWire[]> {
    const hp = new HttpParams().set('year', params.year).set('month', params.month);
    return this.http.get<FixedExpenseWire[]>(this.base, { params: hp });
  }

  create(body: CreateFixedExpenseWire): Observable<FixedExpenseWire> {
    return this.http.post<FixedExpenseWire>(this.base, body);
  }
}
```

- [ ] **Step 5: Rodar o teste e confirmar que passa**

Run: `npx nx test ui-financial --testPathPatterns=fixed-api.service`
Expected: PASS — 2 testes.

- [ ] **Step 6: Commit**

```bash
git add apps/ui-financial/src/app/core/api/wire.types.ts apps/ui-financial/src/app/core/api/fixed-api.service.ts apps/ui-financial/src/app/core/api/fixed-api.service.spec.ts
git commit -m "feat(ui-financial): add FixedApiService"
```

---

### Task 4: UI — `fixed.mapper`

**Files:**
- Create: `apps/ui-financial/src/app/core/api/fixed.mapper.ts`
- Test: `apps/ui-financial/src/app/core/api/fixed.mapper.spec.ts`

**Interfaces:**
- Consumes: `FixedExpenseWire`/`CreateFixedExpenseWire` (Task 3); `FixedExpense` com `paidThisMonth` (Task 2).
- Produces: `wireToFixed(w: FixedExpenseWire): FixedExpense` e `fixedToCreateWire(f: FixedExpense): CreateFixedExpenseWire`. A Task 5 importa os dois.

- [ ] **Step 1: Escrever o teste que falha**

Criar `apps/ui-financial/src/app/core/api/fixed.mapper.spec.ts`:

```typescript
import { wireToFixed, fixedToCreateWire } from './fixed.mapper';
import type { FixedExpenseWire } from './wire.types';
import type { FixedExpense } from '@caixa-familia/shared-types';

const wire: FixedExpenseWire = {
  id: 'f1',
  label: 'Aluguel',
  value: 2000,
  dueDay: 5,
  categorySlug: 'casa',
  holder: 'Mateus',
  paidThisMonth: true,
};

describe('wireToFixed', () => {
  it('maps dueDay to due and categorySlug to cat', () => {
    expect(wireToFixed(wire)).toEqual({
      id: 'f1',
      label: 'Aluguel',
      value: 2000,
      due: 5,
      cat: 'casa',
      holder: 'Mateus',
      paidThisMonth: true,
    });
  });

  it('keeps the shared holder as-is', () => {
    expect(wireToFixed({ ...wire, holder: 'shared' }).holder).toBe('shared');
  });

  it('carries paidThisMonth false through', () => {
    expect(wireToFixed({ ...wire, paidThisMonth: false }).paidThisMonth).toBe(false);
  });
});

describe('fixedToCreateWire', () => {
  it('drops id and paidThisMonth, and renames due/cat', () => {
    const fixed: FixedExpense = {
      id: 'f1',
      label: 'Aluguel',
      value: 2000,
      due: 5,
      cat: 'casa',
      holder: 'Mateus',
      paidThisMonth: true,
    };
    expect(fixedToCreateWire(fixed)).toEqual({
      label: 'Aluguel',
      value: 2000,
      dueDay: 5,
      categorySlug: 'casa',
      holder: 'Mateus',
    });
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx nx test ui-financial --testPathPatterns=fixed.mapper`
Expected: FAIL — `Cannot find module './fixed.mapper'`.

- [ ] **Step 3: Escrever o mapper**

Criar `apps/ui-financial/src/app/core/api/fixed.mapper.ts`:

```typescript
import type { FixedExpense, Holder } from '@caixa-familia/shared-types';
import type { FixedExpenseWire, CreateFixedExpenseWire } from './wire.types';

export function wireToFixed(w: FixedExpenseWire): FixedExpense {
  return {
    id: w.id,
    label: w.label,
    value: w.value,
    due: w.dueDay,
    cat: w.categorySlug,
    holder: w.holder as Holder,
    paidThisMonth: w.paidThisMonth,
  };
}

export function fixedToCreateWire(f: FixedExpense): CreateFixedExpenseWire {
  return {
    label: f.label,
    value: f.value,
    dueDay: f.due,
    categorySlug: f.cat,
    holder: f.holder,
  };
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx nx test ui-financial --testPathPatterns=fixed.mapper`
Expected: PASS — 4 testes.

- [ ] **Step 5: Commit**

```bash
git add apps/ui-financial/src/app/core/api/fixed.mapper.ts apps/ui-financial/src/app/core/api/fixed.mapper.spec.ts
git commit -m "feat(ui-financial): add fixed expense mapper"
```

---

### Task 5: UI — `AppDataService.loadFixed()/createFixed()` + load por mês no shell

**Files:**
- Modify: `apps/ui-financial/src/app/layout/app-data.service.ts`
- Modify: `apps/ui-financial/src/app/layout/app-shell.component.ts:31-36`
- Test: `apps/ui-financial/src/app/layout/app-data.service.spec.ts`

**Interfaces:**
- Consumes: `FixedApiService` (Task 3); `wireToFixed`/`fixedToCreateWire` (Task 4).
- Produces: `AppDataService.fixed: Signal<FixedExpense[]>` (agora vazio por padrão, não mais mock), `loadFixed(): void`, `createFixed(f: FixedExpense): void`, `fixedLoading: Signal<boolean>`, `fixedError: Signal<string | null>`. As Tasks 6 e 7 consomem isso.

- [ ] **Step 1: Escrever os testes que falham**

Em `apps/ui-financial/src/app/layout/app-data.service.spec.ts`, adicionar o import do serviço novo e do wire, estender o `setup()` e acrescentar os describes.

No topo, junto dos outros imports:

```typescript
import { FixedApiService } from '../core/api/fixed-api.service';
import type { TransactionWire, IncomeWire, FixedExpenseWire } from '../core/api/wire.types';
```

Depois de `incomeWire`, a fixture nova:

```typescript
const fixedWire: FixedExpenseWire = {
  id: 'f1',
  label: 'Aluguel',
  value: 2000,
  dueDay: 5,
  categorySlug: 'casa',
  holder: 'Mateus',
  paidThisMonth: true,
};
```

Substituir a função `setup` inteira por esta versão (o `fixApi` novo entra no mesmo padrão dos demais):

```typescript
function setup(overrides: { txList?: jest.Mock; incList?: jest.Mock; fixList?: jest.Mock } = {}) {
  const txApi = { list: overrides.txList ?? jest.fn(() => of([wire])), create: jest.fn(), remove: jest.fn() };
  const catApi = { listCategories: jest.fn(() => of([])), listCards: jest.fn(() => of([])) };
  const incApi = { list: overrides.incList ?? jest.fn(() => of([incomeWire])), create: jest.fn(() => of(incomeWire)) };
  const fixApi = { list: overrides.fixList ?? jest.fn(() => of([fixedWire])), create: jest.fn(() => of(fixedWire)) };
  TestBed.configureTestingModule({
    providers: [
      AppDataService,
      { provide: TransactionApiService, useValue: txApi },
      { provide: CatalogApiService, useValue: catApi },
      { provide: IncomeApiService, useValue: incApi },
      { provide: FixedApiService, useValue: fixApi },
    ],
  });
  return { svc: TestBed.inject(AppDataService), txApi, incApi, fixApi };
}
```

E ao final do arquivo:

```typescript
describe('AppDataService.loadFixed', () => {
  it('requests the current month and fills the fixed signal with mapped domain objects', () => {
    const { svc, fixApi } = setup();
    svc.loadFixed();
    expect(fixApi.list).toHaveBeenCalledWith({
      year: svc.currentMonth().year,
      month: svc.currentMonth().month,
    });
    expect(svc.fixed()[0]).toMatchObject({ id: 'f1', due: 5, cat: 'casa', holder: 'Mateus', paidThisMonth: true });
    expect(svc.fixedLoading()).toBe(false);
  });

  it('starts empty instead of serving mock data', () => {
    const { svc } = setup();
    expect(svc.fixed()).toEqual([]);
  });
});

describe('AppDataService.createFixed', () => {
  it('reloads fixed expenses after a successful create', () => {
    const { svc, fixApi } = setup();
    svc.createFixed({ id: '', label: 'Internet', value: 100, due: 15, cat: 'assin', holder: 'shared', paidThisMonth: false });
    expect(fixApi.create).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'Internet', value: 100, dueDay: 15, categorySlug: 'assin', holder: 'shared' }),
    );
    expect(fixApi.list).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npx nx test ui-financial --testPathPatterns=app-data.service`
Expected: FAIL — `svc.loadFixed is not a function`.

- [ ] **Step 3: Implementar no `AppDataService`**

Em `apps/ui-financial/src/app/layout/app-data.service.ts`:

Nos imports, tirar `MOCK_FIXED` da lista de `@caixa-familia/shared-mocks` (deixando `MOCK_GOALS`, `MOCK_HISTORY`, `MOCK_INCOME_HISTORY`, `CURRENT_MONTH`), acrescentar `FixedExpense` ao import de tipos e adicionar:

```typescript
import { FixedApiService } from '../core/api/fixed-api.service';
import { wireToFixed, fixedToCreateWire } from '../core/api/fixed.mapper';
```

Injetar o serviço junto dos outros:

```typescript
  private fixApi = inject(FixedApiService);
```

Trocar a linha `readonly fixed = signal(MOCK_FIXED);` por um signal vazio, movido para junto de `incomes` (fora do bloco "still-mock"):

```typescript
  readonly fixed = signal<FixedExpense[]>([]);
```

Adicionar os signals de estado, junto dos de incomes:

```typescript
  readonly fixedLoading = signal(false);
  readonly fixedError = signal<string | null>(null);
```

E os métodos, ao final da classe:

```typescript
  loadFixed(): void {
    const { year, month } = this.currentMonth();
    this.fixedLoading.set(true);
    this.fixedError.set(null);
    this.fixApi.list({ year, month }).subscribe({
      next: (rows) => {
        this.fixed.set(rows.map(wireToFixed));
        this.fixedLoading.set(false);
      },
      error: () => {
        this.fail('Falha ao carregar gastos fixos', this.fixedError);
        this.fixedLoading.set(false);
      },
    });
  }

  createFixed(f: FixedExpense): void {
    this.fixApi.create(fixedToCreateWire(f)).subscribe({
      next: () => this.loadFixed(),
      error: () => this.fail('Falha ao criar gasto fixo', this.fixedError),
    });
  }
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npx nx test ui-financial --testPathPatterns=app-data.service`
Expected: PASS — incluindo os 3 testes novos.

- [ ] **Step 5: Disparar o load no shell**

Em `apps/ui-financial/src/app/layout/app-shell.component.ts`, o segundo `effect` passa a carregar fixos junto das transações (ambos dependem do mês):

```typescript
    // (Re)load month-scoped resources when authenticated and whenever the month changes.
    effect(() => {
      if (!this.auth.isAuthenticated()) return;
      this.data.currentMonth();
      this.data.loadTransactions();
      this.data.loadFixed();
    });
```

Atualizar também o comentário do bloco anterior, se ele ainda disser apenas "catalog and incomes".

- [ ] **Step 6: Rodar a suíte da UI**

Run: `npx nx test ui-financial`
Expected: PASS, exceto `fixed.component.spec.ts` — ele ainda testa a heurística por valor e é reescrito na Task 6. Se for o único vermelho, seguir.

- [ ] **Step 7: Commit**

```bash
git add apps/ui-financial/src/app/layout
git commit -m "feat(ui-financial): load and create fixed expenses via AppDataService"
```

---

### Task 6: UI — tela `fixed` usa o `paidThisMonth` real

**Files:**
- Modify: `apps/ui-financial/src/app/features/fixed/fixed.component.ts:19-33`
- Test: `apps/ui-financial/src/app/features/fixed/fixed.component.spec.ts`

**Interfaces:**
- Consumes: `AppDataService.fixed` com `paidThisMonth` (Tasks 2 e 5).
- Produces: nada para outras tasks.

Contexto: hoje o componente decide pago-vs-pendente comparando **valores** de transações recorrentes (`paidValueSet`). Duas contas de mesmo valor se confundem, e uma transação recorrente qualquer "paga" um fixo de valor igual. Com o campo real vindo da API, a heurística sai inteira.

- [ ] **Step 1: Reescrever o teste para o comportamento novo**

Em `apps/ui-financial/src/app/features/fixed/fixed.component.spec.ts`, trocar a fixture `FIXED` e os dois describes de `paidItems`/`pendingItems`.

A fixture passa a carregar o status explícito:

```typescript
const FIXED: FixedExpense[] = [
  { id: 'f1', label: 'Conta A', value: 100, due: 5,  cat: 'casa',  holder: 'shared', paidThisMonth: true  },
  { id: 'f2', label: 'Conta B', value: 200, due: 15, cat: 'assin', holder: 'Mateus', paidThisMonth: false },
  { id: 'f3', label: 'Conta C', value: 300, due: 25, cat: 'educ',  holder: 'Thais',  paidThisMonth: false },
];
```

E os describes de status passam a ser:

```typescript
  describe('paidItems', () => {
    it('includes only fixed items flagged as paid this month', () => {
      expect(component.paidItems().map(f => f.id)).toEqual(['f1']);
    });

    it('ignores transaction values entirely', () => {
      // t3 tem value 200 = f2.value; sem paidThisMonth, f2 continua pendente
      expect(component.paidItems().map(f => f.id)).not.toContain('f2');
    });
  });

  describe('pendingItems', () => {
    it('includes fixed items not yet paid this month', () => {
      expect(component.pendingItems().length).toBe(2);
    });

    it('is sorted by due date ascending', () => {
      const dues = component.pendingItems().map(f => f.due);
      expect(dues).toEqual([15, 25]);
    });
  });
```

Os describes de `KPI computeds`, `formatPercent` e `formatDay` ficam como estão — os números batem (totalFixed 600, totalPaid 100, totalPending 500, pctReceita 0.6).

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx nx test ui-financial --testPathPatterns=fixed.component`
Expected: FAIL — com a fixture nova, `t1` (recurring, value 100) ainda casa por valor, mas `paidItems` só passa a ser confiável depois da Step 3. Confirmar que a falha é de comportamento, não de compilação.

- [ ] **Step 3: Trocar a heurística pelo campo real**

Em `apps/ui-financial/src/app/features/fixed/fixed.component.ts`, remover o `paidValueSet` (linhas 19-21) e reescrever os dois computeds:

```typescript
  pendingItems = computed(() =>
    this.data.fixed()
      .filter(f => !f.paidThisMonth)
      .sort((a, b) => a.due - b.due)
  );

  paidItems = computed(() =>
    this.data.fixed()
      .filter(f => f.paidThisMonth)
      .sort((a, b) => a.due - b.due)
  );
```

Com isso o componente não usa mais `data.transactions()` para status. Verificar se `transactions` ainda é usado em algum outro ponto do arquivo; se não for, o mock do spec pode manter o signal sem prejuízo.

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx nx test ui-financial --testPathPatterns=fixed.component`
Expected: PASS — todos os describes.

- [ ] **Step 5: Commit**

```bash
git add apps/ui-financial/src/app/features/fixed
git commit -m "feat(ui-financial): use real paidThisMonth status on the fixed screen"
```

---

### Task 7: UI — tipo `Fixo` no drawer com campo de vencimento

**Files:**
- Modify: `apps/ui-financial/src/app/features/expense-drawer/expense-drawer.component.ts`
- Modify: `apps/ui-financial/src/app/features/expense-drawer/expense-drawer.component.html:26-52` (bloco dos chips de tipo) e o bloco de campos
- Test: `apps/ui-financial/src/app/features/expense-drawer/expense-drawer.component.spec.ts` (novo)

**Interfaces:**
- Consumes: `AppDataService.createFixed(f: FixedExpense)` (Task 5).
- Produces: nada para outras tasks. Fecha a fatia.

Decisão D4 da spec: cadastrar gasto fixo é ato distinto de lançar pagamento. O checkbox "Recorrente (gasto fixo)" **não muda** — continua sendo só flag da transação.

- [ ] **Step 1: Escrever o teste que falha**

Criar `apps/ui-financial/src/app/features/expense-drawer/expense-drawer.component.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ExpenseDrawerComponent } from './expense-drawer.component';
import { AppDataService } from '../../layout/app-data.service';

function mockDataService() {
  return {
    categories: signal([{ id: 'casa', label: 'Casa', color: '#000', budget: 100 }]),
    cards: signal([]),
    catBy: signal({}),
    cardBy: signal({}),
    createTransaction: jest.fn(),
    createIncome: jest.fn(),
    createFixed: jest.fn(),
  };
}

describe('ExpenseDrawerComponent — fixed type', () => {
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

  function fillFixed(dueDay: number | null) {
    component.form.patchValue({
      type: 'fixed',
      label: 'Aluguel',
      value: 2000,
      cat: 'casa',
      holder: 'shared',
      dueDay,
    });
  }

  it('requires dueDay when the type is fixed', () => {
    fillFixed(null);
    expect(component.form.controls.dueDay.valid).toBe(false);
    expect(component.form.invalid).toBe(true);
  });

  it('does not require dueDay for a regular expense', () => {
    component.form.patchValue({ type: 'expense', label: 'Mercado', value: 50, cat: 'casa', holder: 'shared' });
    expect(component.form.controls.dueDay.valid).toBe(true);
  });

  it('routes a valid fixed submission to createFixed', () => {
    fillFixed(5);
    component.save();
    expect(data.createFixed).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'Aluguel', value: 2000, due: 5, cat: 'casa', holder: 'shared', paidThisMonth: false }),
    );
    expect(data.createTransaction).not.toHaveBeenCalled();
    expect(data.createIncome).not.toHaveBeenCalled();
  });

  it('still routes a regular expense to createTransaction', () => {
    component.form.patchValue({ type: 'expense', label: 'Mercado', value: 50, cat: 'casa', holder: 'shared' });
    component.save();
    expect(data.createTransaction).toHaveBeenCalled();
    expect(data.createFixed).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx nx test ui-financial --testPathPatterns=expense-drawer`
Expected: FAIL — o control `dueDay` não existe e `'fixed'` não é um valor válido de `type`.

- [ ] **Step 3: Estender o form**

Em `apps/ui-financial/src/app/features/expense-drawer/expense-drawer.component.ts`:

Acrescentar `FixedExpense` ao import de tipos do `@caixa-familia/shared-types`.

Ampliar o tipo do control e adicionar o `dueDay` ao `FormGroup`:

```typescript
    type: new FormControl<'expense' | 'income' | 'contribution' | 'fixed'>('expense', { nonNullable: true }),
```

```typescript
    dueDay: new FormControl<number | null>(null),
```

(Fica logo depois de `date`, e sem validator na declaração — quem liga/desliga é o `valueChanges` abaixo.)

- [ ] **Step 4: Tornar os validators condicionais**

No `constructor`, o subscribe de `type` passa a cuidar de `cat`, `dueDay` e `date`:

```typescript
  constructor() {
    this.form.controls.type.valueChanges.subscribe((type) => {
      const cat = this.form.controls.cat;
      if (type === 'income') {
        cat.clearValidators();
      } else {
        cat.setValidators([Validators.required]);
      }
      cat.updateValueAndValidity();

      const dueDay = this.form.controls.dueDay;
      if (type === 'fixed') {
        dueDay.setValidators([Validators.required, Validators.min(1), Validators.max(31)]);
      } else {
        dueDay.clearValidators();
      }
      dueDay.updateValueAndValidity();

      const date = this.form.controls.date;
      if (type === 'fixed') {
        date.clearValidators();
      } else {
        date.setValidators([Validators.required]);
      }
      date.updateValueAndValidity();
    });
  }
```

- [ ] **Step 5: Rotear o save**

No `save()`, adicionar o ramo de `fixed` **antes** do ramo de `income` (a ordem não importa funcionalmente, mas mantém os early-returns agrupados):

```typescript
    if (v.type === 'fixed') {
      const fixed: FixedExpense = {
        id: '', // server assigns
        label: v.label,
        value: Number(v.value),
        due: Number(v.dueDay),
        cat: v.cat,
        holder: v.holder,
        paidThisMonth: false,
      };
      this.data.createFixed(fixed);
      this.onClose();
      return;
    }
```

- [ ] **Step 6: Rodar o teste e confirmar que passa**

Run: `npx nx test ui-financial --testPathPatterns=expense-drawer`
Expected: PASS — 4 testes.

- [ ] **Step 7: Adicionar o chip e o campo no template**

Em `apps/ui-financial/src/app/features/expense-drawer/expense-drawer.component.html`, depois do chip de `contribution` (por volta da linha 45-52), acrescentar o quarto chip seguindo exatamente o markup dos irmãos:

```html
      <button
        type="button"
        class="type-chip"
        [class.active]="form.controls.type.value === 'fixed'"
        (click)="form.controls.type.setValue('fixed')"
      >
        Fixo
      </button>
```

(Copiar as classes/estrutura interna do chip vizinho — se os outros tiverem ícone, incluir um coerente.)

Adicionar o campo de vencimento, visível só no tipo `fixed`, junto do bloco do campo `date`:

```html
    @if (form.controls.type.value === 'fixed') {
      <label class="field">
        <span class="field-label">Vence dia</span>
        <input type="number" class="text-input num" formControlName="dueDay" min="1" max="31" />
      </label>
    }
```

E envolver o campo `date` (e os blocos de método/parcelas/recorrente que não fazem sentido para um gasto fixo) num `@if (form.controls.type.value !== 'fixed') { ... }`, seguindo as classes já usadas no arquivo.

- [ ] **Step 8: Verificar o build da UI**

Run: `npx nx build ui-financial`
Expected: build verde. O jest não faz type-check estrito de template — este passo é o que pega erro de binding.

- [ ] **Step 9: Commit**

```bash
git add apps/ui-financial/src/app/features/expense-drawer
git commit -m "feat(ui-financial): create fixed expenses from the drawer 'Fixo' type"
```

---

### Task 8: Gate da fatia — suíte completa, builds e smoke

**Files:**
- Nenhum arquivo novo. Verificação de fechamento.

**Interfaces:**
- Consumes: tudo das Tasks 1-7.
- Produces: fatia pronta para `/code-review`.

- [ ] **Step 1: Suíte completa dos dois apps**

Run: `npx nx test api-financial && npx nx test ui-financial`
Expected: PASS nos dois, sem testes pulados.

- [ ] **Step 2: Builds**

Run: `npx nx build api-financial && npx nx build ui-financial`
Expected: build verde nos dois. É aqui que erro de tipo entre `shared-types`, `shared-mocks` e os apps aparece.

- [ ] **Step 3: Confirmar que `fixed` saiu do bloco de mocks**

Run: `grep -n "MOCK_" apps/ui-financial/src/app/layout/app-data.service.ts`
Expected: aparecem apenas `MOCK_GOALS`, `MOCK_HISTORY`, `MOCK_INCOME_HISTORY` e `CURRENT_MONTH`. **Nenhuma** menção a `MOCK_FIXED`.

- [ ] **Step 4: Smoke manual**

Subir o stack (`docker compose up -d` + api + ui, como nas fatias anteriores) e verificar, logado:
1. Tela **Fixos** lista os gastos fixos do mês vindos da API, com a separação Pagos/Pendentes refletindo `paidThisMonth`.
2. Trocar o mês no topo **recarrega** a lista e o status muda junto.
3. Abrir o drawer → tipo **Fixo** → preencher valor, descrição, categoria, dia de vencimento, titular → salvar → o item aparece na lista como pendente.
4. Titular `shared` grava sem membro; um titular nomeado volta com o nome certo na listagem.
5. Com usuário sem papel de escrita, o botão de salvar segue bloqueado.

- [ ] **Step 5: Rodar o gate de review**

Rodar `/code-review` sobre o diff da fatia e endereçar os achados antes de considerar a fatia fechada.

---

## Self-Review

**Cobertura da spec:**
- §3 Backend (repository/mapper/prisma/DTO/testes) → Task 1.
- §4 Shared-types (`paidThisMonth`) → Task 2 (mais o ajuste de `MOCK_FIXED`, que a spec não previa mas o compilador exige).
- §5 UI: wire types + api service → Task 3; mapper → Task 4; `AppDataService` + shell → Task 5; `features/fixed` (D5) → Task 6; drawer (D4) → Task 7.
- §6 Testes e gate → distribuídos nas tasks e consolidados na Task 8.

**Type consistency:** `holder: string` no wire e `Holder` no domínio (cast no mapper, como em `income.mapper.ts`); `due`/`dueDay` e `cat`/`categorySlug` usados de forma consistente entre Tasks 3, 4, 5 e 7; `createFixed(f: FixedExpense)` tem a mesma assinatura na Task 5 (produz) e na Task 7 (consome).

**Ponto de atenção conhecido:** a Task 2 quebra o type-check de `fixed.component.spec.ts` de propósito, e só a Task 6 conserta. Se as tasks forem executadas fora de ordem, esse vermelho é esperado e não indica regressão.
