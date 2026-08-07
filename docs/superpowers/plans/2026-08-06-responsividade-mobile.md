# Responsividade mobile-first (`ui-financial`) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar as 16 telas do `ui-financial` utilizáveis em celular, sem regressão no desktop.

**Architecture:** Mobile-first com **um único breakpoint** (`min-width: 768px`) exposto por um
mixin SCSS. O corpo de cada seletor passa a ser o celular; o mixin devolve o layout de hoje.
Onde o CSS não basta — tabelas cujas células contêm componentes Angular — um `ViewportService`
baseado em `matchMedia` expõe `isDesktop` como signal, e o template escolhe entre `<table>` e
lista de cards.

**Tech Stack:** Angular 20 standalone + signals (zoneless), SCSS, Jest (`jest-preset-angular`),
Nx.

**Spec:** `docs/superpowers/specs/2026-08-06-responsividade-mobile-design.md`

## Global Constraints

- **Branch:** `feat/upgrading-the-system`. Commits diretos, sem PR.
- **Breakpoint único:** `min-width: 768px`. Não introduzir outros valores.
- **Mobile-first:** o corpo do seletor é o celular; `@include r.desktop` devolve o desktop.
  Nunca escrever `max-width`.
- **`nx build ui-financial` é o gate real.** O Jest da UI não faz type-check estrito de
  template — a suíte pode passar verde com o build quebrado. Rodar build ao final de cada task.
- **Nenhum stub `disabled` é habilitado neste plano.** Isso é escopo dos Projetos 2 e 3.
- **Nenhum dado novo é buscado.** Os dois ramos (tabela/cards) leem os mesmos signals.
- **Altura:** usar `100dvh`, nunca `100vh`.
- **Alvo de toque no mobile:** mínimo 44px.
- Todo texto de UI em **pt-BR**.

---

### Task 1: Fundação CSS — mixin, includePaths e budget

Sem isto nenhuma outra task compila. Inclui o ajuste de budget porque ele **já** bloqueia:
`settings.component.scss` tem 5.820 B e o `maximumError` é 8 kB.

**Files:**
- Create: `apps/ui-financial/src/styles/_responsive.scss`
- Modify: `apps/ui-financial/project.json` (budgets + `stylePreprocessorOptions`)

**Interfaces:**
- Consumes: nada.
- Produces: `@use 'responsive' as r;` + `@include r.desktop { ... }`, disponível em qualquer
  `.scss` de componente do `ui-financial`.

- [ ] **Step 1: Criar o mixin**

`apps/ui-financial/src/styles/_responsive.scss`:

```scss
// Breakpoint único do projeto. Mobile-first: o corpo do seletor é o celular
// e este mixin devolve o layout de desktop. Não adicionar outros breakpoints
// sem atualizar a spec 2026-08-06-responsividade-mobile-design.md.
$bp-desktop: 768px;

@mixin desktop {
  @media (min-width: $bp-desktop) {
    @content;
  }
}
```

- [ ] **Step 2: Registrar o includePaths**

Em `apps/ui-financial/project.json`, dentro de `targets.build.options` (irmão de `"styles"`):

```json
"stylePreprocessorOptions": {
  "includePaths": ["apps/ui-financial/src/styles"]
}
```

- [ ] **Step 3: Subir o budget de estilo**

Em `apps/ui-financial/project.json`, `targets.build.configurations.production.budgets`,
substituir o bloco `anyComponentStyle`:

```json
{
  "type": "anyComponentStyle",
  "maximumWarning": "8kb",
  "maximumError": "16kb"
}
```

- [ ] **Step 4: Provar que o mixin resolve**

Adicionar temporariamente ao topo de `apps/ui-financial/src/app/layout/app-shell.component.scss`:

```scss
@use 'responsive' as r;
```

Run: `npx nx build ui-financial`
Expected: build **verde**. Se falhar com `Can't find stylesheet to import`, o `includePaths`
está errado — corrigir antes de seguir. Manter o `@use` (a Task 6 vai usá-lo).

- [ ] **Step 5: Commit**

```bash
git add apps/ui-financial/src/styles/_responsive.scss apps/ui-financial/project.json apps/ui-financial/src/app/layout/app-shell.component.scss
git commit -m "build(ui-financial): add the responsive mixin and lift the style budget"
```

---

### Task 2: `ViewportService`

**Files:**
- Create: `apps/ui-financial/src/app/core/viewport.service.ts`
- Create: `apps/ui-financial/src/app/core/viewport.service.spec.ts`
- Modify: `apps/ui-financial/src/test-setup.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `ViewportService` com `readonly isDesktop: Signal<boolean>`. Injetável com
  `inject(ViewportService)`. Todas as tasks de tabela dependem dele.

> **Gotcha que quebra a suíte inteira:** o jsdom **não implementa `window.matchMedia`**. No
> momento em que um componente injetar o `ViewportService`, todo spec que renderiza esse
> componente estoura `window.matchMedia is not a function`. Por isso o mock global entra no
> `test-setup.ts` **nesta task**, antes de qualquer consumidor existir.

- [ ] **Step 1: Mock global de `matchMedia`**

Em `apps/ui-financial/src/test-setup.ts`, após a chamada de `setupZonelessTestEnv`:

```ts
// jsdom não implementa matchMedia. Default: desktop — preserva o comportamento
// que os specs pré-responsividade já assumiam. Specs de mobile sobrescrevem
// injetando um ViewportService falso.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: true,
    media: query,
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }),
});
```

- [ ] **Step 2: Escrever o teste que falha**

`apps/ui-financial/src/app/core/viewport.service.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { ViewportService } from './viewport.service';

type Listener = (e: { matches: boolean }) => void;

function mockMatchMedia(initial: boolean) {
  const listeners: Listener[] = [];
  const mql = {
    matches: initial,
    media: '(min-width: 768px)',
    addEventListener: (_: string, fn: Listener) => listeners.push(fn),
    removeEventListener: jest.fn(),
  };
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: () => mql,
  });
  return { emit: (matches: boolean) => listeners.forEach(fn => fn({ matches })) };
}

afterEach(() => TestBed.resetTestingModule());

describe('ViewportService', () => {
  it('starts desktop when the query already matches', () => {
    mockMatchMedia(true);
    expect(TestBed.inject(ViewportService).isDesktop()).toBe(true);
  });

  it('starts mobile when the query does not match', () => {
    mockMatchMedia(false);
    expect(TestBed.inject(ViewportService).isDesktop()).toBe(false);
  });

  it('follows the media query when the viewport changes', () => {
    const { emit } = mockMatchMedia(false);
    const vp = TestBed.inject(ViewportService);
    expect(vp.isDesktop()).toBe(false);
    emit(true);
    expect(vp.isDesktop()).toBe(true);
    emit(false);
    expect(vp.isDesktop()).toBe(false);
  });

  it('queries the single project breakpoint', () => {
    mockMatchMedia(true);
    const spy = jest.spyOn(window, 'matchMedia');
    TestBed.inject(ViewportService);
    expect(spy).toHaveBeenCalledWith('(min-width: 768px)');
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx nx test ui-financial --testPathPattern=viewport`
Expected: FAIL — `Cannot find module './viewport.service'`.

- [ ] **Step 4: Implementar**

`apps/ui-financial/src/app/core/viewport.service.ts`:

```ts
import { Injectable, signal } from '@angular/core';

// Espelha $bp-desktop de styles/_responsive.scss. Os dois precisam andar juntos:
// se um mudar sem o outro, a tabela e o CSS discordam sobre o que é desktop.
const DESKTOP_QUERY = '(min-width: 768px)';

@Injectable({ providedIn: 'root' })
export class ViewportService {
  private readonly desktop = signal(false);

  /** `true` a partir de 768px de largura. */
  readonly isDesktop = this.desktop.asReadonly();

  constructor() {
    const mql = window.matchMedia(DESKTOP_QUERY);
    this.desktop.set(mql.matches);
    mql.addEventListener('change', e => this.desktop.set(e.matches));
  }
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx nx test ui-financial --testPathPattern=viewport`
Expected: PASS, 4 testes.

- [ ] **Step 6: Confirmar que a suíte inteira segue verde**

Run: `npx nx test ui-financial`
Expected: PASS. Se algum spec quebrar aqui, é o mock do Step 1 — corrigir antes de seguir.

- [ ] **Step 7: Commit**

```bash
git add apps/ui-financial/src/app/core/viewport.service.ts apps/ui-financial/src/app/core/viewport.service.spec.ts apps/ui-financial/src/test-setup.ts
git commit -m "feat(ui-financial): add a viewport service backed by matchMedia"
```

---

### Task 3: Extrair `NAV_ITEMS` para fonte única

**Files:**
- Create: `apps/ui-financial/src/app/layout/nav-items.ts`
- Modify: `apps/ui-financial/src/app/layout/sidebar.component.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `NavItem` (interface), `NAV_ITEMS`, `OPERACAO`, `PLANEJAMENTO`, `SISTEMA`,
  `BOTTOM_NAV_IDS`, `MORE_IDS`, `navItem(id)`. Consumido pelas Tasks 5 e 6.

- [ ] **Step 1: Criar o módulo**

`apps/ui-financial/src/app/layout/nav-items.ts`:

```ts
export interface NavItem {
  id: string;
  label: string;
  icon: string;
  route: string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard',    label: 'Dashboard',     icon: 'home',     route: '/dashboard' },
  { id: 'transactions', label: 'Transações',    icon: 'list',     route: '/transactions' },
  { id: 'cards',        label: 'Cartões',       icon: 'card',     route: '/cards' },
  { id: 'fixed',        label: 'Gastos fixos',  icon: 'repeat',   route: '/fixed' },
  { id: 'budgets',      label: 'Orçamentos',    icon: 'target',   route: '/budgets' },
  { id: 'goals',        label: 'Metas',         icon: 'flame',    route: '/goals' },
  { id: 'reports',      label: 'Relatórios',    icon: 'chart',    route: '/reports' },
  { id: 'settings',     label: 'Configurações', icon: 'settings', route: '/settings' },
];

/** Grupos da sidebar (desktop). */
export const OPERACAO = NAV_ITEMS.slice(0, 4);
export const PLANEJAMENTO = NAV_ITEMS.slice(4, 7);
export const SISTEMA = NAV_ITEMS.slice(7);

export function navItem(id: string): NavItem {
  const found = NAV_ITEMS.find(i => i.id === id);
  if (!found) throw new Error(`NavItem desconhecido: ${id}`);
  return found;
}

/** Destinos fixos da bottom-nav. O botão central de novo gasto não é rota. */
export const BOTTOM_NAV_IDS = ['dashboard', 'transactions', 'cards'] as const;

/** Tudo que não coube na bottom-nav, na ordem da folha "Mais". */
export const MORE_IDS = ['fixed', 'budgets', 'goals', 'reports', 'settings'] as const;
```

> Rótulo curto na bottom-nav: "Início" para `dashboard` e "Transaç." para `transactions` são
> aplicados no template da Task 5, não aqui — a sidebar continua com os rótulos longos.

- [ ] **Step 2: Apontar a sidebar para a fonte única**

Substituir a interface `NavItem`, a const `NAV_ITEMS` e o corpo da classe em
`sidebar.component.ts` por:

```ts
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent } from '../ui/icon/icon.component';
import { OPERACAO, PLANEJAMENTO, SISTEMA } from './nav-items';

@Component({
  selector: 'cf-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  operacao = OPERACAO;
  planejamento = PLANEJAMENTO;
  sistema = SISTEMA;
}
```

O template não muda: os nomes das propriedades foram preservados de propósito.

- [ ] **Step 3: Verificar**

Run: `npx nx test ui-financial && npx nx build ui-financial`
Expected: ambos PASS. É refactor puro — nenhum comportamento muda.

- [ ] **Step 4: Commit**

```bash
git add apps/ui-financial/src/app/layout/nav-items.ts apps/ui-financial/src/app/layout/sidebar.component.ts
git commit -m "refactor(ui-financial): single source for the navigation items"
```

---

### Task 4: Mover a propriedade do drawer de novo gasto para o `AppShell`

O FAB da bottom-nav é **irmão** do topbar e não alcança o `drawerOpen` local dele.

**Files:**
- Modify: `apps/ui-financial/src/app/layout/app-shell.component.ts`
- Modify: `apps/ui-financial/src/app/layout/app-shell.component.html`
- Modify: `apps/ui-financial/src/app/layout/topbar.component.ts`
- Modify: `apps/ui-financial/src/app/layout/topbar.component.html`
- Modify: `apps/ui-financial/src/app/layout/topbar.component.spec.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `AppShellComponent.expenseDrawerOpen: WritableSignal<boolean>` e
  `AppShellComponent.openExpenseDrawer()`. `TopBarComponent` emite `(newExpense)`.
  A Task 5 liga o FAB no mesmo `openExpenseDrawer()`.

- [ ] **Step 1: Escrever o teste que falha**

Substituir o `build()` e adicionar um `describe` em `topbar.component.spec.ts`. O `build()`
passa a devolver o `fixture`:

```ts
  const fixture = TestBed.createComponent(TopBarComponent);
  fixture.detectChanges();
  return { component: fixture.componentInstance, data, fixture };
}
```

E o novo bloco, ao final do arquivo:

```ts
describe('TopBarComponent — new expense', () => {
  it('emits newExpense instead of owning the drawer', () => {
    const { component } = build();
    const seen: void[] = [];
    component.newExpense.subscribe(() => seen.push(undefined));
    component.requestNewExpense();
    expect(seen.length).toBe(1);
  });

  it('does not render the expense drawer itself', () => {
    const { fixture } = build();
    expect(fixture.nativeElement.querySelector('cf-expense-drawer')).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx nx test ui-financial --testPathPattern=topbar`
Expected: FAIL — `component.newExpense` é `undefined`.

- [ ] **Step 3: Enxugar o topbar**

Em `topbar.component.ts`: remover o import de `ExpenseDrawerComponent`, tirá-lo de `imports`,
remover `drawerOpen`, e acrescentar:

```ts
import { Component, inject, output } from '@angular/core';
```

```ts
  /** O drawer é do AppShell — topbar e bottom-nav são só gatilhos. */
  readonly newExpense = output<void>();

  requestNewExpense() {
    this.newExpense.emit();
  }
```

Em `topbar.component.html`: trocar `(click)="drawerOpen.set(true)"` por
`(click)="requestNewExpense()"` e **remover** o bloco final:

```html
@if (drawerOpen()) {
  <cf-expense-drawer (closed)="drawerOpen.set(false)" />
}
```

- [ ] **Step 4: Dar o drawer ao shell**

`app-shell.component.ts` — acrescentar aos imports do `@Component` o
`ExpenseDrawerComponent`, e à classe:

```ts
  protected readonly expenseDrawerOpen = signal(false);

  openExpenseDrawer() {
    this.expenseDrawerOpen.set(true);
  }
```

(Importar `signal` de `@angular/core` e `ExpenseDrawerComponent` de
`../features/expense-drawer/expense-drawer.component`.)

`app-shell.component.html`:

```html
<div class="shell">
  <cf-sidebar class="shell__sidebar" />
  <div class="shell__main">
    <cf-topbar (newExpense)="openExpenseDrawer()" />
    <div class="shell__content">
      <router-outlet />
    </div>
  </div>
</div>

@if (expenseDrawerOpen()) {
  <cf-expense-drawer (closed)="expenseDrawerOpen.set(false)" />
}

<cf-toast-container />
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx nx test ui-financial --testPathPattern=topbar`
Expected: PASS.

- [ ] **Step 6: Suíte e build**

Run: `npx nx test ui-financial && npx nx build ui-financial`
Expected: ambos PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/ui-financial/src/app/layout/
git commit -m "refactor(ui-financial): let the shell own the new-expense drawer"
```

---

### Task 5: `cf-bottom-nav` e `cf-more-sheet`

**Files:**
- Create: `apps/ui-financial/src/app/layout/bottom-nav.component.ts` / `.html` / `.scss`
- Create: `apps/ui-financial/src/app/layout/bottom-nav.component.spec.ts`
- Create: `apps/ui-financial/src/app/layout/more-sheet.component.ts` / `.html` / `.scss`

**Interfaces:**
- Consumes: `BOTTOM_NAV_IDS`, `MORE_IDS`, `navItem` (Task 3); `AuthService.canWrite()`.
- Produces: `<cf-bottom-nav (newExpense)="…" />` e `<cf-more-sheet (closed)="…" />`.
  A Task 6 monta os dois no shell.

- [ ] **Step 1: Escrever o teste que falha**

`bottom-nav.component.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { BottomNavComponent } from './bottom-nav.component';
import { AuthService } from '../core/auth/auth.service';

function build(canWrite = true) {
  TestBed.configureTestingModule({
    imports: [BottomNavComponent],
    providers: [
      provideRouter([]),
      { provide: AuthService, useValue: { canWrite: signal(canWrite) } },
    ],
  });
  const fixture = TestBed.createComponent(BottomNavComponent);
  fixture.detectChanges();
  return fixture;
}

afterEach(() => TestBed.resetTestingModule());

describe('BottomNavComponent', () => {
  it('renders the three fixed destinations', () => {
    const links = build().nativeElement.querySelectorAll('a.bn-item');
    expect(Array.from(links).map((a: any) => a.getAttribute('href'))).toEqual([
      '/dashboard', '/transactions', '/cards',
    ]);
  });

  it('shows the new-expense button to writers', () => {
    expect(build(true).nativeElement.querySelector('.bn-fab')).not.toBeNull();
  });

  it('hides the new-expense button from readers', () => {
    expect(build(false).nativeElement.querySelector('.bn-fab')).toBeNull();
  });

  it('emits newExpense when the button is pressed', () => {
    const fixture = build(true);
    const seen: void[] = [];
    fixture.componentInstance.newExpense.subscribe(() => seen.push(undefined));
    fixture.nativeElement.querySelector('.bn-fab').click();
    expect(seen.length).toBe(1);
  });

  it('toggles the more sheet', () => {
    const fixture = build();
    expect(fixture.nativeElement.querySelector('cf-more-sheet')).toBeNull();
    fixture.nativeElement.querySelector('.bn-more').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('cf-more-sheet')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx nx test ui-financial --testPathPattern=bottom-nav`
Expected: FAIL — `Cannot find module './bottom-nav.component'`.

- [ ] **Step 3: Implementar a folha "Mais"**

`more-sheet.component.ts`:

```ts
import { Component, inject, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent } from '../ui/icon/icon.component';
import { AuthService } from '../core/auth/auth.service';
import { MORE_IDS, navItem } from './nav-items';

@Component({
  selector: 'cf-more-sheet',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconComponent],
  templateUrl: './more-sheet.component.html',
  styleUrl: './more-sheet.component.scss',
})
export class MoreSheetComponent {
  protected auth = inject(AuthService);
  protected items = MORE_IDS.map(navItem);
  readonly closed = output<void>();
}
```

`more-sheet.component.html`:

```html
<div class="ms-backdrop" (click)="closed.emit()"></div>
<div class="ms-sheet" role="dialog" aria-label="Mais opções">
  <div class="ms-handle"></div>
  @for (item of items; track item.id) {
    <a
      class="ms-item"
      [routerLink]="item.route"
      routerLinkActive="active"
      (click)="closed.emit()"
    >
      <cf-icon [name]="item.icon" [size]="16" />
      <span>{{ item.label }}</span>
    </a>
  }
  <button class="ms-item" (click)="auth.logout(); closed.emit()">
    <cf-icon name="upload" [size]="16" />
    <span>Sair</span>
  </button>
</div>
```

> "Importar" fica de fora: é um dos botões mortos registrados na spec §10. Colocá-lo na folha
> daria destaque novo a um controle que não faz nada. Entra quando o Projeto 2 decidir.

`more-sheet.component.scss`:

```scss
@use 'responsive' as r;

:host { display: block; }

.ms-backdrop {
  position: fixed; inset: 0;
  background: rgba(15, 20, 30, 0.4);
  z-index: 90;
}
.ms-sheet {
  position: fixed; left: 0; right: 0; bottom: 0;
  z-index: 91;
  background: var(--surface);
  border-radius: 14px 14px 0 0;
  padding: 10px 12px calc(12px + env(safe-area-inset-bottom));
  box-shadow: 0 -8px 28px rgba(0, 0, 0, 0.18);
  animation: ms-up 200ms cubic-bezier(.2, .7, .3, 1) both;
}
@keyframes ms-up { from { transform: translateY(100%); } to { transform: translateY(0); } }

.ms-handle {
  width: 34px; height: 4px;
  background: var(--line-strong);
  border-radius: 4px;
  margin: 0 auto 10px;
}
.ms-item {
  display: flex; align-items: center; gap: 12px;
  width: 100%;
  min-height: 44px;
  padding: 0 6px;
  font-size: 14px;
  color: var(--ink-2);
  border-bottom: 1px solid var(--line-soft);
  text-align: left;
}
.ms-item:last-child { border-bottom: 0; }
.ms-item.active { color: var(--ink-1); font-weight: 600; }

@include r.desktop { :host { display: none; } }
```

- [ ] **Step 4: Implementar a bottom-nav**

`bottom-nav.component.ts`:

```ts
import { Component, inject, output, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent } from '../ui/icon/icon.component';
import { AuthService } from '../core/auth/auth.service';
import { BOTTOM_NAV_IDS, navItem } from './nav-items';
import { MoreSheetComponent } from './more-sheet.component';

/** Rótulos encurtados: a barra tem ~70px por item. */
const SHORT: Record<string, string> = {
  dashboard: 'Início',
  transactions: 'Transaç.',
  cards: 'Cartões',
};

@Component({
  selector: 'cf-bottom-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconComponent, MoreSheetComponent],
  templateUrl: './bottom-nav.component.html',
  styleUrl: './bottom-nav.component.scss',
})
export class BottomNavComponent {
  protected auth = inject(AuthService);
  protected items = BOTTOM_NAV_IDS.map(id => ({ ...navItem(id), label: SHORT[id] }));
  protected moreOpen = signal(false);

  readonly newExpense = output<void>();
}
```

`bottom-nav.component.html`:

```html
<nav class="bn" aria-label="Navegação principal">
  @for (item of items; track item.id) {
    <a class="bn-item" [routerLink]="item.route" routerLinkActive="active">
      <cf-icon [name]="item.icon" [size]="18" />
      <span class="bn-label">{{ item.label }}</span>
    </a>
  }

  @if (auth.canWrite()) {
    <button class="bn-fab" (click)="newExpense.emit()" aria-label="Lançar gasto">
      <cf-icon name="plus" [size]="20" />
    </button>
  }

  <button class="bn-item bn-more" (click)="moreOpen.set(!moreOpen())">
    <cf-icon name="grid" [size]="18" />
    <span class="bn-label">Mais</span>
  </button>
</nav>

@if (moreOpen()) {
  <cf-more-sheet (closed)="moreOpen.set(false)" />
}
```

> O FAB fica em **quarto** lugar no DOM (depois dos três destinos) e é reposicionado para o
> centro visual pelo `order` do CSS. A ordem do DOM é a ordem de leitura por teclado/leitor de
> tela; a ordem visual é decoração.

`bottom-nav.component.scss`:

```scss
@use 'responsive' as r;

:host { display: block; }

.bn {
  position: fixed; left: 0; right: 0; bottom: 0;
  z-index: 70;
  display: flex;
  align-items: stretch;
  background: var(--surface);
  border-top: 1px solid var(--line);
  padding-bottom: env(safe-area-inset-bottom);
}

.bn-item {
  flex: 1;
  min-height: 52px;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 2px;
  color: var(--ink-4);
  font-size: 10px;
}
.bn-item.active { color: var(--brand); font-weight: 600; }
.bn-more { order: 5; }

.bn-fab {
  order: 3;
  width: 46px; height: 46px;
  margin: -14px 4px 0;
  border-radius: 50%;
  background: var(--brand);
  color: #fff;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 2px 10px rgba(15, 45, 79, 0.35);
  flex: none;
}

/* Ordem visual: dashboard, transações, [+], cartões, mais */
.bn-item:nth-of-type(1) { order: 1; }
.bn-item:nth-of-type(2) { order: 2; }
.bn-item:nth-of-type(3) { order: 4; }

@include r.desktop { :host { display: none; } }
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx nx test ui-financial --testPathPattern=bottom-nav`
Expected: PASS, 5 testes.

- [ ] **Step 6: Build**

Run: `npx nx build ui-financial`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/ui-financial/src/app/layout/
git commit -m "feat(ui-financial): add the mobile bottom nav and more sheet"
```

---

### Task 6: Shell mobile-first

**Files:**
- Modify: `apps/ui-financial/src/app/layout/app-shell.component.html`
- Modify: `apps/ui-financial/src/app/layout/app-shell.component.scss`
- Modify: `apps/ui-financial/src/app/layout/app-shell.component.ts`

**Interfaces:**
- Consumes: `BottomNavComponent` (Task 5), `openExpenseDrawer()` (Task 4).
- Produces: shell de uma coluna abaixo de 768px.

- [ ] **Step 1: Montar a bottom-nav no shell**

Em `app-shell.component.ts`, acrescentar `BottomNavComponent` aos `imports` do `@Component`
(import de `./bottom-nav.component`).

Em `app-shell.component.html`, inserir logo antes de `<cf-toast-container />`:

```html
<cf-bottom-nav (newExpense)="openExpenseDrawer()" />
```

- [ ] **Step 2: Reescrever o layout mobile-first**

`app-shell.component.scss` inteiro:

```scss
@use 'responsive' as r;

/* Base = celular: coluna única, sem sidebar, rodapé reservado para a bottom-nav. */
.shell {
  display: block;
  width: 100%;
  min-height: 100dvh;
}
.shell__sidebar { display: none; }

.shell__main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 100dvh;
}
.shell__content {
  flex: 1;
  background: var(--bg);
  padding: 12px 12px calc(64px + env(safe-area-inset-bottom));
}

@include r.desktop {
  .shell {
    display: grid;
    grid-template-columns: 200px 1fr;
    height: 100dvh;
    overflow: hidden;
  }
  .shell__sidebar {
    display: block;
    grid-row: 1;
  }
  .shell__main {
    height: 100dvh;
    overflow: hidden;
  }
  .shell__content {
    overflow-y: auto;
    padding: 16px 20px;
  }
}
```

> No celular a rolagem é do documento, não de um contêiner interno — é o que faz a barra de
> endereço do navegador retrair. Por isso `overflow: hidden` e `overflow-y: auto` ficam só no
> ramo de desktop.

- [ ] **Step 3: Verificar**

Run: `npx nx test ui-financial && npx nx build ui-financial`
Expected: ambos PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/ui-financial/src/app/layout/app-shell.component.*
git commit -m "feat(ui-financial): make the shell single-column on phones"
```

---

### Task 7: Topbar no celular

**Files:**
- Modify: `apps/ui-financial/src/app/layout/topbar.component.html`
- Modify: `apps/ui-financial/src/app/layout/topbar.component.scss`

**Interfaces:**
- Consumes: nada novo.
- Produces: topbar de uma linha no celular (mês + avatares de titular).

- [ ] **Step 1: Marcar o que some no celular**

Em `topbar.component.html`, envolver os controles que descem para a folha "Mais". O botão
"Importar" e o bloco `topbar-user` ganham a classe `desktop-only`:

```html
  <button class="topbar-btn ghost desktop-only">
    <cf-icon name="upload" [size]="11" /> Importar
  </button>
```

```html
  @if (auth.isAuthenticated()) {
    <div class="topbar-user desktop-only">
```

E o botão "Lançar gasto" (o FAB cobre o celular):

```html
  @if (auth.canWrite()) {
    <button class="topbar-btn desktop-only" (click)="requestNewExpense()">
      <cf-icon name="plus" [size]="11" /> Lançar gasto
    </button>
  }
```

Nos três `seg-btn` de titular, envolver só o texto para o celular mostrar apenas o avatar:

```html
    <button class="seg-btn" [class.active]="filter() === 'Mateus'" (click)="setFilter('Mateus')">
      <cf-avatar holder="Mateus" [size]="12" /> <span class="seg-text">Mateus</span>
    </button>
```

(idem para Thais; o botão "Todos" fica com o rótulo, que já é curto.)

- [ ] **Step 2: Estilos mobile-first**

Acrescentar ao topo de `topbar.component.scss` o `@use 'responsive' as r;` e ao final:

```scss
/* Base = celular */
.desktop-only { display: none; }
.seg-text { display: none; }

.topbar {
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 12px;
}
.topbar-spacer { display: none; }

/* Alvo de toque de 44px (spec §6) */
.month-nav-btn,
.seg-btn {
  min-height: 44px;
  min-width: 44px;
}

@include r.desktop {
  .desktop-only { display: flex; }
  .seg-text { display: inline; }
  .topbar {
    flex-wrap: nowrap;
    padding: 0 20px;
  }
  .topbar-spacer { display: block; }
  .month-nav-btn,
  .seg-btn {
    min-height: 0;
    min-width: 0;
  }
}
```

> `.desktop-only { display: flex }` no ramo de desktop: os três elementos marcados são
> `flex` no layout original (`topbar-btn` e `topbar-user`). Conferir no `.scss` existente
> antes de fechar a task — se algum for `block`, separar a regra.

- [ ] **Step 3: Verificar**

Run: `npx nx test ui-financial && npx nx build ui-financial`
Expected: ambos PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/ui-financial/src/app/layout/topbar.component.*
git commit -m "feat(ui-financial): compact the topbar on phones"
```

---

### Task 8: Drawers em tela cheia

**Files:**
- Modify: `apps/ui-financial/src/app/features/expense-drawer/expense-drawer.component.scss`
- Modify: `apps/ui-financial/src/app/features/tx-detail-drawer/tx-detail-drawer.component.scss`

**Interfaces:**
- Consumes: nada.
- Produces: os dois drawers ocupando a tela toda abaixo de 768px.

- [ ] **Step 1: `expense-drawer`**

Trocar o bloco `.panel` (e acrescentar `@use 'responsive' as r;` na primeira linha do arquivo):

```scss
.panel {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100dvh;
  background: var(--surface);
  display: flex; flex-direction: column;
  z-index: 81;
}

@include r.desktop {
  .panel {
    inset: 0 0 auto auto;
    top: 0; right: 0;
    width: 460px;
    height: 100dvh;
    border-left: 1px solid var(--line);
    box-shadow: -12px 0 32px rgba(0, 0, 0, 0.15);
    animation: cf-slide 240ms cubic-bezier(.2, .7, .3, 1) both;
  }
}
```

E ao final do arquivo, o alvo de toque:

```scss
.close-btn { width: 44px; height: 44px; }
@include r.desktop { .close-btn { width: 26px; height: 26px; } }
```

> A animação `cf-slide` fica só no desktop: em tela cheia um slide lateral lê como troca de
> página, não como painel. O `@keyframes cf-fade` do backdrop permanece nos dois.

- [ ] **Step 2: `tx-detail-drawer`**

Mesma mudança, com `480px` no lugar de `460px`:

```scss
.panel {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100dvh;
  background: var(--surface);
  display: flex; flex-direction: column;
  z-index: 81;
}

@include r.desktop {
  .panel {
    inset: 0 0 auto auto;
    top: 0; right: 0;
    width: 480px;
    height: 100dvh;
    border-left: 1px solid var(--line);
    box-shadow: -12px 0 32px rgba(0, 0, 0, 0.15);
    animation: cf-slide 240ms cubic-bezier(.2, .7, .3, 1);
  }
}
```

Mais `@use 'responsive' as r;` na primeira linha e o mesmo ajuste de `close-btn`.

- [ ] **Step 3: Verificar**

Run: `npx nx test ui-financial && npx nx build ui-financial`
Expected: ambos PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/ui-financial/src/app/features/expense-drawer/ apps/ui-financial/src/app/features/tx-detail-drawer/
git commit -m "feat(ui-financial): render both drawers full-screen on phones"
```

---

### Task 9: Transações — tabela vira cards

Esta é a conversão de referência. As Tasks 10–15 repetem o padrão com o conteúdo de cada tela.

**Files:**
- Modify: `apps/ui-financial/src/app/features/transactions/transactions.component.ts`
- Modify: `apps/ui-financial/src/app/features/transactions/transactions.component.html`
- Modify: `apps/ui-financial/src/app/features/transactions/transactions.component.scss`
- Create: `apps/ui-financial/src/app/features/transactions/transactions.component.spec.ts`

**Interfaces:**
- Consumes: `ViewportService.isDesktop` (Task 2).
- Produces: o padrão `@if (vp.isDesktop())` usado pelas Tasks 10–15.

- [ ] **Step 1: Escrever o teste que falha**

`transactions.component.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TransactionsComponent } from './transactions.component';
import { AppDataService } from '../../layout/app-data.service';
import { ViewportService } from '../../core/viewport.service';
import type { Transaction, Category, Card } from '@caixa-familia/shared-types';

const TRANSACTIONS: Transaction[] = [
  { id: 't1', date: '2026-05-05', label: 'Mercado', value: 240, cat: 'casa',
    holder: 'Mateus', method: 'pix', installments: null, recurring: false },
  { id: 't2', date: '2026-05-06', label: 'Farmácia', value: 88, cat: 'casa',
    holder: 'shared', method: 'pix', installments: null, recurring: false },
];

const CAT_BY: Record<string, Category> = {
  casa: { id: 'casa', label: 'Casa', color: '#7A4F1D', budget: 500 },
};

function build(isDesktop: boolean) {
  const data = {
    transactions: signal(TRANSACTIONS),
    catBy: signal(CAT_BY),
    cardBy: signal({} as Record<string, Card>),
    holderFilter: signal('todos' as const),
  };
  TestBed.configureTestingModule({
    imports: [TransactionsComponent],
    providers: [
      { provide: AppDataService, useValue: data },
      { provide: ViewportService, useValue: { isDesktop: signal(isDesktop) } },
    ],
  });
  const fixture = TestBed.createComponent(TransactionsComponent);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement, data };
}

afterEach(() => TestBed.resetTestingModule());

describe('TransactionsComponent — responsive rendering', () => {
  it('renders the table on desktop and no card list', () => {
    const { el } = build(true);
    expect(el.querySelector('table.tx-table')).not.toBeNull();
    expect(el.querySelector('.tx-cards')).toBeNull();
  });

  it('renders the card list on mobile and no table', () => {
    const { el } = build(false);
    expect(el.querySelector('.tx-cards')).not.toBeNull();
    expect(el.querySelector('table.tx-table')).toBeNull();
  });

  it('shows every filtered transaction as a card on mobile', () => {
    expect(build(false).el.querySelectorAll('.tx-card').length).toBe(2);
  });

  it('opens the detail drawer when a card is tapped', () => {
    const { fixture, el } = build(false);
    el.querySelector('.tx-card').click();
    fixture.detectChanges();
    expect(fixture.componentInstance.selectedTx()).not.toBeNull();
  });

  it('breaks the cards into one group per day', () => {
    // as duas transações do mock são de dias diferentes (05 e 06 de maio)
    expect(build(false).el.querySelectorAll('.txc-day').length).toBe(2);
  });

  it('keeps same-day transactions under a single separator', () => {
    const { fixture, el, data } = build(false);
    data.transactions.set(TRANSACTIONS.map(t => ({ ...t, date: '2026-05-05' })));
    fixture.detectChanges();
    expect(el.querySelectorAll('.txc-day').length).toBe(1);
    expect(el.querySelectorAll('.tx-card').length).toBe(2);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx nx test ui-financial --testPathPattern=transactions.component`
Expected: FAIL — `No provider for ViewportService` / `.tx-cards` é `null`.

- [ ] **Step 3: Injetar o serviço e agrupar por dia**

Em `transactions.component.ts`, acrescentar o import, o campo e o computed de agrupamento
(a spec §5.4 pede separador de dia entre os cards):

```ts
import { ViewportService } from '../../core/viewport.service';
```

```ts
export class TransactionsComponent {
  protected data = inject(AppDataService);
  protected vp = inject(ViewportService);
```

E, junto dos demais `computed` da classe:

```ts
  // Cards do celular, com quebra por dia. Agrupamento consecutivo: depende de
  // flatSorted() vir ordenado por data — que é o default (sortCol='date') e o
  // único estado possível no celular, onde o cabeçalho ordenável não é renderizado.
  dayGroups = computed(() => {
    const groups: { key: string; label: string; items: Transaction[] }[] = [];
    for (const tx of this.flatSorted()) {
      const last = groups[groups.length - 1];
      if (last?.key === tx.date) last.items.push(tx);
      else groups.push({ key: tx.date, label: this.formatDate(tx.date), items: [tx] });
    }
    return groups;
  });
```

- [ ] **Step 4: Ramificar o template**

Em `transactions.component.html`, envolver o `<div class="table-scroll">…</div>` existente e
acrescentar o ramo mobile:

```html
  @if (vp.isDesktop()) {
    <div class="table-scroll">
      <table class="tx-table">
        <!-- ...conteúdo atual, inalterado... -->
      </table>
    </div>
  } @else {
    <div class="tx-cards">
      @for (day of dayGroups(); track day.key) {
        <div class="txc-day">{{ day.label }}</div>
        @for (tx of day.items; track tx.id) {
          <button class="tx-card" (click)="selectedTx.set(tx)">
            <div class="txc-main">
              <span class="txc-label">{{ tx.label }}</span>
              <cf-money [value]="tx.value" [negColor]="false" />
            </div>
            <div class="txc-meta">
              <span class="txc-tag">
                <cf-cat-dot [catId]="tx.cat" [size]="6" /> {{ catLabel(tx.cat) }}
              </span>
              @if (cardOf(tx.method); as card) {
                <span class="txc-tag">···{{ card.last4 }}</span>
              } @else {
                <span class="txc-tag">Pix</span>
              }
              @if (tx.installments) {
                <span class="txc-tag num">{{ tx.installments.n }}/{{ tx.installments.of }}</span>
              }
              <span class="txc-tag">
                {{ tx.holder === 'shared' ? 'Compartilhado' : tx.holder }}
              </span>
              @if (tx.recurring) {
                <span class="txc-tag"><cf-icon name="repeat" [size]="9" /> fixo</span>
              }
            </div>
          </button>
        }
      }
      @if (filteredCount() === 0) {
        <p class="txc-empty">Nenhuma transação encontrada</p>
      }
    </div>
  }
```

> A data sai das etiquetas do card porque agora está no separador do grupo.
>
> O ramo mobile usa `dayGroups()`, derivado de `flatSorted()` — não de
> `groupedByCategory()`. O segmento "Agrupar" é controle de tabela e fica em `desktop-only`
> no Step 5; agrupar cards por categoria é feature nova, fora do escopo desta fatia.

- [ ] **Step 5: Estilos**

`@use 'responsive' as r;` na primeira linha de `transactions.component.scss` e, ao final:

```scss
/* Base = celular */
.strip { flex-direction: column; align-items: stretch; gap: 10px; }
.strip-kpis { overflow-x: auto; }
.strip-filters { flex-direction: column; align-items: stretch; gap: 8px; }
.filter-chips { overflow-x: auto; flex-wrap: nowrap; padding-bottom: 4px; }
.filter-chip { min-height: 44px; flex: none; }
.group-seg { display: none; }

.tx-cards { display: flex; flex-direction: column; gap: 6px; padding: 8px; }

.tx-card {
  width: 100%;
  text-align: left;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 9px;
  padding: 10px 11px;
}
.txc-main {
  display: flex; align-items: baseline; justify-content: space-between; gap: 10px;
}
.txc-label { font-weight: 600; color: var(--ink-1); }
.txc-meta {
  display: flex; flex-wrap: wrap; gap: 5px;
  margin-top: 6px;
}
.txc-tag {
  display: inline-flex; align-items: center; gap: 4px;
  background: var(--surface-alt);
  border-radius: 10px;
  padding: 2px 7px;
  font-size: 10px;
  color: var(--ink-3);
}
.txc-day {
  font-size: 10px;
  color: var(--ink-4);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 8px 2px 2px;
}
.txc-empty { padding: 20px; text-align: center; color: var(--ink-3); }

@include r.desktop {
  .strip { flex-direction: row; align-items: center; }
  .strip-filters { flex-direction: row; align-items: center; }
  .filter-chips { flex-wrap: wrap; overflow-x: visible; }
  .filter-chip { min-height: 0; }
  .group-seg { display: flex; }
}
```

> Conferir no `.scss` existente os valores originais de `.strip`, `.strip-filters` e
> `.group-seg` e reproduzi-los no ramo desktop — os acima são o padrão esperado, mas o arquivo
> é a fonte da verdade.

- [ ] **Step 6: Rodar e ver passar**

Run: `npx nx test ui-financial --testPathPattern=transactions.component`
Expected: PASS, 6 testes.

- [ ] **Step 7: Build**

Run: `npx nx build ui-financial`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/ui-financial/src/app/features/transactions/
git commit -m "feat(ui-financial): render transactions as cards on phones"
```

---

### Tasks 10–15: as demais conversões tabela → cards

> **Nota honesta sobre estas seis tasks.** As Tasks 1–9 e 16–19 trazem o código literal. Estas
> não: escrever o markup completo dos sete templates restantes sem tê-los lido produziria
> código inventado, que é pior que uma instrução explícita de ler o arquivo antes. Por isso
> cada uma começa com um **Step 0 de leitura**. Se preferir o plano com o código literal
> também aqui, é um passo a mais de preparação — peça e eu expando.

> **Aprendido executando a Task 9 — os quatro se repetem aqui:**
>
> 1. **`@use 'responsive' as r;` tem que ser a PRIMEIRA linha do arquivo**, não "antes do
>    primeiro seletor". Vários `.scss` abrem com `:host { display: block; }` e um comentário;
>    inserir o `@use` depois disso dá `@use rules must be written before any other rules`.
>    Na Task 9 **a suíte passou com 195 testes verdes e o build quebrado** — rodar `nx build`.
> 2. **O mock do `AppDataService` precisa cobrir tudo que o template lê**, não só o que o
>    teste afirma. Faltar um signal derruba os testes com
>    `ctx.data.<campo> is not a function`.
> 3. **Se o card abre um drawer, o spec precisa de `{ provide: AuthService, useValue: {
>    canWrite: signal(true) } }`.** Sem isso o Angular injeta o `AuthService` real e arrasta a
>    cadeia do OIDC até `NG0201: No provider found for StsConfigLoader`.
> 4. **Escrever só as regras que de fato divergem.** O exemplo de estilos da Task 9 mandava
>    `.strip { flex-direction: column }` no celular e `row` no desktop — mas o `.strip` já era
>    `column` no original, e o ramo desktop teria *alterado* o layout atual. Ler o valor
>    existente antes de "restaurá-lo".

Cada uma repete o ciclo da Task 9 na sua tela. **Passos idênticos em todas:**

0. **Ler o template e o `.scss` atuais da tela**, e o spec existente dela quando houver
   (Gastos fixos, Fatura, Cartões, Orçamentos, Configurações e Dashboard já têm spec; use os
   mocks de `AppDataService` que ele monta, em vez de inventar novos).
1. Escrever o spec de renderização responsiva — no mínimo 3 testes, com o `build(isDesktop)`
   da Task 9 como molde:
   - desktop mostra `<table>` e **não** a lista de cards;
   - mobile mostra a lista e **não** a `<table>`;
   - a lista mobile tem um card por registro do mock.
2. Rodar e ver falhar.
3. `protected vp = inject(ViewportService);` no componente.
4. Ramificar o template com `@if (vp.isDesktop()) { <table>… } @else { <lista>… }`, com os
   campos da tabela abaixo. O ramo desktop é o markup atual, **inalterado**.
5. Estilos com `@use 'responsive' as r;` e o par base/`@include r.desktop`, reaproveitando as
   classes `.tx-card` / `.txc-main` / `.txc-meta` / `.txc-tag` da Task 9 como referência de
   forma (cada tela define as suas — não há folha compartilhada nesta fatia).
6. `npx nx test ui-financial --testPathPattern=<tela>` → PASS.
7. `npx nx build ui-financial` → PASS.
8. Commit.

| Task | Tela | Arquivos | Linha 1 do card | Etiquetas |
|---|---|---|---|---|
| 10 | Gastos fixos | `features/fixed/fixed.component.*` | rótulo + valor | vencimento (`formatDay`), categoria, titular, pago/pendente |
| 11 | Fatura | `features/invoice/invoice.component.*` | descrição + valor | data, categoria, titular, parcela |
| 12 | Cartões | `features/cards/cards.component.*` | banco + limite | titular, últimos 4, fechamento, vencimento |
| 13 | Dashboard A e B | `features/dashboard/dashboard-a.component.*`, `dashboard-b.component.*` | conforme a tabela de cada painel | as colunas restantes |
| 14 | Orçamentos | `features/budgets/budgets.component.*` | categoria + restante | orçamento, gasto, status; `cf-progress-bar` em linha própria |
| 15 | Configurações (2 tabelas) | `features/settings/settings.component.*` | **categorias:** nome + orçamento/mês · **cartões:** banco + limite | **categorias:** cor, nº de lançamentos, status · **cartões:** titular, fatura |

Notas por tela:

- **Task 12 e 15 (cartões):** as duas telas listam `data.cards()`. Manter os markups
  independentes — são recortes diferentes (Cartões mostra fatura e histórico, Configurações é
  cadastro). Não extrair componente comum nesta fatia.
- **Task 13:** Dashboard A e B são dois componentes, dois commits separados. O Dashboard C não
  tem `<table>` e só precisa dos ajustes de grid do Step 5.
- **Task 14:** o `cf-progress-bar` e a sparkline de tendência ficam **abaixo** das etiquetas,
  em largura total — espremê-los na linha de etiquetas os torna ilegíveis.
- **Task 15:** o `settings.component.scss` é o maior do projeto (5.820 B). Após a conversão,
  conferir que ficou abaixo dos 16 kB do novo `maximumError`.

---

### Task 16: Metas e Relatórios — scroll horizontal com coluna fixa

As duas tabelas onde a comparação entre linhas **é** o conteúdo. Metas é matriz de colunas
dinâmicas (`@for (goal of goals())` emite duas colunas por meta) e não tem card estável.

**Files:**
- Modify: `apps/ui-financial/src/app/features/goals/goals.component.html` / `.scss`
- Modify: `apps/ui-financial/src/app/features/reports/reports.component.html` / `.scss`

**Interfaces:**
- Consumes: nada (é só CSS + um wrapper).
- Produces: nada consumido adiante.

- [ ] **Step 1: Envolver as tabelas**

Em `goals.component.html`, envolver `<table class="tx">…</table>`:

```html
<div class="hscroll">
  <table class="tx">
    <!-- inalterado -->
  </table>
</div>
```

Idem em `reports.component.html`, para a tabela da tela.

- [ ] **Step 2: Estilos**

Acrescentar aos dois `.scss` (com `@use 'responsive' as r;` na primeira linha):

```scss
/* Grades de comparação: rolam de lado no celular, com a 1ª coluna ancorada. */
.hscroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.hscroll table { min-width: 640px; }
.hscroll th:first-child,
.hscroll td:first-child {
  position: sticky;
  left: 0;
  background: var(--surface);
  z-index: 1;
}

@include r.desktop {
  .hscroll { overflow-x: visible; }
  .hscroll table { min-width: 0; }
  .hscroll th:first-child,
  .hscroll td:first-child { position: static; }
}
```

- [ ] **Step 3: Verificar**

Run: `npx nx test ui-financial && npx nx build ui-financial`
Expected: ambos PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/ui-financial/src/app/features/goals/ apps/ui-financial/src/app/features/reports/
git commit -m "feat(ui-financial): let the comparison grids scroll sideways on phones"
```

---

### Task 17: `report-chart` — aspect ratio e janela de meses

**Files:**
- Modify: `apps/ui-financial/src/app/features/reports/report-chart.component.ts` / `.html`
- Modify: `apps/ui-financial/src/app/features/reports/reports.component.ts` / `.html`
- Modify: `apps/ui-financial/src/app/features/reports/reports.component.spec.ts`

**Interfaces:**
- Consumes: `ViewportService.isDesktop` (Task 2).
- Produces: `ChartModel.width: number` — o `report-chart` passa a ler a largura do model em
  vez do `1100` fixo.

> **Por que não é só trocar o `preserveAspectRatio`.** O `ReportChartComponent` é burro: recebe
> um `ChartModel` com a geometria **já em pixels** (`incX`, `barW`, `polyline`), e `points` é a
> polilinha de poupança, não a série. Não há o que cortar lá dentro — a janela tem que ser
> aplicada **antes** da geometria, em `reports.component.ts`.
>
> E trocar `none` por `meet` sozinho **piora**: com `viewBox="0 0 1100 200"` e `height="200"`
> fixo, num contêiner de 375px o `meet` escalaria o conteúdo para 375×68 centralizado, com
> faixas vazias. A distorção de hoje não vem do `none` — vem de espremer 1100 unidades num
> contêiner de 375. A correção é a **largura do viewBox acompanhar o viewport**; aí o `none`
> passa a operar perto de 1:1 e não distorce mais nada.

- [ ] **Step 1: Escrever o teste que falha**

Acrescentar a `reports.component.spec.ts` (reaproveitando o `build()` do arquivo, acrescentando
`{ provide: ViewportService, useValue: { isDesktop: signal(isDesktop) } }` aos providers e
parametrizando-o com `isDesktop`):

```ts
describe('ReportsComponent — chart window', () => {
  it('caps the chart at the last 6 months on mobile', () => {
    // o mock de history() do build() precisa ter mais de 6 meses para o corte aparecer
    expect(build(false).componentInstance.chartModel().bars.length).toBe(6);
  });

  it('keeps the whole series on desktop', () => {
    const fixture = build(true);
    const months = fixture.componentInstance.monthCount();
    expect(fixture.componentInstance.chartModel().bars.length).toBe(months);
  });

  it('narrows the viewBox on mobile so the bars are not squeezed', () => {
    expect(build(false).componentInstance.chartModel().width).toBe(400);
    expect(build(true).componentInstance.chartModel().width).toBe(1100);
  });

  it('spreads the windowed bars across the full width', () => {
    // com 6 meses e largura 400, groupW = 400/6 ≈ 66.7 — sem piso de 12 sobrando metade
    const bars = build(false).componentInstance.chartModel().bars;
    expect(bars[bars.length - 1].labelX).toBeGreaterThan(330);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx nx test ui-financial --testPathPattern=reports`
Expected: FAIL — `chartModel().width` é `undefined` e `bars.length` é o total de meses.

- [ ] **Step 3: `ChartModel` ganha a largura**

Em `report-chart.component.ts`, acrescentar o campo à interface:

```ts
export interface ChartModel {
  bars: ChartBar[];
  barW: number;
  gridlines: { y: number }[];
  polyline: string;
  points: { x: number; y: number }[];
  /** Largura do viewBox. Acompanha o viewport para o SVG não distorcer. */
  width: number;
}
```

- [ ] **Step 4: O SVG lê a largura do model**

`report-chart.component.html` — trocar o `viewBox` fixo e o `x2` fixo das gridlines:

```html
<svg
  width="100%"
  [attr.height]="H"
  [attr.viewBox]="'0 0 ' + model.width + ' ' + H"
  preserveAspectRatio="none"
>
  <!-- Gridlines -->
  @for (g of model.gridlines; track g.y) {
    <line x1="0" [attr.y1]="g.y" [attr.x2]="model.width" [attr.y2]="g.y" stroke="var(--line-soft)" stroke-width="1" />
  }
```

(o restante do arquivo não muda)

- [ ] **Step 5: Janela e largura em `reports.component.ts`**

Acrescentar o import e o campo:

```ts
import { ViewportService } from '../../core/viewport.service';
```

```ts
  protected vp = inject(ViewportService);
```

E no topo do `chartModel = computed(...)`, substituir as 4 primeiras linhas de série e o
cálculo de `W`/`groupW`:

```ts
  chartModel = computed((): ChartModel => {
    // No celular só cabem ~6 meses legíveis, e o viewBox encolhe junto:
    // 1100 unidades num contêiner de 375px é o que hoje deforma o texto.
    const desktop = this.vp.isDesktop();
    const window = desktop ? Infinity : 6;
    const take = <T,>(arr: T[]) => (window === Infinity ? arr : arr.slice(-window));

    const incomes = take(this.data.incomeHistory().map(e => e.total));
    const expenses = take(this.data.history().map(e => e.total));
    const months = take(this.data.history().map(e => e.m));
    const sav = take(this.savings());
    const n = months.length;
    const lastIdx = n - 1;

    const W = desktop ? 1100 : 400;
```

```ts
    // Até 12 meses preserva o espaçamento original; acima disso encolhe para caber.
    // Com janela, o piso é a própria janela — senão 6 barras ocupariam meia largura.
    const minSlots = window === Infinity ? 12 : Math.min(12, window);
    const groupW = W / Math.max(n, minSlots);
```

E no `return`, acrescentar `width`:

```ts
    return { bars, barW, gridlines, polyline, points, width: W };
```

> O `peak` continua calculado sobre `incomes`/`expenses` **já recortados** — é o que faz as 6
> barras da janela usarem a altura toda em vez de ficarem achatadas contra um máximo fora da
> tela.

- [ ] **Step 6: Rodar e ver passar**

Run: `npx nx test ui-financial --testPathPattern=reports`
Expected: PASS.

Run: `npx nx test ui-financial --testPathPattern=reports`
Expected: PASS.

- [ ] **Step 7: Build**

Run: `npx nx build ui-financial`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/ui-financial/src/app/features/reports/
git commit -m "feat(ui-financial): window the report chart to six months on phones"
```

---

### Task 18: Varredura de alvos de toque

**Files:**
- Modify: os `.scss` de `features/` que ainda tiverem controle abaixo de 44px

**Interfaces:**
- Consumes: nada.
- Produces: nada.

- [ ] **Step 1: Localizar os controles pequenos**

Run:

```bash
grep -rn "width: 2[0-9]px\|height: 2[0-9]px\|padding: [0-4]px" apps/ui-financial/src/app --include=*.scss
```

Cruzar o resultado com os seletores que são botão/link clicável. Ignorar ícones decorativos
e avatares — não são alvo de toque.

- [ ] **Step 2: Elevar cada um no ramo base**

Para cada seletor clicável encontrado, no ramo base (celular):

```scss
.seletor { min-height: 44px; min-width: 44px; }

@include r.desktop {
  .seletor { min-height: 0; min-width: 0; }
}
```

Já cobertos por tasks anteriores e que **não** devem ser repetidos: `month-nav-btn` e
`seg-btn` (Task 7), `close-btn` dos dois drawers (Task 8), `filter-chip` de Transações
(Task 9), `ms-item` e `bn-item` (Task 5).

- [ ] **Step 3: Verificar**

Run: `npx nx test ui-financial && npx nx build ui-financial`
Expected: ambos PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/ui-financial/src/app/features/
git commit -m "fix(ui-financial): give tap targets 44px on phones"
```

---

### Task 19: Validação visual e fechamento

Nenhuma das tasks anteriores prova que a tela **parece** certa — o Jest não renderiza pixels.

**Files:**
- Modify: `docs/superpowers/specs/2026-07-11-api-front-migration-umbrella.md` (registro)

- [ ] **Step 1: Subir o stack**

```bash
docker-compose up -d
npx nx serve api-financial
npx nx serve ui-financial
```

- [ ] **Step 2: Percorrer as telas**

Com a skill `claude-in-chrome`, em **375px, 768px e 1280px**, visitar: Dashboard,
Transações, Cartões, Fatura, Gastos fixos, Orçamentos, Metas, Relatórios, Configurações.

Em cada largura conferir:
- nenhuma rolagem **horizontal do documento** (só dentro dos contêineres `.hscroll`);
- a bottom-nav aparece em 375 e some em 768 e 1280;
- a sidebar some em 375 e aparece em 768 e 1280;
- os dois drawers abrem em tela cheia em 375 e como painel lateral em 768 e 1280;
- nenhum texto cortado ou sobreposto.

- [ ] **Step 3: Gate final**

```bash
npx nx lint ui-financial
npx nx test ui-financial
npx nx build ui-financial
```

Expected: os três verdes. O `lint` inclui a trava de fronteira do `shared-mocks`.

- [ ] **Step 4: Registrar no umbrella**

Em `2026-07-11-api-front-migration-umbrella.md`, acrescentar à §4 que a dívida do budget de
`anyComponentStyle` foi resolvida (8 kB / 16 kB), e uma linha apontando para a spec de
responsividade.

- [ ] **Step 5: Commit**

```bash
git add docs/
git commit -m "docs: record the responsive slice in the migration umbrella"
```

---

## Ordem e dependências

```
Task 1 (fundação) ─┬─> Task 2 (ViewportService) ─┬─> Tasks 9..15 (tabelas → cards)
                   │                              └─> Task 17 (gráfico)
                   ├─> Task 3 (nav-items) ─> Task 5 (bottom-nav) ─> Task 6 (shell)
                   ├─> Task 4 (drawer no shell) ──────────────────────┘
                   ├─> Task 7 (topbar)
                   ├─> Task 8 (drawers)
                   └─> Task 16 (scroll lateral)

Task 18 (alvos de toque) depende de 5..17. Task 19 fecha.
```

Tasks 1 e 2 são bloqueantes para tudo. As Tasks 9–15 são independentes entre si e podem ser
feitas em qualquer ordem depois da 9, que estabelece o padrão.
