# Fatia 4 — Categories (writes) + Budgets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir criar categorias pela tela de Ajustes, via `POST /categories`, com slug derivado do nome e cor escolhida numa paleta.

**Architecture:** O backend não muda — `POST /categories` já existe e já é gated por `@Roles('admin','editor')`. A leitura de categorias também já é real desde a fatia de Transactions. O trabalho é: uma função `slugify` em `shared-utils`, o `create` no `CatalogApiService`, `createCategory()` no `AppDataService`, e um formulário inline novo no card de Categorias dos Ajustes.

**Tech Stack:** Nx 22 monorepo · NestJS 11 + Prisma (api-financial) · Angular 21 standalone + signals + Reactive Forms (ui-financial) · Jest 30 · libs `shared-types`, `shared-utils`.

**Spec:** `docs/superpowers/specs/2026-07-11-categories-budgets-slice-design.md`
**Umbrella:** `docs/superpowers/specs/2026-07-11-api-front-migration-umbrella.md`

## Global Constraints

- **Convenção `id = slug`.** `Category.id` carrega o `slug`. `wireToCategory` já faz isso; o create faz o caminho inverso.
- **Camada de dados na UI.** O `CatalogApiService` já existe e cobre categorias e cartões — **estender**, não criar um serviço novo.
- **Erro/loading.** Falhas passam por `AppDataService.fail(message, errorSignal)`, que seta o signal e dispara toast `neg`.
- **Gate de write.** `@Roles('admin','editor')` no backend já existe. O botão de salvar do form novo deve respeitar `auth.canWrite()`, como os demais writes da UI.
- **Fora de escopo:** editar orçamento (não existe `PATCH /categories/:id`), remover e reordenar categoria.
- **Comandos:** `npx nx test <projeto>`, `npx nx build <projeto>`. Jest 30 usa `--testPathPatterns` (plural).
- **Branch:** trabalhar direto em `master` (decisão do usuário nesta sessão).
- **Sintaxe de shell:** a ferramenta Bash aqui é Git Bash (POSIX sh). Mensagem de commit multi-linha por heredoc (`git commit -F - <<'EOF'`), **nunca** here-string de PowerShell.

## File Structure

**Lib**
- `libs/shared-utils/src/lib/slug.ts` (novo) — só `slugify`.
- `libs/shared-utils/src/index.ts` — exportar o módulo novo.

**UI (`apps/ui-financial/src/app/`)**
- `core/api/wire.types.ts` — `CreateCategoryWire`.
- `core/api/catalog-api.service.ts` — ganha `createCategory`.
- `core/api/catalog.mapper.ts` — ganha `categoryToCreateWire`.
- `layout/app-data.service.ts` — `createCategory()` + `categoriesError`.
- `features/settings/settings.component.{ts,html}` — form inline novo.

O backend e `features/budgets` **não mudam**.

---

### Task 1: `slugify` em shared-utils

**Files:**
- Create: `libs/shared-utils/src/lib/slug.ts`
- Modify: `libs/shared-utils/src/index.ts`
- Test: `libs/shared-utils/src/lib/slug.spec.ts`

**Interfaces:**
- Consumes: nada (primeira task).
- Produces: `slugify(label: string): string`. A Task 4 usa isso.

- [ ] **Step 1: Escrever o teste que falha**

Criar `libs/shared-utils/src/lib/slug.spec.ts`:

```typescript
import { slugify } from './slug';

describe('slugify', () => {
  it('lowercases and trims', () => {
    expect(slugify('  Farmácia  ')).toBe('farmacia');
  });

  it('strips accents', () => {
    expect(slugify('Educação')).toBe('educacao');
    expect(slugify('Saúde')).toBe('saude');
  });

  it('replaces runs of non-alphanumerics with a single dash', () => {
    expect(slugify('Casa & Lar')).toBe('casa-lar');
    expect(slugify('Cartão (pgto)')).toBe('cartao-pgto');
  });

  it('does not leave leading or trailing dashes', () => {
    expect(slugify('!! Lazer !!')).toBe('lazer');
  });

  it('keeps digits', () => {
    expect(slugify('Plano 2026')).toBe('plano-2026');
  });

  it('returns an empty string for input with no alphanumerics', () => {
    expect(slugify('---')).toBe('');
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx nx test shared-utils --testPathPatterns=slug`
Expected: FAIL — `Cannot find module './slug'`.

- [ ] **Step 3: Escrever a função**

Criar `libs/shared-utils/src/lib/slug.ts`:

```typescript
/**
 * Converte um rótulo legível no slug usado como id de categoria:
 * minúsculas, sem acentos, não-alfanuméricos viram um único hífen.
 */
export function slugify(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
```

- [ ] **Step 4: Exportar da lib**

Em `libs/shared-utils/src/index.ts`, acrescentar:

```typescript
export * from './lib/slug';
```

- [ ] **Step 5: Rodar o teste e confirmar que passa**

Run: `npx nx test shared-utils --testPathPatterns=slug`
Expected: PASS — 6 testes.

- [ ] **Step 6: Commit**

```bash
git add libs/shared-utils
git commit -F - <<'EOF'
feat(shared-utils): add slugify

Category ids are slugs, so creating one from a human label needs a
deterministic accent-stripping slugifier.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 2: UI — `createCategory` no `CatalogApiService` + mapper

**Files:**
- Modify: `apps/ui-financial/src/app/core/api/wire.types.ts`
- Modify: `apps/ui-financial/src/app/core/api/catalog-api.service.ts`
- Modify: `apps/ui-financial/src/app/core/api/catalog.mapper.ts`
- Test: `apps/ui-financial/src/app/core/api/catalog-api.service.spec.ts` (estender)
- Test: `apps/ui-financial/src/app/core/api/catalog.mapper.spec.ts` (estender)

**Interfaces:**
- Consumes: nada.
- Produces: `CatalogApiService.createCategory(body: CreateCategoryWire): Observable<CategoryWire>` e `categoryToCreateWire(c: Category): CreateCategoryWire`. A Task 3 usa ambos.

- [ ] **Step 1: Escrever os testes que falham**

Em `apps/ui-financial/src/app/core/api/catalog-api.service.spec.ts`, acrescentar ao describe existente:

```typescript
  it('POSTs a new category', () => {
    const body = { slug: 'farmacia', label: 'Farmácia', color: '#2E7D5B', budget: 300 };
    service.createCategory(body).subscribe();
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/categories`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({ id: 'cuid-1', ...body });
  });
```

Em `apps/ui-financial/src/app/core/api/catalog.mapper.spec.ts`, acrescentar:

```typescript
describe('categoryToCreateWire', () => {
  it('sends the domain id as the slug', () => {
    expect(
      categoryToCreateWire({ id: 'farmacia', label: 'Farmácia', color: '#2E7D5B', budget: 300 }),
    ).toEqual({ slug: 'farmacia', label: 'Farmácia', color: '#2E7D5B', budget: 300 });
  });
});
```

(Ajustar o import do topo do arquivo para incluir `categoryToCreateWire`.)

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npx nx test ui-financial --testPathPatterns=catalog`
Expected: FAIL — `service.createCategory is not a function` e `categoryToCreateWire is not exported`.

- [ ] **Step 3: Adicionar o wire type**

Acrescentar a `apps/ui-financial/src/app/core/api/wire.types.ts`, logo depois de `CategoryWire`:

```typescript
export interface CreateCategoryWire {
  slug: string;
  label: string;
  color: string;
  budget: number;
}
```

- [ ] **Step 4: Estender o serviço**

Em `apps/ui-financial/src/app/core/api/catalog-api.service.ts`, ajustar o import de tipos para incluir `CreateCategoryWire` e acrescentar o método:

```typescript
  createCategory(body: CreateCategoryWire): Observable<CategoryWire> {
    return this.http.post<CategoryWire>(`${this.base}/categories`, body);
  }
```

- [ ] **Step 5: Estender o mapper**

Em `apps/ui-financial/src/app/core/api/catalog.mapper.ts`, ajustar o import de tipos e acrescentar:

```typescript
export function categoryToCreateWire(c: Category): CreateCategoryWire {
  return { slug: c.id, label: c.label, color: c.color, budget: c.budget };
}
```

- [ ] **Step 6: Rodar os testes e confirmar que passam**

Run: `npx nx test ui-financial --testPathPatterns=catalog`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/ui-financial/src/app/core/api
git commit -F - <<'EOF'
feat(ui-financial): add category create to the catalog API layer

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 3: UI — `AppDataService.createCategory()`

**Files:**
- Modify: `apps/ui-financial/src/app/layout/app-data.service.ts`
- Test: `apps/ui-financial/src/app/layout/app-data.service.spec.ts`

**Interfaces:**
- Consumes: `createCategory` e `categoryToCreateWire` (Task 2).
- Produces: `AppDataService.createCategory(c: Category): void` e `categoriesError: Signal<string | null>`. A Task 4 chama isso.

Nota: `loadCatalog()` hoje não tem tratamento de erro nenhum (dois `subscribe` de um argumento). Esta task adiciona `categoriesError` e o usa no create; **não** refatorar o `loadCatalog` aqui — fica para a fatia de limpeza.

- [ ] **Step 1: Escrever o teste que falha**

Em `apps/ui-financial/src/app/layout/app-data.service.spec.ts`, o `catApi` do `setup()` ganha o método novo:

```typescript
  const catApi = {
    listCategories: jest.fn(() => of([])),
    listCards: jest.fn(() => of([])),
    createCategory: jest.fn(() => of({ id: 'c1', slug: 'farmacia', label: 'Farmácia', color: '#2E7D5B', budget: 300 })),
  };
```

E o retorno do `setup()` passa a expor `catApi`:

```typescript
  return { svc: TestBed.inject(AppDataService), txApi, incApi, fixApi, goalApi, catApi };
```

Acrescentar ao final do arquivo:

```typescript
describe('AppDataService.createCategory', () => {
  it('posts the domain id as the slug and reloads the catalog', () => {
    const { svc, catApi } = setup();
    svc.createCategory({ id: 'farmacia', label: 'Farmácia', color: '#2E7D5B', budget: 300 });
    expect(catApi.createCategory).toHaveBeenCalledWith({
      slug: 'farmacia',
      label: 'Farmácia',
      color: '#2E7D5B',
      budget: 300,
    });
    expect(catApi.listCategories).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx nx test ui-financial --testPathPatterns=app-data.service`
Expected: FAIL — `svc.createCategory is not a function`.

- [ ] **Step 3: Implementar**

Em `apps/ui-financial/src/app/layout/app-data.service.ts`, acrescentar `categoryToCreateWire` ao import do catalog mapper, o signal de erro junto dos outros:

```typescript
  readonly categoriesError = signal<string | null>(null);
```

E o método, ao final da classe:

```typescript
  createCategory(c: Category): void {
    this.catApi.createCategory(categoryToCreateWire(c)).subscribe({
      next: () => this.loadCatalog(),
      error: () => this.fail('Falha ao criar categoria', this.categoriesError),
    });
  }
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx nx test ui-financial --testPathPatterns=app-data.service`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/ui-financial/src/app/layout
git commit -F - <<'EOF'
feat(ui-financial): create categories via AppDataService

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 4: UI — formulário inline de nova categoria nos Ajustes

**Files:**
- Modify: `apps/ui-financial/src/app/features/settings/settings.component.ts`
- Modify: `apps/ui-financial/src/app/features/settings/settings.component.html:25-31` (cabeçalho do card de Categorias) e o corpo do card
- Test: `apps/ui-financial/src/app/features/settings/settings.component.spec.ts` (novo)

**Interfaces:**
- Consumes: `slugify` (Task 1), `AppDataService.createCategory` (Task 3), `AuthService.canWrite`.
- Produces: nada. Fecha a fatia.

Contexto (D4): hoje `settings.component.html:30` tem `<button class="btn-primary" disabled>+ Nova categoria</button>` e nenhum form. O botão passa a alternar o form inline.

- [ ] **Step 1: Escrever os testes que falham**

Criar `apps/ui-financial/src/app/features/settings/settings.component.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { SettingsComponent } from './settings.component';
import { AppDataService } from '../../layout/app-data.service';
import { AuthService } from '../../core/auth/auth.service';
import type { Category } from '@caixa-familia/shared-types';

const CATEGORIES: Category[] = [
  { id: 'casa', label: 'Casa', color: '#7A4F1D', budget: 500 },
];

function mockDataService() {
  return {
    categories: signal(CATEGORIES),
    cards: signal([]),
    transactions: signal([]),
    createCategory: jest.fn(),
  };
}

describe('SettingsComponent — new category form', () => {
  let component: SettingsComponent;
  let data: ReturnType<typeof mockDataService>;

  beforeEach(async () => {
    data = mockDataService();
    await TestBed.configureTestingModule({
      imports: [SettingsComponent],
      providers: [
        { provide: AppDataService, useValue: data },
        { provide: AuthService, useValue: { canWrite: signal(true) } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('starts with the form closed', () => {
    expect(component.showNewCategory()).toBe(false);
  });

  it('derives the slug from the label', () => {
    component.newCategory.patchValue({ label: 'Farmácia' });
    expect(component.newCategorySlug()).toBe('farmacia');
  });

  it('rejects a label that collides with an existing category', () => {
    component.newCategory.patchValue({ label: 'Casa' });
    expect(component.slugTaken()).toBe(true);
  });

  it('accepts a label that does not collide', () => {
    component.newCategory.patchValue({ label: 'Farmácia' });
    expect(component.slugTaken()).toBe(false);
  });

  it('starts with a colour already selected so the post is always valid', () => {
    expect(component.newCategory.controls.color.value).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it('submits the slugified id, label, colour and budget', () => {
    component.newCategory.patchValue({ label: 'Farmácia', budget: 300, color: '#2E7D5B' });
    component.saveCategory();
    expect(data.createCategory).toHaveBeenCalledWith({
      id: 'farmacia',
      label: 'Farmácia',
      color: '#2E7D5B',
      budget: 300,
    });
  });

  it('closes and resets the form after saving', () => {
    component.showNewCategory.set(true);
    component.newCategory.patchValue({ label: 'Farmácia', budget: 300 });
    component.saveCategory();
    expect(component.showNewCategory()).toBe(false);
    expect(component.newCategory.controls.label.value).toBe('');
  });

  it('does not submit a colliding slug', () => {
    component.newCategory.patchValue({ label: 'Casa', budget: 100 });
    component.saveCategory();
    expect(data.createCategory).not.toHaveBeenCalled();
  });

  it('does not submit without a label', () => {
    component.newCategory.patchValue({ label: '', budget: 100 });
    component.saveCategory();
    expect(data.createCategory).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npx nx test ui-financial --testPathPatterns=settings.component`
Expected: FAIL — `component.showNewCategory is not a function`.

- [ ] **Step 3: Implementar o form no componente**

Em `apps/ui-financial/src/app/features/settings/settings.component.ts`:

Ajustar imports:

```typescript
import { Component, inject, computed, signal } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { slugify } from '@caixa-familia/shared-utils';
import { AuthService } from '../../core/auth/auth.service';
```

Acrescentar `ReactiveFormsModule` ao array `imports` do `@Component`.

Dentro da classe, acrescentar a paleta e o estado do form:

```typescript
  protected auth = inject(AuthService);

  /** Paleta fixa — garante um hex válido para o @IsHexColor do backend. */
  readonly palette = [
    '#2E7D5B', '#1F4E79', '#9F1239', '#7A4F1D',
    '#B45309', '#3F2C7A', '#0F2D4F', '#7A1F3D',
  ];

  readonly showNewCategory = signal(false);

  readonly newCategory = new FormGroup({
    label: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    budget: new FormControl<number>(0, { nonNullable: true, validators: [Validators.min(0)] }),
    color: new FormControl(this.palette[0], { nonNullable: true, validators: [Validators.required] }),
  });

  readonly newCategorySlug = computed(() => slugify(this.labelValue()));

  readonly slugTaken = computed(() => {
    const slug = this.newCategorySlug();
    return slug !== '' && this.data.categories().some((c) => c.id === slug);
  });

  toggleNewCategory(): void {
    this.showNewCategory.update((open) => !open);
  }

  saveCategory(): void {
    if (this.newCategory.invalid || this.slugTaken()) return;
    const slug = this.newCategorySlug();
    if (!slug) return;
    const v = this.newCategory.getRawValue();
    this.data.createCategory({
      id: slug,
      label: v.label,
      color: v.color,
      budget: Number(v.budget),
    });
    this.cancelNewCategory();
  }

  cancelNewCategory(): void {
    this.newCategory.reset({ label: '', budget: 0, color: this.palette[0] });
    this.showNewCategory.set(false);
  }
```

O `labelValue` precisa ser um signal para o `computed` reagir. Adicionar, no `constructor` ou como campo:

```typescript
  private readonly labelValue = signal('');
```

e no `constructor`:

```typescript
  constructor() {
    this.newCategory.controls.label.valueChanges.subscribe((v) => this.labelValue.set(v ?? ''));
  }
```

Nota: `data` hoje é `protected`; os membros novos usados pelo teste (`showNewCategory`, `newCategory`, `newCategorySlug`, `slugTaken`, `saveCategory`) precisam ser **públicos** — sem modificador — para o spec acessá-los.

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npx nx test ui-financial --testPathPatterns=settings.component`
Expected: PASS — 9 testes.

- [ ] **Step 5: Ligar o botão e adicionar o form no template**

Em `apps/ui-financial/src/app/features/settings/settings.component.html`, trocar o botão disabled (linha ~30):

```html
            <button
              class="btn-primary"
              type="button"
              [disabled]="!auth.canWrite()"
              (click)="toggleNewCategory()"
            >
              + Nova categoria
            </button>
```

E, logo abaixo do cabeçalho do card (antes da tabela de categorias), acrescentar o form:

```html
          @if (showNewCategory()) {
            <form class="new-cat-form" [formGroup]="newCategory" (ngSubmit)="saveCategory()">
              <label class="field">
                <span class="label">Nome</span>
                <input type="text" class="text-input" formControlName="label" placeholder="Ex.: Farmácia" />
              </label>

              <label class="field">
                <span class="label">Orçamento</span>
                <input type="number" class="text-input num" formControlName="budget" min="0" step="0.01" />
              </label>

              <div class="field">
                <span class="label">Cor</span>
                <div class="swatches">
                  @for (c of palette; track c) {
                    <button
                      type="button"
                      class="swatch"
                      [class.active]="newCategory.controls.color.value === c"
                      [style.background]="c"
                      [attr.aria-label]="'Cor ' + c"
                      (click)="newCategory.controls.color.setValue(c)"
                    ></button>
                  }
                </div>
              </div>

              @if (slugTaken()) {
                <p class="form-error">Já existe uma categoria com esse nome.</p>
              }

              <div class="form-actions">
                <button type="button" class="btn-ghost" (click)="cancelNewCategory()">Cancelar</button>
                <button type="submit" class="btn-primary" [disabled]="newCategory.invalid || slugTaken()">
                  Salvar
                </button>
              </div>
            </form>
          }
```

- [ ] **Step 6: Estilos do form**

Em `apps/ui-financial/src/app/features/settings/settings.component.scss`, acrescentar o mínimo para o form não sair quebrado, seguindo as variáveis já usadas no arquivo:

```scss
.new-cat-form {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-end;
  padding: 12px 16px;
  border-bottom: 1px solid var(--line);

  .field { display: flex; flex-direction: column; gap: 4px; }
  .swatches { display: flex; gap: 6px; }
  .swatch {
    width: 20px; height: 20px; border-radius: 50%;
    border: 2px solid transparent; cursor: pointer;
    &.active { border-color: var(--ink); }
  }
  .form-error { color: var(--neg); font-size: 12px; flex-basis: 100%; margin: 0; }
  .form-actions { display: flex; gap: 8px; margin-left: auto; }
}
```

Conferir os nomes reais das variáveis CSS no arquivo antes de colar (`--line`, `--ink`, `--neg` são as usadas no resto da app; se alguma não existir, usar a equivalente do arquivo).

- [ ] **Step 7: Build para type-check de template**

Run: `npx nx build ui-financial`
Expected: build verde.

- [ ] **Step 8: Commit**

```bash
git add apps/ui-financial/src/app/features/settings
git commit -F - <<'EOF'
feat(ui-financial): create categories from settings

The '+ Nova categoria' button was a disabled stub. It now reveals an
inline form whose slug is derived from the label, with a fixed palette so
the posted colour always satisfies the backend's IsHexColor.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 5: Gate da fatia

**Files:** nenhum.

- [ ] **Step 1: Suítes**

Run: `npx nx test api-financial && npx nx test ui-financial && npx nx test shared-utils`
Expected: PASS nos três.

- [ ] **Step 2: Builds**

Run: `npx nx build api-financial && npx nx build ui-financial`
Expected: verde nos dois.

- [ ] **Step 3: Lint**

Run: `npx nx lint ui-financial`
Expected: "All files pass linting".

- [ ] **Step 4: Smoke manual**

Com o stack rodando e logado:
1. Ajustes → Categorias → **+ Nova categoria** abre o form.
2. Digitar um nome que já existe ("Casa") → erro inline e Salvar bloqueado.
3. Criar "Farmácia" com orçamento e cor → aparece na tabela de Ajustes **e** na tela de Orçamentos.
4. Abrir o drawer: a categoria nova aparece no seletor de categoria.
5. Com usuário sem papel de escrita, o botão **+ Nova categoria** fica desabilitado.

- [ ] **Step 5: Gate de review**

Rodar `/code-review` sobre o diff da fatia.

---

## Self-Review

**Cobertura da spec:**
- §3 Backend: nenhuma mudança — nenhuma task, correto.
- §4 UI: wire type + api service + mapper → Task 2; `AppDataService` → Task 3; `features/settings` (D4/D5) → Task 4; `features/budgets` não muda (já lê real) e é verificado no smoke da Task 5.
- §5 Testes e gate → distribuídos e consolidados na Task 5.
- D5 exigiu uma função nova de slug, que não estava na spec original → Task 1.

**Type consistency:** `categoryToCreateWire(c: Category)` recebe o domínio e emite `{ slug, label, color, budget }`; `createCategory(c: Category)` tem a mesma assinatura na Task 3 (produz) e na Task 4 (consome); `slugify` devolve `string` e pode devolver `''`, caso tratado explicitamente no `saveCategory`.

**Ponto de atenção conhecido:** `loadCatalog()` continua sem tratamento de erro (dois `subscribe` de um argumento). Está fora do escopo desta fatia; anotar para a fatia de limpeza (7).
