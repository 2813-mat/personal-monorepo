# UI↔API Connection — Transactions Vertical Slice — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the Angular UI to the NestJS API end-to-end for the Transactions feature (Keycloak login → Bearer interceptor → real reads/writes), replacing mocks for transactions plus the supporting category/card lookups.

**Architecture:** Keep `AppDataService` as the signal facade the components already consume, but fill its signals from HTTP via thin per-resource API services and mappers. Add a Keycloak OIDC login foundation (Authorization Code + PKCE) with a Bearer interceptor scoped to the API URL. Align three backend read/write mappers to speak the `shared-types` contract (member **name** as `holder`) so the UI mappers stay trivial.

**Tech Stack:** Nx monorepo, Angular 21 (standalone + signals), NestJS 11, Prisma 6, Keycloak 26, `angular-auth-oidc-client`, Jest.

## Global Constraints

- API base path is `/api` (NestJS `setGlobalPrefix('api')`), served at `http://localhost:3000`.
- API is fully guarded by a global Keycloak JWT guard; every request needs a Bearer access token. Writes require realm role `admin` or `editor`.
- Keycloak realm `caixa-familia`, public SPA client `ui-financial` (Auth Code + PKCE, redirect `http://localhost:4200/*`), authority `http://localhost:8080/realms/caixa-familia`. Test users: `mateus`/`mateus` (admin), `thais`/`thais` (editor).
- The `shared-types` `Transaction` shape is the UI contract: `cat: Id`, `holder: 'Mateus'|'Thais'|'shared'`, `method: cardId | 'pix'`, `installments: {n,of}|null`.
- Local data comes from `docker-compose up -d` + `npx prisma migrate deploy` + `npx prisma db seed`. The seed derives all data from `@caixa-familia/shared-mocks`; category `slug` equals the mock category id; cards get fresh DB ids referenced by transactions.
- Use `npx nx test api-financial` and `npx nx test ui-financial` (Jest) to run tests. Commit after each task.
- Do NOT change unrelated features (incomes, goals, fixed, budgets, reports, dashboard) — they stay on mocks.

---

## File Structure

**Backend (`apps/api-financial/src`):**
- Modify `modules/ledger/transaction/domain/transaction.repository.ts` — `TransactionView.holder` replaces `memberId`; `CreateTransactionData.holder` added.
- Modify `modules/ledger/transaction/infrastructure/transaction.mapper.ts` — emit `holder`.
- Modify `modules/ledger/transaction/infrastructure/transaction.prisma.repository.ts` — include `member`; resolve `holder`→member on create.
- Modify `modules/ledger/transaction/interface/dto/create-transaction.dto.ts` — add optional `holder`.
- Modify `modules/ledger/transaction/application/list-transactions.usecase.spec.ts` — fixture uses `holder`.
- Create `modules/catalog/card/interface/card.view.ts` — `toCardView` mapper (CardProps → shared-types `Card`).
- Modify `modules/catalog/card/interface/card.controller.ts` — return `toCardView`.

**UI (`apps/ui-financial/src`):**
- Create `environments/environment.ts` and `environments/environment.development.ts`.
- Modify `app/app.config.ts` — add `provideHttpClient`, `provideAuth`, interceptors.
- Modify `app/app.routes.ts` — add `authGuard` to the shell route.
- Create `app/core/auth/auth.service.ts` + `.spec.ts`.
- Create `app/core/auth/auth.guard.ts`.
- Create `app/core/api/wire.types.ts` — API wire DTOs.
- Create `app/core/api/transaction.mapper.ts` + `.spec.ts`.
- Create `app/core/api/transaction-api.service.ts` + `.spec.ts`.
- Create `app/core/api/catalog-api.service.ts` + `.spec.ts` (categories + cards).
- Create `app/core/api/catalog.mapper.ts` + `.spec.ts`.
- Modify `app/layout/app-data.service.ts` — HTTP-backed load/create/remove + loading/error signals.
- Modify `app/layout/app-shell.component.ts` (or the shell's `ngOnInit`) — trigger initial loads.
- Modify `app/features/expense-drawer/expense-drawer.component.ts` — call `createTransaction`.
- Modify `app/features/tx-detail-drawer/tx-detail-drawer.component.ts` — call `removeTransaction`.
- Modify `app/features/transactions/transactions.component.ts` — read holder-aware; no shape change expected.

---

## Task 1: Backend — transaction read emits `holder`

**Files:**
- Modify: `apps/api-financial/src/modules/ledger/transaction/domain/transaction.repository.ts`
- Modify: `apps/api-financial/src/modules/ledger/transaction/infrastructure/transaction.mapper.ts`
- Modify: `apps/api-financial/src/modules/ledger/transaction/infrastructure/transaction.prisma.repository.ts:15`
- Test: `apps/api-financial/src/modules/ledger/transaction/infrastructure/transaction.mapper.spec.ts` (create)
- Modify: `apps/api-financial/src/modules/ledger/transaction/application/list-transactions.usecase.spec.ts`

**Interfaces:**
- Produces: `TransactionView` with `holder: 'Mateus'|'Thais'|'shared'|string` (member name or `'shared'`), no `memberId`.

- [ ] **Step 1: Write the failing mapper test**

Create `transaction.mapper.spec.ts`:

```ts
import { toView, TransactionRow } from './transaction.mapper';

const baseRow = {
  id: 't1',
  date: new Date('2026-05-10T12:00:00Z'),
  label: 'Mercado',
  value: '100' as unknown as never,
  category: { slug: 'mercado' },
  method: 'PIX',
  cardId: null,
  note: null,
  recurring: false,
  fixedExpenseId: null,
  installment: null,
} as unknown as TransactionRow;

describe('toView', () => {
  it('emits member name as holder', () => {
    const row = { ...baseRow, member: { name: 'Mateus' } } as unknown as TransactionRow;
    expect(toView(row).holder).toBe('Mateus');
  });

  it('emits "shared" when there is no member', () => {
    const row = { ...baseRow, member: null } as unknown as TransactionRow;
    expect(toView(row).holder).toBe('shared');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx nx test api-financial --test-file=transaction.mapper.spec.ts`
Expected: FAIL — `toView(...).holder` is `undefined` / `member` not in include type.

- [ ] **Step 3: Update the domain view type**

In `transaction.repository.ts`, replace `memberId: string | null;` in `TransactionView` with:

```ts
  holder: string;
```

And in `CreateTransactionData` leave `memberId` for now (Task 2 handles create).

- [ ] **Step 4: Update the mapper**

In `transaction.mapper.ts`, change the `TransactionRow` type include and the `toView` body:

```ts
export type TransactionRow = Prisma.TransactionGetPayload<{
  include: { category: true; member: true; installment: { include: { plan: true } } };
}>;

export const toView = (r: TransactionRow): TransactionView => ({
  id: r.id,
  date: r.date.toISOString().slice(0, 10),
  label: r.label,
  value: Number(r.value),
  categorySlug: r.category.slug,
  holder: r.member?.name ?? 'shared',
  method: r.method,
  cardId: r.cardId,
  note: r.note ?? undefined,
  recurring: r.recurring,
  fixedExpenseId: r.fixedExpenseId ?? undefined,
  installments: r.installment ? { n: r.installment.number, of: r.installment.plan.totalCount } : null,
});
```

- [ ] **Step 5: Update the repository include**

In `transaction.prisma.repository.ts:15`, add `member: true` to `INCLUDE`:

```ts
const INCLUDE = { category: true, member: true, installment: { include: { plan: true } } } as const;
```

- [ ] **Step 6: Fix the list use case spec fixture**

In `list-transactions.usecase.spec.ts`, replace `memberId: null,` with `holder: 'shared',`.

- [ ] **Step 7: Run the affected tests to verify they pass**

Run: `npx nx test api-financial --test-file=transaction.mapper.spec.ts --test-file=list-transactions.usecase.spec.ts`
Expected: PASS.

- [ ] **Step 8: Run the full api-financial suite**

Run: `npx nx test api-financial`
Expected: PASS (fix any other spec still referencing `memberId` on the view; there should be none outside those touched).

- [ ] **Step 9: Commit**

```bash
git add apps/api-financial/src/modules/ledger/transaction
git commit -m "feat(api-financial): transaction read emits holder name (shared-types alignment)"
```

---

## Task 2: Backend — transaction create accepts `holder`

**Files:**
- Modify: `apps/api-financial/src/modules/ledger/transaction/interface/dto/create-transaction.dto.ts`
- Modify: `apps/api-financial/src/modules/ledger/transaction/domain/transaction.repository.ts` (`CreateTransactionData`)
- Modify: `apps/api-financial/src/modules/ledger/transaction/infrastructure/transaction.prisma.repository.ts:46-92`
- Test: `apps/api-financial/src/modules/ledger/transaction/infrastructure/transaction.prisma.repository.spec.ts` (create)

**Interfaces:**
- Consumes: `TransactionView` from Task 1.
- Produces: `CreateTransactionData` gains `holder?: string` (member name or `'shared'`); repository resolves it to a `memberId` (member by name within household; `'shared'`/absent → `null`). `memberId` field is removed from the create path.

- [ ] **Step 1: Write the failing repository test**

Create `transaction.prisma.repository.spec.ts`. It verifies holder→member resolution using a Prisma mock:

```ts
import { TransactionPrismaRepository } from './transaction.prisma.repository';

function makeRepo(memberFindFirst: jest.Mock) {
  const created: any[] = [];
  const prisma: any = {
    member: { findFirst: memberFindFirst },
    category: { findFirstOrThrow: jest.fn(async () => ({ id: 'cat1' })) },
    transaction: {
      create: jest.fn(async (args: any) => {
        created.push(args.data);
        return {
          id: 'tx1', date: new Date('2026-05-10'), label: args.data.label, value: 100,
          category: { slug: 'mercado' }, member: memberFindFirst.mock.results.length
            ? { name: 'Mateus' } : null,
          method: args.data.method, cardId: args.data.cardId ?? null, note: null,
          recurring: false, fixedExpenseId: null, installment: null,
        };
      }),
    },
    $transaction: async (fn: any) => fn(prisma),
  };
  const tenant: any = { householdId: 'h1' };
  const repo = new TransactionPrismaRepository(prisma, tenant);
  (repo as any).householdId = 'h1';
  return { repo, created, prisma };
}

describe('TransactionPrismaRepository.create holder resolution', () => {
  it('resolves a named holder to its memberId', async () => {
    const findFirst = jest.fn(async () => ({ id: 'm-mateus' }));
    const { repo, created } = makeRepo(findFirst);
    await repo.create({
      date: '2026-05-10', label: 'Mercado', value: 100, categorySlug: 'mercado',
      holder: 'Mateus', method: 'PIX',
    } as any);
    expect(findFirst).toHaveBeenCalledWith({ where: { householdId: 'h1', name: 'Mateus' } });
    expect(created[0].memberId).toBe('m-mateus');
  });

  it('maps "shared" holder to a null member', async () => {
    const findFirst = jest.fn();
    const { repo, created } = makeRepo(findFirst);
    await repo.create({
      date: '2026-05-10', label: 'Pix', value: 50, categorySlug: 'mercado',
      holder: 'shared', method: 'PIX',
    } as any);
    expect(findFirst).not.toHaveBeenCalled();
    expect(created[0].memberId).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx nx test api-financial --test-file=transaction.prisma.repository.spec.ts`
Expected: FAIL — `create` still expects `data.memberId`; no holder resolution.

- [ ] **Step 3: Update the DTO**

In `create-transaction.dto.ts`, replace the `memberId` field with `holder`:

```ts
  @IsOptional() @IsString() holder?: string;
```

(Remove the `@IsOptional() @IsString() memberId?: string;` line.)

- [ ] **Step 4: Update `CreateTransactionData`**

In `transaction.repository.ts`, in `CreateTransactionData` replace `memberId?: string | null;` with:

```ts
  holder?: string;
```

- [ ] **Step 5: Resolve holder in the repository create**

In `transaction.prisma.repository.ts`, inside the `$transaction` callback (before building `tx.transaction.create`), add resolution and use it:

```ts
      let memberId: string | undefined;
      if (data.holder && data.holder !== 'shared') {
        const member = await tx.member.findFirst({
          where: { householdId: this.householdId, name: data.holder },
        });
        memberId = member?.id;
      }
```

Then in the `tx.transaction.create` `data`, replace `memberId: data.memberId ?? undefined,` with:

```ts
          memberId,
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx nx test api-financial --test-file=transaction.prisma.repository.spec.ts`
Expected: PASS.

- [ ] **Step 7: Run the full api-financial suite**

Run: `npx nx test api-financial`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/api-financial/src/modules/ledger/transaction
git commit -m "feat(api-financial): transaction create accepts holder name, resolves to member"
```

---

## Task 3: Backend — card list returns shared-types `Card` shape

**Files:**
- Create: `apps/api-financial/src/modules/catalog/card/interface/card.view.ts`
- Test: `apps/api-financial/src/modules/catalog/card/interface/card.view.spec.ts`
- Modify: `apps/api-financial/src/modules/catalog/card/interface/card.controller.ts:12-15`
- Modify: `apps/api-financial/src/modules/catalog/card/application/list-cards.usecase.ts` (only if it must expose the member name — see Step 3)

**Interfaces:**
- Produces: `GET /api/cards` returns `Card[]` matching `shared-types`: `{ id, name, holder, bank, color, closing, due, current, limit, last4 }`.

- [ ] **Step 1: Inspect how the list use case exposes owner name**

Read `apps/api-financial/src/modules/catalog/card/application/list-cards.usecase.ts` and `.../domain/card.entity.ts`. The entity's `toJSON()` returns `CardProps` (`ownerMemberId`, `closingDay`, `dueDay`, `creditLimit`, `current`, ...) with no member name. To emit `holder`, the list must join the member name.

Decision: resolve `holder` in the **repository/use case** by including the owner member's name, then map to the view. If the card repository does not already load the member, add `include: { owner: true }` (or the relation name in `schema.prisma`) so a `holder` name is available. Confirm the relation name in `schema.prisma` (`model Card`) before writing code.

- [ ] **Step 2: Write the failing view-mapper test**

Create `card.view.spec.ts`:

```ts
import { toCardView, CardViewInput } from './card.view';

const input: CardViewInput = {
  id: 'c1', name: 'Nubank', bank: 'Nubank', color: '#820ad1',
  closingDay: 3, dueDay: 10, creditLimit: 5000, last4: '1234',
  current: 250, holder: 'Mateus',
};

describe('toCardView', () => {
  it('maps to the shared-types Card shape', () => {
    expect(toCardView(input)).toEqual({
      id: 'c1', name: 'Nubank', holder: 'Mateus', bank: 'Nubank', color: '#820ad1',
      closing: 3, due: 10, current: 250, limit: 5000, last4: '1234',
    });
  });

  it('defaults holder to "shared" when absent', () => {
    expect(toCardView({ ...input, holder: null }).holder).toBe('shared');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx nx test api-financial --test-file=card.view.spec.ts`
Expected: FAIL — module `card.view` not found.

- [ ] **Step 4: Implement the view mapper**

Create `card.view.ts`:

```ts
import type { Card } from '@caixa-familia/shared-types';

export interface CardViewInput {
  id: string;
  name: string;
  bank: string;
  color: string;
  closingDay: number;
  dueDay: number;
  creditLimit: number;
  last4: string;
  current: number;
  holder: string | null;
}

export const toCardView = (c: CardViewInput): Card => ({
  id: c.id,
  name: c.name,
  holder: (c.holder ?? 'shared') as Card['holder'],
  bank: c.bank,
  color: c.color,
  closing: c.closingDay,
  due: c.dueDay,
  current: c.current,
  limit: c.creditLimit,
  last4: c.last4,
});
```

- [ ] **Step 5: Feed the owner name into the controller**

In `list-cards.usecase.ts` / the card repository, ensure each returned card carries the owner member's `name` (via the Prisma include from Step 1). Then in `card.controller.ts` `findAll`, build `CardViewInput` from the card + owner name and map:

```ts
  @Get()
  async findAll() {
    const cards = await this.list.execute();
    return cards.map((c) =>
      toCardView({ ...c.toJSON(), holder: c.ownerName ?? null }),
    );
  }
```

If exposing `ownerName` on the entity is intrusive, instead have the use case return `{ props: CardProps; holder: string | null }[]` and map from that. Keep `card.entity.ts` `toJSON()` unchanged so `list-cards.usecase.spec.ts` (`res[0].toJSON().current`) still passes.

- [ ] **Step 6: Run the card tests to verify they pass**

Run: `npx nx test api-financial --test-file=card.view.spec.ts --test-file=list-cards.usecase.spec.ts`
Expected: PASS.

- [ ] **Step 7: Run the full api-financial suite**

Run: `npx nx test api-financial`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/api-financial/src/modules/catalog/card
git commit -m "feat(api-financial): card list returns shared-types Card shape with holder"
```

---

## Task 4: UI — environment files

**Files:**
- Create: `apps/ui-financial/src/environments/environment.ts`
- Create: `apps/ui-financial/src/environments/environment.development.ts`
- Modify: `apps/ui-financial/project.json` (add `fileReplacements` for the dev config if not present)

**Interfaces:**
- Produces: `environment` object `{ production, apiBaseUrl, auth: { authority, clientId, scope } }`.

- [ ] **Step 1: Create the base environment**

`environments/environment.ts`:

```ts
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:3000/api',
  auth: {
    authority: 'http://localhost:8080/realms/caixa-familia',
    clientId: 'ui-financial',
    scope: 'openid profile',
  },
};
```

- [ ] **Step 2: Create the development environment**

`environments/environment.development.ts`: identical to the base for now (same local URLs):

```ts
export { environment } from './environment';
```

- [ ] **Step 3: Verify the build picks up the environment**

Run: `npx nx build ui-financial`
Expected: build succeeds (no import errors). If `project.json` lacks a `development` fileReplacement, no change is needed because both files are identical; leave `project.json` untouched unless the build fails.

- [ ] **Step 4: Commit**

```bash
git add apps/ui-financial/src/environments
git commit -m "chore(ui-financial): add environment files with API and Keycloak config"
```

---

## Task 5: UI — install and wire `angular-auth-oidc-client`

**Files:**
- Modify: `package.json` (dependency)
- Modify: `apps/ui-financial/src/app/app.config.ts`

**Interfaces:**
- Produces: HttpClient provided with the OIDC auth interceptor; `provideAuth` configured against the realm; access token auto-attached to `apiBaseUrl` requests.

- [ ] **Step 1: Install the library**

Run: `npm install angular-auth-oidc-client@latest`
Then verify it resolves against Angular 21 peer deps:
Run: `npm ls angular-auth-oidc-client`
Expected: a single resolved version, no unmet-peer errors for `@angular/core@21`. If peers conflict, pin the highest version whose peer range includes 21 and note it here.

- [ ] **Step 2: Configure providers**

Replace `app.config.ts` with:

```ts
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAuth, authInterceptor } from 'angular-auth-oidc-client';
import { appRoutes } from './app.routes';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
    provideHttpClient(withInterceptors([authInterceptor()])),
    provideAuth({
      config: {
        authority: environment.auth.authority,
        redirectUrl: window.location.origin,
        postLogoutRedirectUri: window.location.origin,
        clientId: environment.auth.clientId,
        scope: environment.auth.scope,
        responseType: 'code',
        silentRenew: true,
        useRefreshToken: true,
        secureRoutes: [environment.apiBaseUrl],
      },
    }),
  ],
};
```

Note: `authInterceptor` and `provideAuth` names are from `angular-auth-oidc-client` v16+. If the installed version differs, adjust to its documented functional-provider API (verify against `node_modules/angular-auth-oidc-client`).

- [ ] **Step 3: Verify it compiles**

Run: `npx nx build ui-financial`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json apps/ui-financial/src/app/app.config.ts
git commit -m "feat(ui-financial): wire OIDC auth provider and HTTP interceptor"
```

---

## Task 6: UI — AuthService + auth guard + auto-login

**Files:**
- Create: `apps/ui-financial/src/app/core/auth/auth.service.ts`
- Test: `apps/ui-financial/src/app/core/auth/auth.service.spec.ts`
- Create: `apps/ui-financial/src/app/core/auth/auth.guard.ts`
- Modify: `apps/ui-financial/src/app/app.routes.ts`
- Modify: `apps/ui-financial/src/app/layout/topbar.component.ts` + its template (login/logout + user name)

**Interfaces:**
- Produces: `AuthService` with signals `isAuthenticated: Signal<boolean>`, `userName: Signal<string>`, `roles: Signal<string[]>`, computed `canWrite: Signal<boolean>` (has `admin` or `editor`); methods `login()`, `logout()`. `authGuard` is a `CanActivateFn` that triggers `login()` and returns `false` when unauthenticated.

- [ ] **Step 1: Write the failing AuthService test (role parsing)**

Create `auth.service.spec.ts`. Isolate the pure role logic so it is testable without the OIDC runtime:

```ts
import { rolesFromPayload, canWriteFromRoles } from './auth.service';

describe('auth role helpers', () => {
  it('extracts realm roles from an access-token payload', () => {
    expect(rolesFromPayload({ realm_access: { roles: ['admin', 'x'] } })).toEqual(['admin', 'x']);
  });

  it('returns [] when there is no realm_access', () => {
    expect(rolesFromPayload({})).toEqual([]);
    expect(rolesFromPayload(null)).toEqual([]);
  });

  it('canWrite is true for admin or editor', () => {
    expect(canWriteFromRoles(['editor'])).toBe(true);
    expect(canWriteFromRoles(['admin'])).toBe(true);
    expect(canWriteFromRoles(['viewer'])).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx nx test ui-financial --test-file=auth.service.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement AuthService with exported pure helpers**

Create `auth.service.ts`:

```ts
import { Injectable, inject, signal, computed } from '@angular/core';
import { OidcSecurityService } from 'angular-auth-oidc-client';

export function rolesFromPayload(payload: unknown): string[] {
  const p = payload as { realm_access?: { roles?: string[] } } | null;
  return p?.realm_access?.roles ?? [];
}

export function canWriteFromRoles(roles: string[]): boolean {
  return roles.includes('admin') || roles.includes('editor');
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private oidc = inject(OidcSecurityService);

  private readonly _authenticated = signal(false);
  private readonly _userName = signal('');
  private readonly _roles = signal<string[]>([]);

  readonly isAuthenticated = this._authenticated.asReadonly();
  readonly userName = this._userName.asReadonly();
  readonly roles = this._roles.asReadonly();
  readonly canWrite = computed(() => canWriteFromRoles(this._roles()));

  init(): void {
    this.oidc.checkAuth().subscribe(({ isAuthenticated, userData }) => {
      this._authenticated.set(isAuthenticated);
      this._userName.set((userData?.name as string) ?? (userData?.preferred_username as string) ?? '');
      const payload = this.oidc.getPayloadFromAccessToken();
      this._roles.set(rolesFromPayload(payload));
    });
  }

  login(): void {
    this.oidc.authorize();
  }

  logout(): void {
    this.oidc.logoff().subscribe();
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx nx test ui-financial --test-file=auth.service.spec.ts`
Expected: PASS.

- [ ] **Step 5: Implement the guard**

Create `auth.guard.ts`:

```ts
import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (auth.isAuthenticated()) return true;
  auth.login();
  return false;
};
```

- [ ] **Step 6: Trigger `checkAuth` on startup and guard the shell**

In `app.routes.ts`, import `authGuard` and add `canActivate: [authGuard]` to the shell route (`path: ''`, `component: AppShellComponent`).

In the `AppShellComponent` (`apps/ui-financial/src/app/layout/app-shell.component.ts`) constructor or `ngOnInit`, call `inject(AuthService).init()` once so `checkAuth` runs and processes the OIDC callback. (Read the shell component first to place this cleanly.)

- [ ] **Step 7: Add login/logout affordance to the topbar**

In `topbar.component.ts`, inject `AuthService`; expose `userName`, `isAuthenticated`, and `logout()`. In `topbar.component.html`, show the user name and a logout button when authenticated. Keep styling consistent with existing topbar markup.

- [ ] **Step 8: Verify build + tests**

Run: `npx nx build ui-financial && npx nx test ui-financial --test-file=auth.service.spec.ts`
Expected: build succeeds; test passes.

- [ ] **Step 9: Commit**

```bash
git add apps/ui-financial/src/app/core/auth apps/ui-financial/src/app/app.routes.ts apps/ui-financial/src/app/layout
git commit -m "feat(ui-financial): AuthService, auth guard, and topbar login/logout"
```

---

## Task 7: UI — wire types + transaction mapper

**Files:**
- Create: `apps/ui-financial/src/app/core/api/wire.types.ts`
- Create: `apps/ui-financial/src/app/core/api/transaction.mapper.ts`
- Test: `apps/ui-financial/src/app/core/api/transaction.mapper.spec.ts`

**Interfaces:**
- Produces:
  - `TransactionWire` = `{ id; date; label; value; categorySlug; holder; method: 'PIX'|'CARD'; cardId: string|null; note?; recurring; fixedExpenseId?; installments: {n,of}|null }`.
  - `CreateTransactionWire` = `{ date; label; value; categorySlug; holder; method: 'PIX'|'CARD'; cardId?; note?; recurring?; installments?: {n,of} }`.
  - `wireToTransaction(w: TransactionWire): Transaction`.
  - `transactionToCreateWire(t): CreateTransactionWire`.

- [ ] **Step 1: Write the failing mapper tests**

Create `transaction.mapper.spec.ts`:

```ts
import { wireToTransaction, transactionToCreateWire } from './transaction.mapper';
import type { TransactionWire } from './wire.types';

const cardWire: TransactionWire = {
  id: 't1', date: '2026-05-10', label: 'Tênis', value: 300, categorySlug: 'lazer',
  holder: 'Mateus', method: 'CARD', cardId: 'card-db-1', recurring: false,
  installments: { n: 1, of: 3 },
};

describe('wireToTransaction', () => {
  it('maps a CARD payment to method=cardId and cat=categorySlug', () => {
    const t = wireToTransaction(cardWire);
    expect(t.cat).toBe('lazer');
    expect(t.method).toBe('card-db-1');
    expect(t.holder).toBe('Mateus');
    expect(t.installments).toEqual({ n: 1, of: 3 });
  });

  it('maps a PIX payment to method="pix"', () => {
    const t = wireToTransaction({ ...cardWire, method: 'PIX', cardId: null });
    expect(t.method).toBe('pix');
  });
});

describe('transactionToCreateWire', () => {
  it('maps method="pix" to { method: "PIX" } without cardId', () => {
    const w = transactionToCreateWire({
      date: '2026-05-10', label: 'Pix', value: 50, cat: 'mercado', holder: 'shared',
      method: 'pix', installments: null,
    } as never);
    expect(w).toMatchObject({ categorySlug: 'mercado', holder: 'shared', method: 'PIX' });
    expect(w.cardId).toBeUndefined();
  });

  it('maps a card method to { method: "CARD", cardId }', () => {
    const w = transactionToCreateWire({
      date: '2026-05-10', label: 'Tênis', value: 300, cat: 'lazer', holder: 'Mateus',
      method: 'card-db-1', installments: { n: 1, of: 3 },
    } as never);
    expect(w).toMatchObject({ method: 'CARD', cardId: 'card-db-1', installments: { n: 1, of: 3 } });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx nx test ui-financial --test-file=transaction.mapper.spec.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Create the wire types**

`wire.types.ts`:

```ts
export interface TransactionWire {
  id: string;
  date: string;
  label: string;
  value: number;
  categorySlug: string;
  holder: string;
  method: 'PIX' | 'CARD';
  cardId: string | null;
  note?: string;
  recurring: boolean;
  fixedExpenseId?: string;
  installments: { n: number; of: number } | null;
}

export interface CreateTransactionWire {
  date: string;
  label: string;
  value: number;
  categorySlug: string;
  holder: string;
  method: 'PIX' | 'CARD';
  cardId?: string;
  note?: string;
  recurring?: boolean;
  installments?: { n: number; of: number };
}
```

- [ ] **Step 4: Implement the mapper**

`transaction.mapper.ts`:

```ts
import type { Transaction, Holder } from '@caixa-familia/shared-types';
import type { TransactionWire, CreateTransactionWire } from './wire.types';

export function wireToTransaction(w: TransactionWire): Transaction {
  return {
    id: w.id,
    date: w.date,
    label: w.label,
    value: w.value,
    cat: w.categorySlug,
    holder: w.holder as Holder,
    method: w.method === 'CARD' && w.cardId ? w.cardId : 'pix',
    installments: w.installments,
    note: w.note,
    recurring: w.recurring,
    fixedRef: w.fixedExpenseId,
  };
}

export function transactionToCreateWire(t: Transaction): CreateTransactionWire {
  const isPix = t.method === 'pix';
  return {
    date: t.date,
    label: t.label,
    value: t.value,
    categorySlug: t.cat,
    holder: t.holder,
    method: isPix ? 'PIX' : 'CARD',
    cardId: isPix ? undefined : t.method,
    note: t.note,
    recurring: t.recurring,
    installments: t.installments ?? undefined,
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx nx test ui-financial --test-file=transaction.mapper.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/ui-financial/src/app/core/api/wire.types.ts apps/ui-financial/src/app/core/api/transaction.mapper.ts apps/ui-financial/src/app/core/api/transaction.mapper.spec.ts
git commit -m "feat(ui-financial): transaction wire types and mapper"
```

---

## Task 8: UI — TransactionApiService

**Files:**
- Create: `apps/ui-financial/src/app/core/api/transaction-api.service.ts`
- Test: `apps/ui-financial/src/app/core/api/transaction-api.service.spec.ts`

**Interfaces:**
- Consumes: `TransactionWire`, `CreateTransactionWire`, `environment.apiBaseUrl`.
- Produces: `TransactionApiService` with `list(params: { year: number; month: number; holder?: string }): Observable<TransactionWire[]>` → `GET {apiBaseUrl}/transactions`; `create(body: CreateTransactionWire): Observable<TransactionWire>` → `POST {apiBaseUrl}/transactions`; `remove(id: string): Observable<void>` → `DELETE {apiBaseUrl}/transactions/:id`.

- [ ] **Step 1: Write the failing HTTP test**

Create `transaction-api.service.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TransactionApiService } from './transaction-api.service';
import { environment } from '../../../environments/environment';

describe('TransactionApiService', () => {
  let service: TransactionApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TransactionApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TransactionApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('GETs transactions with year/month params', () => {
    service.list({ year: 2026, month: 5 }).subscribe();
    const req = httpMock.expectOne(
      `${environment.apiBaseUrl}/transactions?year=2026&month=5`,
    );
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('DELETEs by id', () => {
    service.remove('t1').subscribe();
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/transactions/t1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx nx test ui-financial --test-file=transaction-api.service.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the service**

`transaction-api.service.ts`:

```ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { TransactionWire, CreateTransactionWire } from './wire.types';

@Injectable({ providedIn: 'root' })
export class TransactionApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/transactions`;

  list(params: { year: number; month: number; holder?: string }): Observable<TransactionWire[]> {
    let hp = new HttpParams().set('year', params.year).set('month', params.month);
    if (params.holder && params.holder !== 'todos') hp = hp.set('holder', params.holder);
    return this.http.get<TransactionWire[]>(this.base, { params: hp });
  }

  create(body: CreateTransactionWire): Observable<TransactionWire> {
    return this.http.post<TransactionWire>(this.base, body);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx nx test ui-financial --test-file=transaction-api.service.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/ui-financial/src/app/core/api/transaction-api.service.ts apps/ui-financial/src/app/core/api/transaction-api.service.spec.ts
git commit -m "feat(ui-financial): TransactionApiService"
```

---

## Task 9: UI — catalog (categories + cards) mapper and API service

**Files:**
- Modify: `apps/ui-financial/src/app/core/api/wire.types.ts` (add `CategoryWire`)
- Create: `apps/ui-financial/src/app/core/api/catalog.mapper.ts`
- Test: `apps/ui-financial/src/app/core/api/catalog.mapper.spec.ts`
- Create: `apps/ui-financial/src/app/core/api/catalog-api.service.ts`
- Test: `apps/ui-financial/src/app/core/api/catalog-api.service.spec.ts`

**Interfaces:**
- Produces:
  - `CategoryWire` = `{ id; slug; label; color; budget }`.
  - `wireToCategory(w: CategoryWire): Category` where `Category.id = w.slug` (so `catBy()[tx.cat]` resolves).
  - Cards arrive already shaped as `shared-types` `Card` (Task 3), so no card mapper is needed.
  - `CatalogApiService` with `listCategories(): Observable<CategoryWire[]>` → `GET {apiBaseUrl}/categories`; `listCards(): Observable<Card[]>` → `GET {apiBaseUrl}/cards`.

- [ ] **Step 1: Write the failing category-mapper test**

Create `catalog.mapper.spec.ts`:

```ts
import { wireToCategory } from './catalog.mapper';

describe('wireToCategory', () => {
  it('uses slug as the id so transaction.cat lookups resolve', () => {
    const c = wireToCategory({ id: 'db-1', slug: 'mercado', label: 'Mercado', color: '#0a0', budget: 800 });
    expect(c).toEqual({ id: 'mercado', label: 'Mercado', color: '#0a0', budget: 800 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx nx test ui-financial --test-file=catalog.mapper.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Add `CategoryWire` and implement the mapper**

In `wire.types.ts` add:

```ts
export interface CategoryWire {
  id: string;
  slug: string;
  label: string;
  color: string;
  budget: number;
}
```

Create `catalog.mapper.ts`:

```ts
import type { Category } from '@caixa-familia/shared-types';
import type { CategoryWire } from './wire.types';

export function wireToCategory(w: CategoryWire): Category {
  return { id: w.slug, label: w.label, color: w.color, budget: w.budget };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx nx test ui-financial --test-file=catalog.mapper.spec.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing CatalogApiService test**

Create `catalog-api.service.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CatalogApiService } from './catalog-api.service';
import { environment } from '../../../environments/environment';

describe('CatalogApiService', () => {
  let service: CatalogApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CatalogApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CatalogApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('GETs categories', () => {
    service.listCategories().subscribe();
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/categories`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('GETs cards', () => {
    service.listCards().subscribe();
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/cards`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx nx test ui-financial --test-file=catalog-api.service.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 7: Implement the service**

`catalog-api.service.ts`:

```ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Card } from '@caixa-familia/shared-types';
import { environment } from '../../../environments/environment';
import type { CategoryWire } from './wire.types';

@Injectable({ providedIn: 'root' })
export class CatalogApiService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  listCategories(): Observable<CategoryWire[]> {
    return this.http.get<CategoryWire[]>(`${this.base}/categories`);
  }

  listCards(): Observable<Card[]> {
    return this.http.get<Card[]>(`${this.base}/cards`);
  }
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx nx test ui-financial --test-file=catalog-api.service.spec.ts`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add apps/ui-financial/src/app/core/api
git commit -m "feat(ui-financial): catalog mapper and CatalogApiService"
```

---

## Task 10: UI — AppDataService HTTP-backed loads and writes

**Files:**
- Modify: `apps/ui-financial/src/app/layout/app-data.service.ts`
- Test: `apps/ui-financial/src/app/layout/app-data.service.spec.ts` (create)

**Interfaces:**
- Consumes: `TransactionApiService`, `CatalogApiService`, `wireToTransaction`, `transactionToCreateWire`, `wireToCategory`.
- Produces on `AppDataService`:
  - signals `transactionsLoading: Signal<boolean>`, `transactionsError: Signal<string|null>`.
  - `loadTransactions(): void` (uses `currentMonth()`), `loadCatalog(): void` (categories + cards), `createTransaction(t: Transaction): void`, `removeTransaction(id: string): void`.
  - Keeps existing signals (`transactions`, `categories`, `cards`, `catBy`, `cardBy`, ...) as the source components read.

- [ ] **Step 1: Write the failing AppDataService test**

Create `app-data.service.spec.ts`. Provide the API services as spies via HttpTesting-free stubs:

```ts
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AppDataService } from './app-data.service';
import { TransactionApiService } from '../core/api/transaction-api.service';
import { CatalogApiService } from '../core/api/catalog-api.service';
import type { TransactionWire } from '../core/api/wire.types';

const wire: TransactionWire = {
  id: 't1', date: '2026-05-10', label: 'Mercado', value: 100, categorySlug: 'mercado',
  holder: 'Mateus', method: 'PIX', cardId: null, recurring: false, installments: null,
};

describe('AppDataService.loadTransactions', () => {
  it('fills the transactions signal with mapped domain objects', () => {
    const txApi = { list: jest.fn(() => of([wire])), create: jest.fn(), remove: jest.fn() };
    const catApi = { listCategories: jest.fn(() => of([])), listCards: jest.fn(() => of([])) };
    TestBed.configureTestingModule({
      providers: [
        AppDataService,
        { provide: TransactionApiService, useValue: txApi },
        { provide: CatalogApiService, useValue: catApi },
      ],
    });
    const svc = TestBed.inject(AppDataService);
    svc.loadTransactions();
    expect(txApi.list).toHaveBeenCalledWith(
      expect.objectContaining({ year: svc.currentMonth().year, month: svc.currentMonth().month }),
    );
    expect(svc.transactions()[0]).toMatchObject({ id: 't1', cat: 'mercado', holder: 'Mateus', method: 'pix' });
    expect(svc.transactionsLoading()).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx nx test ui-financial --test-file=app-data.service.spec.ts`
Expected: FAIL — `loadTransactions`/`transactionsLoading` do not exist.

- [ ] **Step 3: Rewrite AppDataService to be HTTP-backed**

Replace `app-data.service.ts`. Start signals empty (no static mock import for the connected resources; keep mock imports only for the still-mock resources — incomes, goals, fixed, history):

```ts
import { Injectable, signal, computed, inject } from '@angular/core';
import type { Card, Category, HolderFilter, MonthContext, Transaction } from '@caixa-familia/shared-types';
import {
  MOCK_GOALS, MOCK_INCOMES, MOCK_FIXED, MOCK_HISTORY, MOCK_INCOME_HISTORY, CURRENT_MONTH,
} from '@caixa-familia/shared-mocks';
import { TransactionApiService } from '../core/api/transaction-api.service';
import { CatalogApiService } from '../core/api/catalog-api.service';
import { wireToTransaction, transactionToCreateWire } from '../core/api/transaction.mapper';
import { wireToCategory } from '../core/api/catalog.mapper';

@Injectable({ providedIn: 'root' })
export class AppDataService {
  private txApi = inject(TransactionApiService);
  private catApi = inject(CatalogApiService);

  readonly cards = signal<Card[]>([]);
  readonly transactions = signal<Transaction[]>([]);
  readonly categories = signal<Category[]>([]);

  // still-mock resources (out of scope for this slice)
  readonly goals = signal(MOCK_GOALS);
  readonly incomes = signal(MOCK_INCOMES);
  readonly fixed = signal(MOCK_FIXED);
  readonly history = signal(MOCK_HISTORY);
  readonly incomeHistory = signal(MOCK_INCOME_HISTORY);

  readonly catBy = computed(() => Object.fromEntries(this.categories().map((c) => [c.id, c])));
  readonly cardBy = computed(() => Object.fromEntries(this.cards().map((c) => [c.id, c])));

  readonly currentMonth = signal<MonthContext & { label: string; short: string }>(CURRENT_MONTH);
  readonly holderFilter = signal<HolderFilter>('todos');
  readonly monthLabel = computed(() => this.currentMonth().label);

  readonly transactionsLoading = signal(false);
  readonly transactionsError = signal<string | null>(null);

  loadCatalog(): void {
    this.catApi.listCategories().subscribe((rows) => this.categories.set(rows.map(wireToCategory)));
    this.catApi.listCards().subscribe((rows) => this.cards.set(rows));
  }

  loadTransactions(): void {
    const { year, month } = this.currentMonth();
    this.transactionsLoading.set(true);
    this.transactionsError.set(null);
    this.txApi.list({ year, month }).subscribe({
      next: (rows) => {
        this.transactions.set(rows.map(wireToTransaction));
        this.transactionsLoading.set(false);
      },
      error: () => {
        this.transactionsError.set('Falha ao carregar transações');
        this.transactionsLoading.set(false);
      },
    });
  }

  createTransaction(t: Transaction): void {
    this.txApi.create(transactionToCreateWire(t)).subscribe({
      next: () => this.loadTransactions(),
      error: () => this.transactionsError.set('Falha ao criar transação'),
    });
  }

  removeTransaction(id: string): void {
    this.txApi.remove(id).subscribe({
      next: () => this.loadTransactions(),
      error: () => this.transactionsError.set('Falha ao remover transação'),
    });
  }
}
```

Note: `catBy`/`cardBy` change from `signal` to `computed`. Components call them as functions (`data.catBy()`), so the call sites are unchanged.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx nx test ui-financial --test-file=app-data.service.spec.ts`
Expected: PASS.

- [ ] **Step 5: Fix compile fallout from removed signals**

Run: `npx nx build ui-financial`
Some components referenced `data.incomeHistory`, `data.catBy`, etc.; those still exist. If any referenced a removed static field, fix by reading the new signals. Address every reported type error until the build is clean.

- [ ] **Step 6: Commit**

```bash
git add apps/ui-financial/src/app/layout/app-data.service.ts apps/ui-financial/src/app/layout/app-data.service.spec.ts
git commit -m "feat(ui-financial): AppDataService loads transactions/catalog over HTTP"
```

---

## Task 11: UI — trigger loads and wire create/delete

**Files:**
- Modify: `apps/ui-financial/src/app/layout/app-shell.component.ts`
- Modify: `apps/ui-financial/src/app/features/expense-drawer/expense-drawer.component.ts:71-87`
- Modify: `apps/ui-financial/src/app/features/tx-detail-drawer/tx-detail-drawer.component.ts`
- Modify: `apps/ui-financial/src/app/features/transactions/transactions.component.ts` (guard write actions behind `AuthService.canWrite` if it renders create/delete controls)

**Interfaces:**
- Consumes: `AppDataService.loadTransactions/loadCatalog/createTransaction/removeTransaction`, `AuthService.canWrite`.

- [ ] **Step 1: Trigger initial loads after auth**

In `app-shell.component.ts` `ngOnInit` (read the file first), after `AuthService.init()` resolves authentication, call `loadCatalog()` and `loadTransactions()`. Simplest: in `AuthService.init()`'s `checkAuth` subscribe, when `isAuthenticated`, invoke a callback; or in the shell, react to `auth.isAuthenticated()` becoming true via an `effect`:

```ts
effect(() => {
  if (this.auth.isAuthenticated()) {
    this.data.loadCatalog();
    this.data.loadTransactions();
  }
});
```

Place the `effect` in the shell constructor (injection context). Import `effect` from `@angular/core`.

- [ ] **Step 2: Wire the expense drawer to the API create**

In `expense-drawer.component.ts` `save()`, replace the direct signal mutation (`this.data.transactions.update(...)`) with:

```ts
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
```

- [ ] **Step 3: Wire the detail drawer to the API delete**

Read `tx-detail-drawer.component.ts`. Where it currently removes a transaction from the signal, replace with `this.data.removeTransaction(id)` (use the selected transaction's `id`). Keep the existing confirm-modal flow if present.

- [ ] **Step 4: Gate write controls behind `canWrite` (if applicable)**

If `transactions.component` / drawers render "add"/"delete" buttons, inject `AuthService` and disable/hide those controls when `!auth.canWrite()`. (A `viewer` would get a 403 from the API otherwise.)

- [ ] **Step 5: Verify build and unit tests**

Run: `npx nx build ui-financial && npx nx test ui-financial`
Expected: build succeeds; all unit tests pass. Fix the existing `fixed.component.spec.ts` if it relied on removed `AppDataService` mock fields (update it to the new signal shape).

- [ ] **Step 6: Commit**

```bash
git add apps/ui-financial/src/app
git commit -m "feat(ui-financial): trigger data loads and wire transaction create/delete to API"
```

---

## Task 12: Manual smoke test + developer docs

**Files:**
- Modify: `README.md` (a "Rodando localmente (UI + API)" section)

- [ ] **Step 1: Bring up infra and data**

```bash
docker-compose up -d
npx prisma migrate deploy
npx prisma db seed
```

Expected: postgres + keycloak healthy; seed prints `Seed concluído.`

- [ ] **Step 2: Start API and UI**

```bash
npx nx serve api-financial
npx nx serve ui-financial
```

Expected: API logs `🚀 api-financial em http://localhost:3000/api`; UI serves at `http://localhost:4200`.

- [ ] **Step 3: Smoke the vertical slice in the browser**

1. Open `http://localhost:4200` → redirected to Keycloak.
2. Log in as `mateus` / `mateus`.
3. Navigate to Transactions → the current month's seeded transactions render with correct category labels and card chips.
4. Create a transaction via the expense drawer → it appears after refetch.
5. Delete a transaction via the detail drawer → it disappears after refetch.
6. Confirm the network tab shows `Authorization: Bearer ...` on `/api/*` requests.

Expected: all steps pass. Record any failure and debug before proceeding.

- [ ] **Step 4: Document the local run**

Add a `README.md` section covering: `docker-compose up -d`, migrate + seed, `nx serve` for both apps, the Keycloak URLs (`/admin` with `admin`/`admin`; app login with `mateus`/`mateus` or `thais`/`thais`).

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: local run instructions for connected UI + API"
```

---

## Self-Review Notes

- **Spec coverage:** Auth foundation (Tasks 4–6), data layer + mappers (Tasks 7–10), transactions read/create/delete (Tasks 1–2, 8, 11), supporting category/card reads (Tasks 3, 9), backend holder alignment (Tasks 1–3), error/loading signals (Task 10), tests (each task), smoke (Task 12). All spec sections map to a task.
- **Scope note / deviation from spec:** the spec named "only `transaction.mapper`" as the backend change. Planning revealed the same `member.name` alignment must also cover transaction **create** (Task 2) and the **card list** (Task 3) — otherwise create loses the holder and the still-mock cards page regresses. Same approved "align the API" pattern; flagged for the reviewer.
- **Type consistency:** `TransactionWire`/`CreateTransactionWire`/`CategoryWire` in `wire.types.ts` are consumed unchanged by Tasks 8–10; `wireToTransaction`/`transactionToCreateWire`/`wireToCategory` names are stable across Tasks 7, 9, 10; `AppDataService` method names (`loadTransactions`, `loadCatalog`, `createTransaction`, `removeTransaction`) are stable across Tasks 10–11.
- **Open verification for the executor:** exact provider/interceptor API of the installed `angular-auth-oidc-client` version (Task 5); the Prisma relation name for a card's owner member (Task 3, Step 1); the shell component's lifecycle hook location (Task 11).
