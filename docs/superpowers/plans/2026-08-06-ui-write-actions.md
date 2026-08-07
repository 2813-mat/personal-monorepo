# Ações de escrita na UI (`ui-financial`) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ligar os oito controles de escrita da UI aos endpoints entregues no Projeto 2.

**Architecture:** Estende a camada de dados existente sem criar estrutura nova —
`wire.types.ts` ganha os tipos de `PATCH`, cada `<recurso>-api.service.ts` ganha os métodos, os
mappers ganham `…ToUpdateWire`, e `AppDataService` ganha os métodos de fachada no padrão atual
(`subscribe` → recarrega no sucesso → `fail()` no erro). Três drawers de edição novos, mais um
modo de edição dentro do `expense-drawer` para transação.

**Tech Stack:** Angular 20 standalone + signals (zoneless), Reactive Forms, Jest, Nx.

**Spec:** `docs/superpowers/specs/2026-08-06-ui-write-actions-design.md`

## Estado da execução (2026-08-07)

**Fatias A, B e C entregues.** Tasks 1 a 9 concluídas, mais duas correções não previstas.

| Task | Commit | Estado |
|---|---|---|
| 1 — `reviewed` e `order` no domínio | `6373143` | ✅ |
| — correção de `shared-mocks` e `seed.ts` | `61829d7` | ✅ (não estava no plano) |
| 2 — camada de dados do `PATCH` de transação | `5179a46` | ✅ |
| 3 — botão "Marcar como conferido" | `791674c` | ✅ |
| 4 + 5 — indicador na lista e filtro | `a0c04b6` | ✅ |
| 6 — camada de dados de categoria | `ef42829` | ✅ |
| 7 — `category-edit-drawer` | `6cb1bb3` | ✅ |
| 8 — excluir categoria com o 409 traduzido | `ce27a16` | ✅ |
| 9 — reordenar com setas | `14f9224` | ✅ |
| — `reviewed` num mock de `Income` | `6266326` | ✅ (não estava no plano) |
| 10 a 17 | — | pendente |

Suítes no ponto de parada: **ui-financial 261**, `lint` e `build` verdes.

### Desvios do plano na Fatia C

1. **`confirmingRemoval` ficou público**, não `protected`. O teste da Task 8 acessa
   `component.confirmingRemoval()` direto; como `protected` isso é `TS2445` no `tsc` dos specs.
   Segue a convenção do `showNewCategory`, que já é `readonly` público no mesmo arquivo.
2. **`categoryToUpdateWire` ganhou teste próprio** no `catalog.mapper.spec.ts` — o plano listava
   o arquivo como modificado mas não trazia o teste, e a constraint de "mapper que descarta
   campo é bug" pedia um.
3. **Botões de Excluir e de setas também no card mobile**, não só na tabela. O plano só
   detalhava o desktop para o Excluir. `button.stc-tag` precisou zerar o chrome de botão.
4. A célula de arraste (`grid`) da tabela virou as duas setas; a `<th>` foi de 24px para 64px.

### Correção não prevista que entrou

`fixed.component.spec.ts` tinha um mock de `Income` com `reviewed: false` — campo que `Income`
não possui. Entrou na Task 1 de ontem e só aparecia no `tsc -p tsconfig.spec.json`, que o Jest
não roda. Reforça a dívida nº 2 abaixo.

### Task não prevista que precisou entrar

Tornar `reviewed` e `order` obrigatórios quebrou o type-check de **`api-financial`**, porque
`seed.ts` importa `libs/shared-mocks`. Além de acrescentar os campos aos mocks (11 categorias,
33 transações), o `seed.ts` **não gravava `order`** — uma base recém-semeada nasceria com todas
as categorias em `order: 0`, sem ordem definida. Corrigido nos dois lugares.

**Lição para as fatias restantes:** mudança em `libs/shared-types` atravessa os dois apps. Ao
mexer em tipo compartilhado, rodar também `npx nx build api-financial`.

### Dívidas abertas, deliberadamente não pagas

1. **Erros de tipo pré-existentes** em `apps/ui-financial/src/app/features/reports/reports.component.spec.ts`
   — três fixtures de `MonthEntry` sem `year`, `month` e `perCategory`. Anteriores a esta
   sessão. Enquanto existirem, o `tsc -p tsconfig.spec.json` nasce com ruído.
2. **O `tsc --noEmit` dos specs não é gate automático** — segue como disciplina manual.
   Adicioná-lo ao target `test` do Nx é mudança de configuração fora do escopo desta fatia.
3. **`app-data.service.ts`** cresce a cada fatia; a quebra por recurso segue registrada para a
   Task 17.

## Global Constraints

- **Branch:** `feat/upgrading-the-system`. Commits diretos, sem PR.
- **`api-financial` só é tocado se um tipo compartilhado mudar.** O backend está pronto, mas
  `seed.ts` importa `libs/shared-mocks`, que usa os tipos de `libs/shared-types` — mexer neles
  atravessa os dois apps. Rodar `npx nx build api-financial` nesse caso.
- **Padrão da fachada:** todo método de escrita em `AppDataService` faz
  `subscribe({ next: () => this.load<Recurso>(), error: () => this.fail(msg, this.<recurso>Error) })`.
  Não inventar outro fluxo.
- **`slug` nunca é editável** — é a chave de URL e a referência entre recursos.
- **Mapper que descarta campo é bug.** O umbrella §1b registra 3 ocorrências disso.
  `reviewed` e `order` entram com teste próprio.
- **Salvar só habilita com `form.dirty`** — evita o 400 de corpo vazio do backend.
- **Gate:** `npx nx test ui-financial`, `npx nx lint ui-financial` e
  **`npx nx build ui-financial`**. O umbrella §6 registra que o Jest da UI não faz type-check
  estrito de template — no Projeto 1 a suíte passou verde com o build quebrado.
- **O Jest da UI também não reporta erro de tipo em `.spec.ts`** (descoberto na Task 1). O
  `nx build` tampouco, porque `tsconfig.app.json` exclui specs. Ao mexer em tipo compartilhado,
  rodar também:

  ```bash
  npx tsc -p apps/ui-financial/tsconfig.spec.json --noEmit
  ```

  Ignorar o ruído de `TS2307`/`moduleResolution` (artefato de rodar `tsc` fora do preset) e
  olhar os `TS2345`/`TS2741`, que são reais. Na Task 1 esse comando revelou **20 erros** que a
  suíte verde escondia — dois deles em **código de produção**.
- Todo texto de UI em **pt-BR**.

### Convenções de nome que o plano assume (verificadas no código)

- `Category.id` **é** o slug (`wireToCategory` faz `id: w.slug`).
- `Goal.id` **é** o slug; `Goal.type` é minúsculo no domínio (`'sonho'`) e maiúsculo no wire.
- `Transaction.method` no domínio é `'pix'` **ou** o `cardId`; no wire são dois campos
  (`method: 'PIX'|'CARD'` + `cardId`).
- `FixedExpense` usa `due`/`cat` no domínio e `dueDay`/`categorySlug` no wire.

---

## Fatia A — Fundação de dados

### Task 1: `reviewed` e `order` do wire até o domínio

**Files:**
- Modify: `libs/shared-types/src/lib/finance.types.ts`
- Modify: `apps/ui-financial/src/app/core/api/wire.types.ts`
- Modify: `apps/ui-financial/src/app/core/api/transaction.mapper.ts`
- Modify: `apps/ui-financial/src/app/core/api/transaction.mapper.spec.ts`
- Modify: `apps/ui-financial/src/app/core/api/catalog.mapper.ts`
- Modify: `apps/ui-financial/src/app/core/api/catalog.mapper.spec.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `Transaction.reviewed: boolean`, `Category.order: number`,
  `TransactionWire.reviewed`, `CategoryWire.order`. Todas as tasks seguintes dependem.

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar a `transaction.mapper.spec.ts`:

```ts
describe('wireToTransaction — reviewed', () => {
  it('traz reviewed do wire', () => {
    const w = { ...baseWire, reviewed: true } as never;
    expect(wireToTransaction(w).reviewed).toBe(true);
  });

  it('traz false quando não conferido', () => {
    const w = { ...baseWire, reviewed: false } as never;
    expect(wireToTransaction(w).reviewed).toBe(false);
  });
});
```

> Ler o topo do spec para o nome real da fixture de wire e usá-lo no lugar de `baseWire`.

Acrescentar a `catalog.mapper.spec.ts`:

```ts
describe('wireToCategory — order', () => {
  it('traz order do wire', () => {
    const w = { id: 'c1', slug: 'casa', label: 'Casa', color: '#7A4F1D', budget: 500, order: 3 };
    expect(wireToCategory(w).order).toBe(3);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx nx test ui-financial --testPathPattern="transaction.mapper|catalog.mapper"`
Expected: FAIL — `reviewed`/`order` não existem nos tipos.

- [ ] **Step 3: Domínio**

Em `libs/shared-types/src/lib/finance.types.ts`, dentro de `Category`:

```ts
  order: number;
```

E dentro de `Transaction`:

```ts
  reviewed: boolean;
```

- [ ] **Step 4: Wire**

Em `wire.types.ts`, dentro de `TransactionWire`:

```ts
  reviewed: boolean;
```

Dentro de `CategoryWire`:

```ts
  order: number;
```

- [ ] **Step 5: Mappers de leitura**

Em `transaction.mapper.ts`, dentro de `wireToTransaction`, após `recurring: w.recurring,`:

```ts
    reviewed: w.reviewed,
```

Em `catalog.mapper.ts`, `wireToCategory` inteiro:

```ts
export function wireToCategory(w: CategoryWire): Category {
  return { id: w.slug, label: w.label, color: w.color, budget: w.budget, order: w.order };
}
```

- [ ] **Step 6: Corrigir as fixtures que o campo obrigatório quebrar**

Run: `npx nx test ui-financial`

Campos obrigatórios novos derrubam fixtures de `Transaction`/`Category` espalhadas pelos
specs. **Isso é o efeito desejado.** Acrescentar `reviewed: false` / `order: 1` a cada
fixture que o TypeScript apontar, até a suíte compilar.

> No Projeto 2 o mesmo ocorreu no backend e revelou uma fixture desatualizada.

- [ ] **Step 7: Gate e commit**

Run: `npx nx test ui-financial && npx nx build ui-financial`

```bash
git add libs/shared-types/ apps/ui-financial/src/app/core/api/
git commit -m "feat(ui-financial): carry reviewed and order from the wire into the domain"
```

---

## Fatia B — Conferido

### Task 2: Camada de dados de `PATCH` de transação

**Files:**
- Modify: `apps/ui-financial/src/app/core/api/wire.types.ts`
- Modify: `apps/ui-financial/src/app/core/api/transaction-api.service.ts`
- Modify: `apps/ui-financial/src/app/core/api/transaction-api.service.spec.ts`
- Modify: `apps/ui-financial/src/app/core/api/transaction.mapper.ts`
- Modify: `apps/ui-financial/src/app/core/api/transaction.mapper.spec.ts`
- Modify: `apps/ui-financial/src/app/layout/app-data.service.ts`

**Interfaces:**
- Consumes: `Transaction.reviewed` (Task 1).
- Produces: `UpdateTransactionWire`, `TransactionApiService.update(id, body)`,
  `transactionToUpdateWire(t)`, `AppDataService.setTransactionReviewed(id, reviewed)` e
  `AppDataService.updateTransaction(t)`. Tasks 3 e 16 dependem.

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar a `transaction-api.service.spec.ts`:

```ts
it('PATCHes a transaction', () => {
  service.update('t1', { reviewed: true }).subscribe();
  const req = httpMock.expectOne(`${environment.apiBaseUrl}/transactions/t1`);
  expect(req.request.method).toBe('PATCH');
  expect(req.request.body).toEqual({ reviewed: true });
  req.flush({});
});
```

Acrescentar a `transaction.mapper.spec.ts`:

```ts
describe('transactionToUpdateWire', () => {
  const tx = {
    id: 't1', date: '2026-05-05', label: 'Mercado', value: 240, cat: 'casa',
    holder: 'Mateus' as const, method: 'pix', installments: null, reviewed: false,
  } as never;

  it('desdobra method pix em PIX sem cardId', () => {
    expect(transactionToUpdateWire(tx)).toMatchObject({ method: 'PIX', cardId: null });
  });

  it('desdobra um cardId em CARD com o cartão', () => {
    const noCard = { ...(tx as object), method: 'nu-t' } as never;
    expect(transactionToUpdateWire(noCard)).toMatchObject({ method: 'CARD', cardId: 'nu-t' });
  });

  it('não envia parcelamento — o PATCH não aceita alterá-lo', () => {
    expect(transactionToUpdateWire(tx)).not.toHaveProperty('installments');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx nx test ui-financial --testPathPattern=transaction`
Expected: FAIL — `service.update` e `transactionToUpdateWire` não existem.

- [ ] **Step 3: Wire type**

Em `wire.types.ts`:

```ts
export interface UpdateTransactionWire {
  date?: string;
  label?: string;
  value?: number;
  categorySlug?: string;
  holder?: string;
  method?: 'PIX' | 'CARD';
  cardId?: string | null;
  note?: string;
  reviewed?: boolean;
}
```

- [ ] **Step 4: API service**

Em `transaction-api.service.ts`, importar `UpdateTransactionWire` e acrescentar:

```ts
  update(id: string, body: UpdateTransactionWire): Observable<TransactionWire> {
    return this.http.patch<TransactionWire>(`${this.base}/${id}`, body);
  }
```

> Conferir se `this.base` já inclui `/transactions` neste serviço (o `remove` usa
> `${this.base}/${id}`); seguir a mesma forma.

- [ ] **Step 5: Mapper**

Em `transaction.mapper.ts`:

```ts
/**
 * Envia o objeto inteiro: o PATCH aceita todos estes campos e diferenciar o
 * que mudou seria complexidade sem ganho numa base deste tamanho.
 * `installments` fica de fora — o backend não aceita alterá-lo.
 */
export function transactionToUpdateWire(t: Transaction): UpdateTransactionWire {
  const isPix = t.method === 'pix';
  return {
    date: t.date,
    label: t.label,
    value: t.value,
    categorySlug: t.cat,
    holder: t.holder,
    method: isPix ? 'PIX' : 'CARD',
    cardId: isPix ? null : t.method,
    note: t.note,
    reviewed: t.reviewed,
  };
}
```

- [ ] **Step 6: Fachada**

Em `app-data.service.ts`, junto dos demais métodos de escrita:

```ts
  /** Alterna só o campo conferido — não manda o objeto inteiro. */
  setTransactionReviewed(id: string, reviewed: boolean): void {
    this.txApi.update(id, { reviewed }).subscribe({
      next: () => this.loadTransactions(),
      error: () => this.fail('Falha ao marcar como conferido', this.transactionsError),
    });
  }

  updateTransaction(t: Transaction): void {
    this.txApi.update(t.id, transactionToUpdateWire(t)).subscribe({
      next: () => this.loadTransactions(),
      error: () => this.fail('Falha ao salvar transação', this.transactionsError),
    });
  }
```

Importar `transactionToUpdateWire` do mapper.

- [ ] **Step 7: Gate e commit**

Run: `npx nx test ui-financial && npx nx build ui-financial`

```bash
git add apps/ui-financial/src/app/core/api/ apps/ui-financial/src/app/layout/app-data.service.ts
git commit -m "feat(ui-financial): add the transaction PATCH data layer"
```

---

### Task 3: Botão "Marcar como conferido" com estado

**Files:**
- Modify: `apps/ui-financial/src/app/features/tx-detail-drawer/tx-detail-drawer.component.ts`
- Modify: `apps/ui-financial/src/app/features/tx-detail-drawer/tx-detail-drawer.component.html`
- Create: `apps/ui-financial/src/app/features/tx-detail-drawer/tx-detail-drawer.component.spec.ts`

**Interfaces:**
- Consumes: `AppDataService.setTransactionReviewed(id, reviewed)` (Task 2).
- Produces: nada consumido adiante.

- [ ] **Step 1: Escrever o teste que falha**

`tx-detail-drawer.component.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TxDetailDrawerComponent } from './tx-detail-drawer.component';
import { AppDataService } from '../../layout/app-data.service';
import { AuthService } from '../../core/auth/auth.service';
import { ViewportService } from '../../core/viewport.service';
import type { Transaction } from '@caixa-familia/shared-types';

const TX: Transaction = {
  id: 't1', date: '2026-05-05', label: 'Mercado', value: 240, cat: 'casa',
  holder: 'Mateus', method: 'pix', installments: null, reviewed: false,
};

function build(tx: Transaction = TX) {
  const data = {
    setTransactionReviewed: jest.fn(),
    removeTransaction: jest.fn(),
    createTransaction: jest.fn(),
    catBy: signal({}),
    cardBy: signal({}),
    transactions: signal([tx]),
  };
  TestBed.configureTestingModule({
    imports: [TxDetailDrawerComponent],
    providers: [
      { provide: AppDataService, useValue: data },
      { provide: AuthService, useValue: { canWrite: signal(true) } },
      { provide: ViewportService, useValue: { isDesktop: signal(true) } },
    ],
  });
  const fixture = TestBed.createComponent(TxDetailDrawerComponent);
  fixture.componentRef.setInput('tx', tx);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement, data };
}

afterEach(() => TestBed.resetTestingModule());

describe('TxDetailDrawerComponent — conferido', () => {
  it('oferece marcar quando não conferida', () => {
    const { el } = build();
    expect(el.querySelector('.btn-review').textContent).toContain('Marcar como conferido');
  });

  it('mostra o estado quando já conferida', () => {
    const { el } = build({ ...TX, reviewed: true });
    expect(el.querySelector('.btn-review').textContent).toContain('Conferido');
  });

  it('marca ao clicar', () => {
    const { el, data } = build();
    el.querySelector('.btn-review').click();
    expect(data.setTransactionReviewed).toHaveBeenCalledWith('t1', true);
  });

  it('desmarca ao clicar quando já conferida', () => {
    const { el, data } = build({ ...TX, reviewed: true });
    el.querySelector('.btn-review').click();
    expect(data.setTransactionReviewed).toHaveBeenCalledWith('t1', false);
  });
});
```

> Conferir no componente se `tx` é `input()` ou `@Input()` e ajustar o `setInput` conforme.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx nx test ui-financial --testPathPattern=tx-detail-drawer`
Expected: FAIL — `.btn-review` não existe.

- [ ] **Step 3: Método no componente**

Em `tx-detail-drawer.component.ts`:

```ts
  toggleReviewed() {
    const tx = this.tx();
    this.data.setTransactionReviewed(tx.id, !tx.reviewed);
  }
```

> Se `tx` for `@Input()` em vez de `input()`, usar `this.tx` sem chamada.

- [ ] **Step 4: Template**

Em `tx-detail-drawer.component.html`, substituir o botão `disabled`:

```html
      <button
        type="button"
        class="btn btn-primary btn-review"
        [disabled]="!auth.canWrite()"
        (click)="toggleReviewed()"
      >
        @if (tx().reviewed) {
          <cf-icon name="check" [size]="12" /> Conferido
        } @else {
          Marcar como conferido
        }
      </button>
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx nx test ui-financial --testPathPattern=tx-detail-drawer`
Expected: PASS, 4 testes.

- [ ] **Step 6: Gate e commit**

Run: `npx nx test ui-financial && npx nx build ui-financial`

```bash
git add apps/ui-financial/src/app/features/tx-detail-drawer/
git commit -m "feat(ui-financial): wire the mark-as-reviewed button"
```

---

### Task 4: Indicador de conferido na lista

**Files:**
- Modify: `apps/ui-financial/src/app/features/transactions/transactions.component.html`
- Modify: `apps/ui-financial/src/app/features/transactions/transactions.component.scss`
- Modify: `apps/ui-financial/src/app/features/transactions/transactions.component.spec.ts`

**Interfaces:**
- Consumes: `Transaction.reviewed` (Task 1).
- Produces: nada.

> Sem isto, marcar como conferido não muda nada fora do drawer e o recurso fica pela metade.
> A tela tem **dois ramos** desde o Projeto 1 — tabela no desktop, card no celular — e o
> indicador entra nos dois.

- [ ] **Step 1: Escrever o teste que falha**

Acrescentar a `transactions.component.spec.ts` (o arquivo já tem `build(isDesktop)` que
devolve `{ fixture, el, data }`):

```ts
describe('TransactionsComponent — indicador de conferido', () => {
  it('marca a linha conferida no desktop', () => {
    const { el, fixture, data } = build(true);
    data.transactions.set([{ ...TRANSACTIONS[0], reviewed: true }]);
    fixture.detectChanges();
    expect(el.querySelectorAll('.tx-reviewed').length).toBe(1);
  });

  it('não marca a linha não conferida', () => {
    const { el, fixture, data } = build(true);
    data.transactions.set([{ ...TRANSACTIONS[0], reviewed: false }]);
    fixture.detectChanges();
    expect(el.querySelector('.tx-reviewed')).toBeNull();
  });

  it('marca o card conferido no celular', () => {
    const { el, fixture, data } = build(false);
    data.transactions.set([{ ...TRANSACTIONS[0], reviewed: true }]);
    fixture.detectChanges();
    expect(el.querySelectorAll('.tx-reviewed').length).toBe(1);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx nx test ui-financial --testPathPattern=transactions.component`
Expected: FAIL — `.tx-reviewed` não existe.

- [ ] **Step 3: Ramo desktop**

Em `transactions.component.html`, dentro do `<ng-template #txRow>`, na célula de descrição,
logo após `<span class="desc-label">{{ tx.label }}</span>`:

```html
        @if (tx.reviewed) {
          <span class="tx-reviewed" title="Conferido">
            <cf-icon name="check" [size]="10" />
          </span>
        }
```

- [ ] **Step 4: Ramo mobile**

No ramo `@else` (lista de cards), dentro de `.txc-meta`, após a etiqueta de titular:

```html
            @if (tx.reviewed) {
              <span class="txc-tag tx-reviewed">
                <cf-icon name="check" [size]="9" /> conferido
              </span>
            }
```

- [ ] **Step 5: Estilo**

Acrescentar a `transactions.component.scss`, antes do bloco `@include r.desktop`:

```scss
.tx-reviewed {
  display: inline-flex; align-items: center; gap: 3px;
  color: var(--pos);
}
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npx nx test ui-financial --testPathPattern=transactions.component`
Expected: PASS.

- [ ] **Step 7: Gate e commit**

Run: `npx nx test ui-financial && npx nx build ui-financial`

```bash
git add apps/ui-financial/src/app/features/transactions/
git commit -m "feat(ui-financial): show the reviewed mark in the transactions list"
```

---

### Task 5: Filtro "Só não conferidos"

**Files:**
- Modify: `apps/ui-financial/src/app/features/transactions/transactions.component.ts`
- Modify: `apps/ui-financial/src/app/features/transactions/transactions.component.html`
- Modify: `apps/ui-financial/src/app/features/transactions/transactions.component.spec.ts`

**Interfaces:**
- Consumes: `Transaction.reviewed` (Task 1).
- Produces: nada.

> Filtro **client-side**, como os de categoria e busca. O umbrella §2.6 registra a decisão
> consciente de não migrar filtro para query param sem necessidade de performance.

- [ ] **Step 1: Escrever o teste que falha**

Acrescentar a `transactions.component.spec.ts`:

```ts
describe('TransactionsComponent — filtro de conferidos', () => {
  it('mostra tudo por padrão', () => {
    const { fixture, data } = build(true);
    data.transactions.set([
      { ...TRANSACTIONS[0], id: 'a', reviewed: true },
      { ...TRANSACTIONS[1], id: 'b', reviewed: false },
    ]);
    fixture.detectChanges();
    expect(fixture.componentInstance.filteredCount()).toBe(2);
  });

  it('esconde as conferidas quando ligado', () => {
    const { fixture, data } = build(true);
    data.transactions.set([
      { ...TRANSACTIONS[0], id: 'a', reviewed: true },
      { ...TRANSACTIONS[1], id: 'b', reviewed: false },
    ]);
    fixture.componentInstance.onlyUnreviewed.set(true);
    fixture.detectChanges();
    expect(fixture.componentInstance.filteredCount()).toBe(1);
    expect(fixture.componentInstance.flatSorted()[0].id).toBe('b');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx nx test ui-financial --testPathPattern=transactions.component`
Expected: FAIL — `onlyUnreviewed` não existe.

- [ ] **Step 3: Signal e filtro**

Em `transactions.component.ts`, junto dos demais signals de filtro:

```ts
  onlyUnreviewed = signal(false);
```

E dentro de `filteredTx`, acrescentar ao encadeamento de `.filter(...)`:

```ts
      .filter(t => !this.onlyUnreviewed() || !t.reviewed)
```

- [ ] **Step 4: Chip no template**

Em `transactions.component.html`, dentro de `.filter-chips`, após o `@for` das categorias:

```html
      <button
        class="filter-chip"
        [class.active]="onlyUnreviewed()"
        (click)="onlyUnreviewed.set(!onlyUnreviewed())"
      >
        Só não conferidos
      </button>
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx nx test ui-financial --testPathPattern=transactions.component`
Expected: PASS.

- [ ] **Step 6: Gate e commit**

Run: `npx nx test ui-financial && npx nx build ui-financial`

```bash
git add apps/ui-financial/src/app/features/transactions/
git commit -m "feat(ui-financial): add the unreviewed-only filter"
```

---

## Fatia C — Categorias

### Task 6: Camada de dados de categoria

**Files:**
- Modify: `apps/ui-financial/src/app/core/api/wire.types.ts`
- Modify: `apps/ui-financial/src/app/core/api/catalog-api.service.ts`
- Modify: `apps/ui-financial/src/app/core/api/catalog-api.service.spec.ts`
- Modify: `apps/ui-financial/src/app/core/api/catalog.mapper.ts`
- Modify: `apps/ui-financial/src/app/core/api/catalog.mapper.spec.ts`
- Modify: `apps/ui-financial/src/app/layout/app-data.service.ts`
- Create: `apps/ui-financial/src/app/core/api/category-conflict.ts`
- Create: `apps/ui-financial/src/app/core/api/category-conflict.spec.ts`

**Interfaces:**
- Consumes: `Category.order` (Task 1).
- Produces: `UpdateCategoryWire`, `CatalogApiService.updateCategory/removeCategory/reorderCategories`,
  `categoryToUpdateWire`, `categoryConflictMessage(err)`,
  `AppDataService.updateCategory/removeCategory/reorderCategories`. Tasks 7, 8 e 9 dependem.

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar a `catalog-api.service.spec.ts`:

```ts
it('PATCHes a category', () => {
  service.updateCategory('casa', { budget: 600 }).subscribe();
  const req = httpMock.expectOne(`${environment.apiBaseUrl}/categories/casa`);
  expect(req.request.method).toBe('PATCH');
  expect(req.request.body).toEqual({ budget: 600 });
  req.flush({});
});

it('DELETEs a category', () => {
  service.removeCategory('casa').subscribe();
  const req = httpMock.expectOne(`${environment.apiBaseUrl}/categories/casa`);
  expect(req.request.method).toBe('DELETE');
  req.flush({});
});

it('PATCHes the whole order in one call', () => {
  service.reorderCategories(['saude', 'casa']).subscribe();
  const req = httpMock.expectOne(`${environment.apiBaseUrl}/categories/order`);
  expect(req.request.method).toBe('PATCH');
  expect(req.request.body).toEqual({ slugs: ['saude', 'casa'] });
  req.flush([]);
});
```

`category-conflict.spec.ts`:

```ts
import { HttpErrorResponse } from '@angular/common/http';
import { categoryConflictMessage } from './category-conflict';

const conflict = (transactions: number, fixedExpenses: number) =>
  new HttpErrorResponse({ status: 409, error: { message: 'Categoria em uso', transactions, fixedExpenses } });

describe('categoryConflictMessage', () => {
  it('usa as contagens que a API devolve', () => {
    expect(categoryConflictMessage(conflict(5, 4))).toBe(
      'Não dá para excluir: 5 lançamentos e 4 gastos fixos usam esta categoria.',
    );
  });

  it('fala no singular quando é um só', () => {
    expect(categoryConflictMessage(conflict(1, 1))).toBe(
      'Não dá para excluir: 1 lançamento e 1 gasto fixo usam esta categoria.',
    );
  });

  it('omite a parte que está zerada', () => {
    expect(categoryConflictMessage(conflict(3, 0))).toBe(
      'Não dá para excluir: 3 lançamentos usam esta categoria.',
    );
    expect(categoryConflictMessage(conflict(0, 2))).toBe(
      'Não dá para excluir: 2 gastos fixos usam esta categoria.',
    );
  });

  it('cai numa mensagem genérica se não for 409', () => {
    const err = new HttpErrorResponse({ status: 500 });
    expect(categoryConflictMessage(err)).toBe('Falha ao excluir categoria');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx nx test ui-financial --testPathPattern="catalog|category-conflict"`
Expected: FAIL — módulos e métodos inexistentes.

- [ ] **Step 3: Wire type**

Em `wire.types.ts`:

```ts
export interface UpdateCategoryWire {
  label?: string;
  color?: string;
  budget?: number;
}
```

- [ ] **Step 4: API service**

Em `catalog-api.service.ts`:

```ts
  updateCategory(slug: string, body: UpdateCategoryWire): Observable<CategoryWire> {
    return this.http.patch<CategoryWire>(`${this.base}/categories/${slug}`, body);
  }

  removeCategory(slug: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/categories/${slug}`);
  }

  reorderCategories(slugs: string[]): Observable<CategoryWire[]> {
    return this.http.patch<CategoryWire[]>(`${this.base}/categories/order`, { slugs });
  }
```

- [ ] **Step 5: Mapper**

Em `catalog.mapper.ts`:

```ts
export function categoryToUpdateWire(c: Category): UpdateCategoryWire {
  return { label: c.label, color: c.color, budget: c.budget };
}
```

- [ ] **Step 6: Tradutor do 409**

`category-conflict.ts`:

```ts
import { HttpErrorResponse } from '@angular/common/http';

const plural = (n: number, um: string, muitos: string) => `${n} ${n === 1 ? um : muitos}`;

/**
 * O backend devolve as contagens no corpo do 409 justamente para a UI poder
 * explicar. Um "Falha ao excluir" genérico jogaria essa informação fora.
 */
export function categoryConflictMessage(err: HttpErrorResponse): string {
  const body = err.error as { transactions?: number; fixedExpenses?: number } | null;
  if (err.status !== 409 || !body) return 'Falha ao excluir categoria';
  const partes: string[] = [];
  if (body.transactions) partes.push(plural(body.transactions, 'lançamento', 'lançamentos'));
  if (body.fixedExpenses) partes.push(plural(body.fixedExpenses, 'gasto fixo', 'gastos fixos'));
  if (partes.length === 0) return 'Falha ao excluir categoria';
  return `Não dá para excluir: ${partes.join(' e ')} usam esta categoria.`;
}
```

- [ ] **Step 7: Fachada**

Em `app-data.service.ts`:

```ts
  updateCategory(c: Category): void {
    this.catApi.updateCategory(c.id, categoryToUpdateWire(c)).subscribe({
      next: () => this.loadCatalog(),
      error: () => this.fail('Falha ao salvar categoria', this.categoriesError),
    });
  }

  removeCategory(slug: string): void {
    this.catApi.removeCategory(slug).subscribe({
      next: () => this.loadCatalog(),
      error: (err) => this.fail(categoryConflictMessage(err), this.categoriesError),
    });
  }

  /** Adota a lista da resposta, não o estado otimista: duas abas não divergem. */
  reorderCategories(slugs: string[]): void {
    this.catApi.reorderCategories(slugs).subscribe({
      next: (rows) => this.categories.set(rows.map(wireToCategory)),
      error: () => this.fail('Falha ao reordenar categorias', this.categoriesError),
    });
  }
```

Importar `categoryToUpdateWire` e `categoryConflictMessage`.

- [ ] **Step 8: Gate e commit**

Run: `npx nx test ui-financial && npx nx build ui-financial`

```bash
git add apps/ui-financial/src/app/core/api/ apps/ui-financial/src/app/layout/app-data.service.ts
git commit -m "feat(ui-financial): add the category write data layer"
```

---

### Task 7: `category-edit-drawer`

**Files:**
- Create: `apps/ui-financial/src/app/features/settings/category-edit-drawer.component.ts` / `.html` / `.scss`
- Create: `apps/ui-financial/src/app/features/settings/category-edit-drawer.component.spec.ts`
- Modify: `apps/ui-financial/src/app/features/settings/settings.component.ts` / `.html`

**Interfaces:**
- Consumes: `AppDataService.updateCategory(c)` (Task 6).
- Produces: `<cf-category-edit-drawer [category]="…" (closed)="…" />`.

- [ ] **Step 1: Escrever o teste que falha**

`category-edit-drawer.component.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { CategoryEditDrawerComponent } from './category-edit-drawer.component';
import { AppDataService } from '../../layout/app-data.service';
import type { Category } from '@caixa-familia/shared-types';

const CAT: Category = { id: 'casa', label: 'Casa', color: '#7A4F1D', budget: 500, order: 1 };

function build() {
  const data = { updateCategory: jest.fn() };
  TestBed.configureTestingModule({
    imports: [CategoryEditDrawerComponent],
    providers: [{ provide: AppDataService, useValue: data }],
  });
  const fixture = TestBed.createComponent(CategoryEditDrawerComponent);
  fixture.componentRef.setInput('category', CAT);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement, data, c: fixture.componentInstance };
}

afterEach(() => TestBed.resetTestingModule());

describe('CategoryEditDrawerComponent', () => {
  it('preenche o formulário a partir da categoria', () => {
    expect(build().c.form.getRawValue()).toMatchObject({
      label: 'Casa', color: '#7A4F1D', budget: 500,
    });
  });

  it('mantém Salvar desabilitado enquanto nada mudou', () => {
    expect(build().el.querySelector('.save-btn').disabled).toBe(true);
  });

  it('salva a categoria com o id original', () => {
    const { c, data } = build();
    c.form.controls.budget.setValue(600);
    c.form.markAsDirty();
    c.save();
    expect(data.updateCategory).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'casa', budget: 600 }),
    );
  });

  it('emite closed ao salvar', () => {
    const { c } = build();
    const seen: void[] = [];
    c.closed.subscribe(() => seen.push(undefined));
    c.form.markAsDirty();
    c.save();
    expect(seen.length).toBe(1);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx nx test ui-financial --testPathPattern=category-edit-drawer`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Componente**

`category-edit-drawer.component.ts`:

```ts
import { Component, effect, inject, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Category } from '@caixa-familia/shared-types';
import { AppDataService } from '../../layout/app-data.service';
import { IconComponent } from '../../ui/icon/icon.component';

@Component({
  selector: 'cf-category-edit-drawer',
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent],
  templateUrl: './category-edit-drawer.component.html',
  styleUrl: './category-edit-drawer.component.scss',
})
export class CategoryEditDrawerComponent {
  private data = inject(AppDataService);

  readonly category = input.required<Category>();
  readonly closed = output<void>();

  form = new FormGroup({
    label: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    color: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    budget: new FormControl(0, { nonNullable: true, validators: [Validators.min(0)] }),
  });

  constructor() {
    effect(() => {
      const c = this.category();
      this.form.setValue({ label: c.label, color: c.color, budget: c.budget });
      this.form.markAsPristine();
    });
  }

  save() {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    // O id (slug) vem da categoria original: não é editável.
    this.data.updateCategory({ ...this.category(), ...v });
    this.closed.emit();
  }
}
```

- [ ] **Step 4: Template**

`category-edit-drawer.component.html`:

```html
<div class="backdrop" role="button" tabindex="0" aria-label="Fechar"
  (click)="closed.emit()" (keydown.enter)="closed.emit()" (keydown.space)="closed.emit()"></div>

<aside class="panel" [formGroup]="form">
  <header class="drawer-head">
    <span class="head-title">Editar categoria</span>
    <button type="button" class="close-btn" (click)="closed.emit()" aria-label="Fechar">
      <cf-icon name="x" [size]="14" />
    </button>
  </header>

  <div class="drawer-body">
    <label class="label" for="cat-label">Nome</label>
    <input id="cat-label" class="text-input" formControlName="label" />

    <label class="label mt" for="cat-color">Cor</label>
    <input id="cat-color" class="text-input" formControlName="color" placeholder="#7A4F1D" />

    <label class="label mt" for="cat-budget">Orçamento por mês</label>
    <input id="cat-budget" class="text-input" type="number" formControlName="budget" />
  </div>

  <footer class="drawer-foot">
    <span class="foot-hint">{{ category().id }}</span>
    <button type="button" class="save-btn" [disabled]="form.invalid || form.pristine" (click)="save()">
      Salvar
    </button>
  </footer>
</aside>
```

- [ ] **Step 5: Estilo**

`category-edit-drawer.component.scss`:

```scss
@use 'responsive' as r;

:host { display: block; }

.backdrop {
  position: fixed; inset: 0;
  background: rgba(15, 20, 30, 0.32);
  z-index: 80;
}

/* Celular: tela cheia, como os drawers do Projeto 1. */
.panel {
  position: fixed; inset: 0;
  width: 100%; height: 100dvh;
  background: var(--surface);
  display: flex; flex-direction: column;
  z-index: 81;
}

.drawer-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 20px; border-bottom: 1px solid var(--line); flex-shrink: 0;
}
.head-title { font-size: 15px; font-weight: 600; color: var(--ink-1); }
.close-btn {
  width: 44px; height: 44px;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid var(--line); background: var(--surface); color: var(--ink-2);
}

.drawer-body { flex: 1; overflow: auto; padding: 16px 20px; }
.label {
  display: block;
  font-size: 10.5px; font-weight: 600; color: var(--ink-3);
  text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 6px;
}
.label.mt { margin-top: 16px; }
.text-input {
  width: 100%;
  border: 1px solid var(--line); background: var(--surface);
  padding: 8px 10px; font-size: 13px; color: var(--ink-1);
  font-family: inherit; outline: none;
}
.text-input:focus { border-color: var(--brand); }

.drawer-foot {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 20px; border-top: 1px solid var(--line);
  background: var(--surface-sunk); flex-shrink: 0;
}
.foot-hint { font-size: 12px; color: var(--ink-3); font-family: var(--font-mono); }
.save-btn {
  min-height: 44px; padding: 0 16px;
  font-size: 12px; font-weight: 500;
  background: var(--ink-1); color: #fff; border: 0;
}
.save-btn:disabled { opacity: 0.5; cursor: default; }

@include r.desktop {
  .panel {
    inset: 0 0 auto auto; top: 0; right: 0;
    width: 420px; height: 100dvh;
    border-left: 1px solid var(--line);
    box-shadow: -12px 0 32px rgba(0, 0, 0, 0.15);
  }
  .close-btn { width: 26px; height: 26px; }
  .save-btn { min-height: 30px; }
}
```

- [ ] **Step 6: Ligar em Configurações**

Em `settings.component.ts`: importar `CategoryEditDrawerComponent`, pôr nos `imports`, e
acrescentar:

```ts
  protected editingCategory = signal<Category | null>(null);
```

Em `settings.component.html`, trocar o `<button class="btn-ghost" disabled>Reordenar</button>`
**não** — esse é da Task 9. Aqui, no ramo da tabela de categorias, acrescentar uma célula de
ação por linha, e o equivalente no card mobile:

```html
<!-- desktop: dentro da última <td class="gear-cell"> -->
<button class="icon-btn" (click)="editingCategory.set(c)" [disabled]="!auth.canWrite()"
  aria-label="Editar categoria">
  <cf-icon name="settings" [size]="11" />
</button>
```

```html
<!-- mobile: dentro de .stc-meta -->
<button class="stc-tag" (click)="editingCategory.set(c)" [disabled]="!auth.canWrite()">
  Editar
</button>
```

E ao final do template:

```html
@if (editingCategory(); as c) {
  <cf-category-edit-drawer [category]="c" (closed)="editingCategory.set(null)" />
}
```

- [ ] **Step 7: Gate e commit**

Run: `npx nx test ui-financial && npx nx build ui-financial`

```bash
git add apps/ui-financial/src/app/features/settings/
git commit -m "feat(ui-financial): add the category edit drawer"
```

---

### Task 8: Excluir categoria com o 409 traduzido

**Files:**
- Modify: `apps/ui-financial/src/app/features/settings/settings.component.ts` / `.html`
- Modify: `apps/ui-financial/src/app/features/settings/settings.component.spec.ts`

**Interfaces:**
- Consumes: `AppDataService.removeCategory(slug)` (Task 6), `cf-confirm-modal`.
- Produces: nada.

- [ ] **Step 1: Escrever o teste que falha**

Acrescentar a `settings.component.spec.ts`:

```ts
describe('SettingsComponent — excluir categoria', () => {
  it('pede confirmação antes de excluir', () => {
    const { component, data } = buildSettings();
    component.askRemoveCategory('casa');
    expect(component.confirmingRemoval()).toBe('casa');
    expect(data.removeCategory).not.toHaveBeenCalled();
  });

  it('exclui ao confirmar', () => {
    const { component, data } = buildSettings();
    component.askRemoveCategory('casa');
    component.confirmRemoveCategory();
    expect(data.removeCategory).toHaveBeenCalledWith('casa');
    expect(component.confirmingRemoval()).toBeNull();
  });

  it('não exclui ao cancelar', () => {
    const { component, data } = buildSettings();
    component.askRemoveCategory('casa');
    component.cancelRemoveCategory();
    expect(data.removeCategory).not.toHaveBeenCalled();
    expect(component.confirmingRemoval()).toBeNull();
  });
});
```

> `buildSettings()` é um helper novo no mesmo arquivo, no molde do `buildResponsive` que já
> existe lá, devolvendo `{ component, data }` com `removeCategory: jest.fn()` no mock de
> `AppDataService`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx nx test ui-financial --testPathPattern=settings.component`
Expected: FAIL — `askRemoveCategory` não existe.

- [ ] **Step 3: Componente**

Em `settings.component.ts`:

```ts
  protected confirmingRemoval = signal<string | null>(null);

  askRemoveCategory(slug: string) {
    this.confirmingRemoval.set(slug);
  }

  confirmRemoveCategory() {
    const slug = this.confirmingRemoval();
    if (slug) this.data.removeCategory(slug);
    this.confirmingRemoval.set(null);
  }

  cancelRemoveCategory() {
    this.confirmingRemoval.set(null);
  }
```

Importar `ConfirmModalComponent` e pôr nos `imports` do `@Component`.

- [ ] **Step 4: Template**

Botão de excluir junto do de editar (desktop e mobile):

```html
<button class="icon-btn btn-neg" (click)="askRemoveCategory(c.id)" [disabled]="!auth.canWrite()"
  aria-label="Excluir categoria">
  <cf-icon name="x" [size]="11" />
</button>
```

E ao final do template:

```html
@if (confirmingRemoval()) {
  <cf-confirm-modal
    title="Excluir categoria?"
    description="Só é possível excluir categorias sem lançamentos e sem gastos fixos."
    confirmLabel="Excluir"
    [danger]="true"
    (confirmed)="confirmRemoveCategory()"
    (cancelled)="cancelRemoveCategory()"
  />
}
```

> A mensagem do 409 chega por toast, pelo `categoryConflictMessage` da Task 6. A descrição do
> modal só avisa a regra de antemão.

- [ ] **Step 5: Rodar e ver passar**

Run: `npx nx test ui-financial --testPathPattern=settings.component`
Expected: PASS.

- [ ] **Step 6: Gate e commit**

Run: `npx nx test ui-financial && npx nx build ui-financial`

```bash
git add apps/ui-financial/src/app/features/settings/
git commit -m "feat(ui-financial): allow deleting an unused category"
```

---

### Task 9: Reordenar categorias com setas

**Files:**
- Modify: `apps/ui-financial/src/app/features/settings/settings.component.ts` / `.html` / `.scss`
- Modify: `apps/ui-financial/src/app/features/settings/settings.component.spec.ts`

**Interfaces:**
- Consumes: `AppDataService.reorderCategories(slugs)` (Task 6).
- Produces: nada.

- [ ] **Step 1: Escrever o teste que falha**

Acrescentar a `settings.component.spec.ts`:

```ts
describe('SettingsComponent — reordenar', () => {
  it('sobe uma categoria e manda a lista completa', () => {
    const { component, data } = buildSettings([
      { id: 'a', label: 'A', color: '#000000', budget: 0, order: 1 },
      { id: 'b', label: 'B', color: '#000000', budget: 0, order: 2 },
      { id: 'c', label: 'C', color: '#000000', budget: 0, order: 3 },
    ]);
    component.moveCategory('b', -1);
    expect(data.reorderCategories).toHaveBeenCalledWith(['b', 'a', 'c']);
  });

  it('desce uma categoria', () => {
    const { component, data } = buildSettings([
      { id: 'a', label: 'A', color: '#000000', budget: 0, order: 1 },
      { id: 'b', label: 'B', color: '#000000', budget: 0, order: 2 },
    ]);
    component.moveCategory('a', 1);
    expect(data.reorderCategories).toHaveBeenCalledWith(['b', 'a']);
  });

  it('ignora subir a primeira', () => {
    const { component, data } = buildSettings([
      { id: 'a', label: 'A', color: '#000000', budget: 0, order: 1 },
    ]);
    component.moveCategory('a', -1);
    expect(data.reorderCategories).not.toHaveBeenCalled();
  });

  it('ignora descer a última', () => {
    const { component, data } = buildSettings([
      { id: 'a', label: 'A', color: '#000000', budget: 0, order: 1 },
    ]);
    component.moveCategory('a', 1);
    expect(data.reorderCategories).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx nx test ui-financial --testPathPattern=settings.component`
Expected: FAIL — `moveCategory` não existe.

- [ ] **Step 3: Componente**

Em `settings.component.ts`:

```ts
  /**
   * `delta` é -1 para subir e 1 para descer. Manda a lista completa: o
   * PATCH /categories/order rejeita lista parcial com 400 — é o contrato.
   */
  moveCategory(slug: string, delta: -1 | 1) {
    const slugs = this.data.categories().map((c) => c.id);
    const from = slugs.indexOf(slug);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= slugs.length) return;
    const next = [...slugs];
    [next[from], next[to]] = [next[to], next[from]];
    this.data.reorderCategories(next);
  }

  isFirstCategory(slug: string) {
    return this.data.categories()[0]?.id === slug;
  }

  isLastCategory(slug: string) {
    const list = this.data.categories();
    return list[list.length - 1]?.id === slug;
  }
```

- [ ] **Step 4: Template**

Substituir `<button class="btn-ghost" disabled>Reordenar</button>` por nada — a reordenação
agora é por linha, não por um botão de modo. Em cada linha (tabela e card), acrescentar:

```html
<button class="icon-btn" (click)="moveCategory(c.id, -1)"
  [disabled]="!auth.canWrite() || isFirstCategory(c.id)" aria-label="Subir">
  <cf-icon name="arrowUp" [size]="11" />
</button>
<button class="icon-btn" (click)="moveCategory(c.id, 1)"
  [disabled]="!auth.canWrite() || isLastCategory(c.id)" aria-label="Descer">
  <cf-icon name="arrowDown" [size]="11" />
</button>
```

- [ ] **Step 5: Estilo**

Acrescentar a `settings.component.scss`, antes do `@include r.desktop` existente:

```scss
.icon-btn {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 44px; min-height: 44px;
  border: 1px solid var(--line); background: var(--surface); color: var(--ink-2);
}
.icon-btn:disabled { opacity: 0.35; cursor: default; }
.icon-btn.btn-neg { color: var(--neg); }

@include r.desktop {
  .icon-btn { min-width: 26px; min-height: 26px; }
}
```

> Conferir se já existe `@include r.desktop` no arquivo (o Projeto 1 acrescentou) e pôr a
> regra de desktop dentro do bloco existente, em vez de abrir outro.

- [ ] **Step 6: Rodar e ver passar**

Run: `npx nx test ui-financial --testPathPattern=settings.component`
Expected: PASS.

- [ ] **Step 7: Gate e commit**

Run: `npx nx test ui-financial && npx nx build ui-financial`

```bash
git add apps/ui-financial/src/app/features/settings/
git commit -m "feat(ui-financial): reorder categories with up and down arrows"
```

---

## Fatia D — Metas

### Task 10: Camada de dados de meta

**Files:**
- Modify: `apps/ui-financial/src/app/core/api/wire.types.ts`
- Modify: `apps/ui-financial/src/app/core/api/goal-api.service.ts`
- Modify: `apps/ui-financial/src/app/core/api/goal-api.service.spec.ts`
- Modify: `apps/ui-financial/src/app/core/api/goal.mapper.ts`
- Modify: `apps/ui-financial/src/app/core/api/goal.mapper.spec.ts`
- Modify: `apps/ui-financial/src/app/layout/app-data.service.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `UpdateGoalWire`, `GoalApiService.update(slug, body)`, `goalToUpdateWire(g)`,
  `AppDataService.updateGoal(g)`. Task 11 depende.

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar a `goal-api.service.spec.ts`:

```ts
it('PATCHes a goal', () => {
  service.update('sos', { monthly: 900 }).subscribe();
  const req = httpMock.expectOne(`${environment.apiBaseUrl}/goals/sos`);
  expect(req.request.method).toBe('PATCH');
  expect(req.request.body).toEqual({ monthly: 900 });
  req.flush({});
});
```

Acrescentar a `goal.mapper.spec.ts`:

```ts
describe('goalToUpdateWire', () => {
  const goal = {
    id: 'sos', label: 'Reserva', target: 30000, balance: 0, monthly: 800,
    color: '#0B6E2F', subtitle: 'emergência', type: 'emergencia' as const, history: [],
  };

  it('devolve o type em maiúsculo, como o wire espera', () => {
    expect(goalToUpdateWire(goal)).toMatchObject({ type: 'EMERGENCIA' });
  });

  it('não envia o slug — não é editável', () => {
    expect(goalToUpdateWire(goal)).not.toHaveProperty('slug');
  });

  it('não envia balance nem history — são derivados', () => {
    const wire = goalToUpdateWire(goal);
    expect(wire).not.toHaveProperty('balance');
    expect(wire).not.toHaveProperty('history');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx nx test ui-financial --testPathPattern=goal`
Expected: FAIL — `update` e `goalToUpdateWire` não existem.

- [ ] **Step 3: Wire type**

Em `wire.types.ts`:

```ts
export interface UpdateGoalWire {
  label?: string;
  target?: number;
  monthly?: number;
  color?: string;
  subtitle?: string;
  type?: 'SONHO' | 'EMERGENCIA';
}
```

- [ ] **Step 4: API service**

Em `goal-api.service.ts`:

```ts
  update(slug: string, body: UpdateGoalWire): Observable<GoalWire> {
    return this.http.patch<GoalWire>(`${this.base}/goals/${slug}`, body);
  }
```

> Conferir a forma de `this.base` neste serviço (o `addContribution` mostra o padrão) e
> seguir a mesma.

- [ ] **Step 5: Mapper**

Em `goal.mapper.ts`:

```ts
export function goalToUpdateWire(g: Goal): UpdateGoalWire {
  return {
    label: g.label,
    target: g.target,
    monthly: g.monthly,
    color: g.color,
    subtitle: g.subtitle,
    type: g.type.toUpperCase() as 'SONHO' | 'EMERGENCIA',
  };
}
```

`balance` e `history` ficam de fora: são derivados das contribuições, não editáveis.

- [ ] **Step 6: Fachada**

Em `app-data.service.ts`:

```ts
  updateGoal(g: Goal): void {
    this.goalApi.update(g.id, goalToUpdateWire(g)).subscribe({
      next: () => this.loadGoals(),
      error: () => this.fail('Falha ao salvar meta', this.goalsError),
    });
  }
```

- [ ] **Step 7: Gate e commit**

Run: `npx nx test ui-financial && npx nx build ui-financial`

```bash
git add apps/ui-financial/src/app/core/api/ apps/ui-financial/src/app/layout/app-data.service.ts
git commit -m "feat(ui-financial): add the goal PATCH data layer"
```

---

### Task 11: `goal-edit-drawer` e o botão Editar

**Files:**
- Create: `apps/ui-financial/src/app/features/goals/goal-edit-drawer.component.ts` / `.html` / `.scss`
- Create: `apps/ui-financial/src/app/features/goals/goal-edit-drawer.component.spec.ts`
- Modify: `apps/ui-financial/src/app/features/goals/goal-card.component.ts` / `.html`

**Interfaces:**
- Consumes: `AppDataService.updateGoal(g)` (Task 10).
- Produces: `<cf-goal-edit-drawer [goal]="…" (closed)="…" />`.

- [ ] **Step 1: Escrever o teste que falha**

`goal-edit-drawer.component.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { GoalEditDrawerComponent } from './goal-edit-drawer.component';
import { AppDataService } from '../../layout/app-data.service';
import type { Goal } from '@caixa-familia/shared-types';

const GOAL: Goal = {
  id: 'sos', label: 'Reserva', target: 30000, balance: 1000, monthly: 800,
  color: '#0B6E2F', subtitle: 'emergência', type: 'emergencia', history: [],
};

function build() {
  const data = { updateGoal: jest.fn() };
  TestBed.configureTestingModule({
    imports: [GoalEditDrawerComponent],
    providers: [{ provide: AppDataService, useValue: data }],
  });
  const fixture = TestBed.createComponent(GoalEditDrawerComponent);
  fixture.componentRef.setInput('goal', GOAL);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement, data, c: fixture.componentInstance };
}

afterEach(() => TestBed.resetTestingModule());

describe('GoalEditDrawerComponent', () => {
  it('preenche o formulário a partir da meta', () => {
    expect(build().c.form.getRawValue()).toMatchObject({
      label: 'Reserva', target: 30000, monthly: 800, type: 'emergencia',
    });
  });

  it('mantém Salvar desabilitado enquanto nada mudou', () => {
    expect(build().el.querySelector('.save-btn').disabled).toBe(true);
  });

  it('preserva balance e history ao salvar', () => {
    const { c, data } = build();
    c.form.controls.monthly.setValue(900);
    c.form.markAsDirty();
    c.save();
    expect(data.updateGoal).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'sos', monthly: 900, balance: 1000 }),
    );
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx nx test ui-financial --testPathPattern=goal-edit-drawer`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Componente**

`goal-edit-drawer.component.ts`:

```ts
import { Component, effect, inject, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Goal } from '@caixa-familia/shared-types';
import { AppDataService } from '../../layout/app-data.service';
import { IconComponent } from '../../ui/icon/icon.component';

@Component({
  selector: 'cf-goal-edit-drawer',
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent],
  templateUrl: './goal-edit-drawer.component.html',
  styleUrl: './goal-edit-drawer.component.scss',
})
export class GoalEditDrawerComponent {
  private data = inject(AppDataService);

  readonly goal = input.required<Goal>();
  readonly closed = output<void>();

  form = new FormGroup({
    label: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    subtitle: new FormControl('', { nonNullable: true }),
    target: new FormControl(0, { nonNullable: true, validators: [Validators.min(0)] }),
    monthly: new FormControl(0, { nonNullable: true, validators: [Validators.min(0)] }),
    color: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    type: new FormControl<Goal['type']>('sonho', { nonNullable: true }),
  });

  constructor() {
    effect(() => {
      const g = this.goal();
      this.form.setValue({
        label: g.label, subtitle: g.subtitle, target: g.target,
        monthly: g.monthly, color: g.color, type: g.type,
      });
      this.form.markAsPristine();
    });
  }

  save() {
    if (this.form.invalid) return;
    // Espalha a meta original primeiro: balance e history são derivados e
    // precisam sobreviver ao merge.
    this.data.updateGoal({ ...this.goal(), ...this.form.getRawValue() });
    this.closed.emit();
  }
}
```

- [ ] **Step 4: Template**

`goal-edit-drawer.component.html`:

```html
<div class="backdrop" role="button" tabindex="0" aria-label="Fechar"
  (click)="closed.emit()" (keydown.enter)="closed.emit()" (keydown.space)="closed.emit()"></div>

<aside class="panel" [formGroup]="form">
  <header class="drawer-head">
    <span class="head-title">Editar meta</span>
    <button type="button" class="close-btn" (click)="closed.emit()" aria-label="Fechar">
      <cf-icon name="x" [size]="14" />
    </button>
  </header>

  <div class="drawer-body">
    <label class="label" for="goal-label">Nome</label>
    <input id="goal-label" class="text-input" formControlName="label" />

    <label class="label mt" for="goal-subtitle">Descrição</label>
    <input id="goal-subtitle" class="text-input" formControlName="subtitle" />

    <label class="label mt" for="goal-target">Objetivo</label>
    <input id="goal-target" class="text-input" type="number" formControlName="target" />

    <label class="label mt" for="goal-monthly">Aporte por mês</label>
    <input id="goal-monthly" class="text-input" type="number" formControlName="monthly" />

    <label class="label mt" for="goal-color">Cor</label>
    <input id="goal-color" class="text-input" formControlName="color" />

    <label class="label mt" for="goal-type">Tipo</label>
    <select id="goal-type" class="text-input" formControlName="type">
      <option value="sonho">Sonho</option>
      <option value="emergencia">Emergência</option>
    </select>
  </div>

  <footer class="drawer-foot">
    <span class="foot-hint">{{ goal().id }}</span>
    <button type="button" class="save-btn" [disabled]="form.invalid || form.pristine" (click)="save()">
      Salvar
    </button>
  </footer>
</aside>
```

- [ ] **Step 5: Estilo**

`goal-edit-drawer.component.scss`: copiar o arquivo inteiro da Task 7
(`category-edit-drawer.component.scss`) sem alteração. São dois drawers com a mesma anatomia;
extrair uma folha comum é refactor que vale a pena **depois** que os três existirem — fica
registrado na Task 17.

- [ ] **Step 6: Ligar no card de meta**

Em `goal-card.component.ts`: importar `GoalEditDrawerComponent`, pôr nos `imports`, e:

```ts
  protected editing = signal(false);
```

Em `goal-card.component.html`, trocar o botão `disabled`:

```html
        <button class="btn-ghost" (click)="editing.set(true)">Editar</button>
```

E ao final do template:

```html
@if (editing()) {
  <cf-goal-edit-drawer [goal]="goal" (closed)="editing.set(false)" />
}
```

> Conferir se `goal` no `goal-card` é `@Input()` ou `input()`; se for signal, usar `goal()`.

- [ ] **Step 7: Gate e commit**

Run: `npx nx test ui-financial && npx nx build ui-financial`

```bash
git add apps/ui-financial/src/app/features/goals/
git commit -m "feat(ui-financial): add the goal edit drawer"
```

---

### Task 12: "Aporte extra" abre o drawer existente

**Files:**
- Modify: `apps/ui-financial/src/app/features/expense-drawer/expense-drawer.component.ts`
- Modify: `apps/ui-financial/src/app/features/goals/goal-card.component.ts` / `.html`
- Modify: `apps/ui-financial/src/app/features/expense-drawer/expense-drawer.component.spec.ts`

**Interfaces:**
- Consumes: `AppDataService.addContribution` (já existe).
- Produces: `ExpenseDrawerComponent` aceita `input()` opcional `presetGoal: string | null`.

> **Nenhum endpoint novo.** A contribuição já está ligada de ponta a ponta desde a migração
> anterior (`AppDataService.addContribution`, e o chip "Aporte" do drawer). Falta só o card
> abrir o drawer já apontando para a meta.

- [ ] **Step 1: Escrever o teste que falha**

Acrescentar a `expense-drawer.component.spec.ts`:

```ts
describe('ExpenseDrawerComponent — aporte pré-selecionado', () => {
  it('abre no modo aporte com a meta escolhida', () => {
    const fixture = buildDrawer();           // helper existente no arquivo
    fixture.componentRef.setInput('presetGoal', 'sos');
    fixture.detectChanges();
    const v = fixture.componentInstance.form.getRawValue();
    expect(v.type).toBe('contribution');
    expect(v.goal).toBe('sos');
  });

  it('abre no modo gasto quando não há meta', () => {
    const fixture = buildDrawer();
    fixture.detectChanges();
    expect(fixture.componentInstance.form.getRawValue().type).toBe('expense');
  });
});
```

> Ler o topo do spec para o nome real do helper de construção e o nome do controle de meta no
> formulário (o componente já tem um ramo `type === 'contribution'` que aponta para uma meta).

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx nx test ui-financial --testPathPattern=expense-drawer`
Expected: FAIL — `presetGoal` não existe.

- [ ] **Step 3: Input no drawer**

Em `expense-drawer.component.ts`:

```ts
  /** Quando presente, o drawer abre no modo aporte já apontando para esta meta. */
  readonly presetGoal = input<string | null>(null);
```

E no construtor:

```ts
    effect(() => {
      const slug = this.presetGoal();
      if (!slug) return;
      this.form.patchValue({ type: 'contribution', goal: slug });
    });
```

> Usar o nome real do controle de meta do formulário no lugar de `goal`.

- [ ] **Step 4: Botão no card de meta**

Em `goal-card.component.ts`: importar `ExpenseDrawerComponent`, pôr nos `imports`, e:

```ts
  protected contributing = signal(false);
```

Em `goal-card.component.html`, trocar o botão `disabled`:

```html
        <button class="btn-colored" [style.background]="goal.color" (click)="contributing.set(true)">
          <cf-icon name="plus" [size]="11" /> Aporte extra
        </button>
```

E ao final do template:

```html
@if (contributing()) {
  <cf-expense-drawer [presetGoal]="goal.id" (closed)="contributing.set(false)" />
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx nx test ui-financial --testPathPattern=expense-drawer`
Expected: PASS.

- [ ] **Step 6: Gate e commit**

Run: `npx nx test ui-financial && npx nx build ui-financial`

```bash
git add apps/ui-financial/src/app/features/
git commit -m "feat(ui-financial): open the contribution drawer from the goal card"
```

---

## Fatia E — Gastos fixos

### Task 13: Camada de dados de gasto fixo

**Files:**
- Modify: `apps/ui-financial/src/app/core/api/wire.types.ts`
- Modify: `apps/ui-financial/src/app/core/api/fixed-api.service.ts`
- Modify: `apps/ui-financial/src/app/core/api/fixed-api.service.spec.ts`
- Modify: `apps/ui-financial/src/app/core/api/fixed.mapper.ts`
- Modify: `apps/ui-financial/src/app/core/api/fixed.mapper.spec.ts`
- Modify: `apps/ui-financial/src/app/layout/app-data.service.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `UpdateFixedExpenseWire`, `FixedApiService.update(id, body)` e `.remove(id)`,
  `fixedToUpdateWire(f)`, `AppDataService.updateFixed(f)` e `.removeFixed(id)`. Tasks 14 e 15
  dependem.

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar a `fixed-api.service.spec.ts`:

```ts
it('PATCHes a fixed expense', () => {
  service.update('f1', { value: 300 }).subscribe();
  const req = httpMock.expectOne(`${environment.apiBaseUrl}/fixed-expenses/f1`);
  expect(req.request.method).toBe('PATCH');
  expect(req.request.body).toEqual({ value: 300 });
  req.flush({});
});

it('DELETEs a fixed expense', () => {
  service.remove('f1').subscribe();
  const req = httpMock.expectOne(`${environment.apiBaseUrl}/fixed-expenses/f1`);
  expect(req.request.method).toBe('DELETE');
  req.flush({});
});
```

Acrescentar a `fixed.mapper.spec.ts`:

```ts
describe('fixedToUpdateWire', () => {
  const f = {
    id: 'f1', label: 'Luz', value: 200, due: 10,
    cat: 'casa', holder: 'shared' as const, paidThisMonth: false,
  };

  it('traduz due para dueDay e cat para categorySlug', () => {
    expect(fixedToUpdateWire(f)).toMatchObject({ dueDay: 10, categorySlug: 'casa' });
  });

  it('não envia paidThisMonth — é derivado', () => {
    expect(fixedToUpdateWire(f)).not.toHaveProperty('paidThisMonth');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx nx test ui-financial --testPathPattern=fixed`
Expected: FAIL — métodos inexistentes.

- [ ] **Step 3: Wire type**

Em `wire.types.ts`:

```ts
export interface UpdateFixedExpenseWire {
  label?: string;
  value?: number;
  dueDay?: number;
  categorySlug?: string;
  holder?: string;
}
```

- [ ] **Step 4: API service**

Em `fixed-api.service.ts`:

```ts
  update(id: string, body: UpdateFixedExpenseWire): Observable<FixedExpenseWire> {
    return this.http.patch<FixedExpenseWire>(`${this.base}/fixed-expenses/${id}`, body);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/fixed-expenses/${id}`);
  }
```

> Conferir a forma de `this.base` neste serviço e seguir a mesma.

- [ ] **Step 5: Mapper**

Em `fixed.mapper.ts`:

```ts
export function fixedToUpdateWire(f: FixedExpense): UpdateFixedExpenseWire {
  return {
    label: f.label,
    value: f.value,
    dueDay: f.due,
    categorySlug: f.cat,
    holder: f.holder,
  };
}
```

`paidThisMonth` fica de fora: é derivado dos lançamentos do mês, não editável.

- [ ] **Step 6: Fachada**

Em `app-data.service.ts`:

```ts
  updateFixed(f: FixedExpense): void {
    this.fixApi.update(f.id, fixedToUpdateWire(f)).subscribe({
      next: () => this.loadFixed(),
      error: () => this.fail('Falha ao salvar gasto fixo', this.fixedError),
    });
  }

  removeFixed(id: string): void {
    this.fixApi.remove(id).subscribe({
      next: () => this.loadFixed(),
      error: () => this.fail('Falha ao remover gasto fixo', this.fixedError),
    });
  }
```

- [ ] **Step 7: Gate e commit**

Run: `npx nx test ui-financial && npx nx build ui-financial`

```bash
git add apps/ui-financial/src/app/core/api/ apps/ui-financial/src/app/layout/app-data.service.ts
git commit -m "feat(ui-financial): add the fixed-expense write data layer"
```

---

### Task 14: `fixed-edit-drawer` e os botões que não existem

**Files:**
- Create: `apps/ui-financial/src/app/features/fixed/fixed-edit-drawer.component.ts` / `.html` / `.scss`
- Create: `apps/ui-financial/src/app/features/fixed/fixed-edit-drawer.component.spec.ts`
- Modify: `apps/ui-financial/src/app/features/fixed/fixed.component.ts` / `.html`
- Modify: `apps/ui-financial/src/app/features/fixed/fixed.component.spec.ts`

**Interfaces:**
- Consumes: `AppDataService.updateFixed(f)` (Task 13).
- Produces: `<cf-fixed-edit-drawer [fixed]="…" (closed)="…" />`.

> **Esta tela não tem stub.** Não há botão nenhum em Gastos fixos hoje. Os controles precisam
> ser **criados**, e a tela tem dois ramos desde o Projeto 1: tabela no desktop e card no
> celular. Além disso são **duas** tabelas — "A vencer" e "Pagos no mês". Os botões entram nas
> duas.

- [ ] **Step 1: Escrever o teste que falha**

`fixed-edit-drawer.component.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { FixedEditDrawerComponent } from './fixed-edit-drawer.component';
import { AppDataService } from '../../layout/app-data.service';
import type { FixedExpense, Category } from '@caixa-familia/shared-types';

const FIXED: FixedExpense = {
  id: 'f1', label: 'Luz', value: 200, due: 10, cat: 'casa',
  holder: 'shared', paidThisMonth: false,
};
const CATEGORIES: Category[] = [
  { id: 'casa', label: 'Casa', color: '#7A4F1D', budget: 500, order: 1 },
];

function build() {
  const data = { updateFixed: jest.fn(), categories: signal(CATEGORIES) };
  TestBed.configureTestingModule({
    imports: [FixedEditDrawerComponent],
    providers: [{ provide: AppDataService, useValue: data }],
  });
  const fixture = TestBed.createComponent(FixedEditDrawerComponent);
  fixture.componentRef.setInput('fixed', FIXED);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement, data, c: fixture.componentInstance };
}

afterEach(() => TestBed.resetTestingModule());

describe('FixedEditDrawerComponent', () => {
  it('preenche o formulário a partir do gasto fixo', () => {
    expect(build().c.form.getRawValue()).toMatchObject({
      label: 'Luz', value: 200, due: 10, cat: 'casa', holder: 'shared',
    });
  });

  it('mantém Salvar desabilitado enquanto nada mudou', () => {
    expect(build().el.querySelector('.save-btn').disabled).toBe(true);
  });

  it('salva preservando o id', () => {
    const { c, data } = build();
    c.form.controls.value.setValue(300);
    c.form.markAsDirty();
    c.save();
    expect(data.updateFixed).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'f1', value: 300 }),
    );
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx nx test ui-financial --testPathPattern=fixed-edit-drawer`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Componente**

`fixed-edit-drawer.component.ts`:

```ts
import { Component, effect, inject, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import type { FixedExpense, Holder } from '@caixa-familia/shared-types';
import { AppDataService } from '../../layout/app-data.service';
import { IconComponent } from '../../ui/icon/icon.component';

@Component({
  selector: 'cf-fixed-edit-drawer',
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent],
  templateUrl: './fixed-edit-drawer.component.html',
  styleUrl: './fixed-edit-drawer.component.scss',
})
export class FixedEditDrawerComponent {
  protected data = inject(AppDataService);

  readonly fixed = input.required<FixedExpense>();
  readonly closed = output<void>();

  form = new FormGroup({
    label: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    value: new FormControl(0, { nonNullable: true, validators: [Validators.min(0)] }),
    due: new FormControl(1, {
      nonNullable: true,
      validators: [Validators.min(1), Validators.max(31)],
    }),
    cat: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    holder: new FormControl<Holder>('shared', { nonNullable: true }),
  });

  constructor() {
    effect(() => {
      const f = this.fixed();
      this.form.setValue({
        label: f.label, value: f.value, due: f.due, cat: f.cat, holder: f.holder,
      });
      this.form.markAsPristine();
    });
  }

  save() {
    if (this.form.invalid) return;
    // paidThisMonth é derivado e sobrevive pelo espalhamento do original.
    this.data.updateFixed({ ...this.fixed(), ...this.form.getRawValue() });
    this.closed.emit();
  }
}
```

- [ ] **Step 4: Template**

`fixed-edit-drawer.component.html`:

```html
<div class="backdrop" role="button" tabindex="0" aria-label="Fechar"
  (click)="closed.emit()" (keydown.enter)="closed.emit()" (keydown.space)="closed.emit()"></div>

<aside class="panel" [formGroup]="form">
  <header class="drawer-head">
    <span class="head-title">Editar gasto fixo</span>
    <button type="button" class="close-btn" (click)="closed.emit()" aria-label="Fechar">
      <cf-icon name="x" [size]="14" />
    </button>
  </header>

  <div class="drawer-body">
    <label class="label" for="fx-label">Conta</label>
    <input id="fx-label" class="text-input" formControlName="label" />

    <label class="label mt" for="fx-value">Valor</label>
    <input id="fx-value" class="text-input" type="number" formControlName="value" />

    <label class="label mt" for="fx-due">Dia de vencimento</label>
    <input id="fx-due" class="text-input" type="number" min="1" max="31" formControlName="due" />

    <label class="label mt" for="fx-cat">Categoria</label>
    <select id="fx-cat" class="text-input" formControlName="cat">
      @for (c of data.categories(); track c.id) {
        <option [value]="c.id">{{ c.label }}</option>
      }
    </select>

    <label class="label mt" for="fx-holder">Titular</label>
    <select id="fx-holder" class="text-input" formControlName="holder">
      <option value="shared">Compartilhado</option>
      <option value="Mateus">Mateus</option>
      <option value="Thais">Thais</option>
    </select>
  </div>

  <footer class="drawer-foot">
    <span class="foot-hint"></span>
    <button type="button" class="save-btn" [disabled]="form.invalid || form.pristine" (click)="save()">
      Salvar
    </button>
  </footer>
</aside>
```

- [ ] **Step 5: Estilo**

`fixed-edit-drawer.component.scss`: copiar o arquivo da Task 7 sem alteração.

- [ ] **Step 6: Botões nas duas tabelas e nos dois cards**

Em `fixed.component.ts`: importar `FixedEditDrawerComponent` e `AuthService`, pôr nos
`imports`, e:

```ts
  protected editingFixed = signal<FixedExpense | null>(null);
```

Em `fixed.component.html`, acrescentar uma coluna de ações às **duas** tabelas (A vencer e
Pagos), e ao final de `.fxc-meta` nos **dois** ramos de card:

```html
<!-- desktop: nova <td> ao final da linha -->
<td>
  <button class="icon-btn" (click)="editingFixed.set(f)" [disabled]="!auth.canWrite()"
    aria-label="Editar gasto fixo">
    <cf-icon name="settings" [size]="11" />
  </button>
</td>
```

```html
<!-- mobile: dentro de .fxc-meta -->
<button class="fxc-tag" (click)="editingFixed.set(f)" [disabled]="!auth.canWrite()">Editar</button>
```

> Ao acrescentar `<td>`, atualizar o `colspan` da linha de estado vazio (hoje `colspan="5"`)
> para `6`.

E ao final do template:

```html
@if (editingFixed(); as f) {
  <cf-fixed-edit-drawer [fixed]="f" (closed)="editingFixed.set(null)" />
}
```

- [ ] **Step 7: Gate e commit**

Run: `npx nx test ui-financial && npx nx build ui-financial`

```bash
git add apps/ui-financial/src/app/features/fixed/
git commit -m "feat(ui-financial): add the fixed-expense edit drawer and its buttons"
```

---

### Task 15: Remover gasto fixo com confirmação

**Files:**
- Modify: `apps/ui-financial/src/app/features/fixed/fixed.component.ts` / `.html`
- Modify: `apps/ui-financial/src/app/features/fixed/fixed.component.spec.ts`

**Interfaces:**
- Consumes: `AppDataService.removeFixed(id)` (Task 13), `cf-confirm-modal`.
- Produces: nada.

- [ ] **Step 1: Escrever o teste que falha**

Acrescentar a `fixed.component.spec.ts`:

```ts
describe('FixedComponent — remover', () => {
  it('pede confirmação antes de remover', () => {
    const fixture = buildFixed();
    const c = fixture.componentInstance;
    c.askRemove('f1');
    expect(c.confirmingRemoval()).toBe('f1');
    expect(fixture.data.removeFixed).not.toHaveBeenCalled();
  });

  it('remove ao confirmar', () => {
    const fixture = buildFixed();
    const c = fixture.componentInstance;
    c.askRemove('f1');
    c.confirmRemove();
    expect(fixture.data.removeFixed).toHaveBeenCalledWith('f1');
    expect(c.confirmingRemoval()).toBeNull();
  });

  it('não remove ao cancelar', () => {
    const fixture = buildFixed();
    const c = fixture.componentInstance;
    c.askRemove('f1');
    c.cancelRemove();
    expect(fixture.data.removeFixed).not.toHaveBeenCalled();
  });
});
```

> `buildFixed()` é um helper novo no mesmo arquivo, no molde do `buildResponsive` existente,
> devolvendo o fixture com `data` anexado e `removeFixed: jest.fn()` no mock.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx nx test ui-financial --testPathPattern=fixed.component`
Expected: FAIL — `askRemove` não existe.

- [ ] **Step 3: Componente**

Em `fixed.component.ts`:

```ts
  protected confirmingRemoval = signal<string | null>(null);

  askRemove(id: string) {
    this.confirmingRemoval.set(id);
  }

  confirmRemove() {
    const id = this.confirmingRemoval();
    if (id) this.data.removeFixed(id);
    this.confirmingRemoval.set(null);
  }

  cancelRemove() {
    this.confirmingRemoval.set(null);
  }
```

Importar `ConfirmModalComponent` e pôr nos `imports`.

- [ ] **Step 4: Template**

Botão de excluir junto do de editar, nas duas tabelas e nos dois cards:

```html
<button class="icon-btn btn-neg" (click)="askRemove(f.id)" [disabled]="!auth.canWrite()"
  aria-label="Remover gasto fixo">
  <cf-icon name="x" [size]="11" />
</button>
```

E ao final do template:

```html
@if (confirmingRemoval()) {
  <cf-confirm-modal
    title="Remover gasto fixo?"
    description="Os lançamentos já registrados continuam no histórico — apenas deixam de estar vinculados a este gasto fixo."
    confirmLabel="Remover"
    [danger]="true"
    (confirmed)="confirmRemove()"
    (cancelled)="cancelRemove()"
  />
}
```

> A descrição diz a verdade sobre o que o backend faz: o `DELETE` desvincula os lançamentos em
> vez de apagá-los (spec do Projeto 2, §5.2).

- [ ] **Step 5: Rodar e ver passar**

Run: `npx nx test ui-financial --testPathPattern=fixed.component`
Expected: PASS.

- [ ] **Step 6: Gate e commit**

Run: `npx nx test ui-financial && npx nx build ui-financial`

```bash
git add apps/ui-financial/src/app/features/fixed/
git commit -m "feat(ui-financial): allow removing a fixed expense"
```

---

## Fatia F — Edição de transação

### Task 16: Modo edição no `expense-drawer`

**Files:**
- Modify: `apps/ui-financial/src/app/features/expense-drawer/expense-drawer.component.ts`
- Modify: `apps/ui-financial/src/app/features/expense-drawer/expense-drawer.component.html`
- Modify: `apps/ui-financial/src/app/features/expense-drawer/expense-drawer.component.spec.ts`
- Modify: `apps/ui-financial/src/app/features/tx-detail-drawer/tx-detail-drawer.component.ts` / `.html`

**Interfaces:**
- Consumes: `AppDataService.updateTransaction(t)` (Task 2), `presetGoal` (Task 12).
- Produces: `ExpenseDrawerComponent` aceita `input()` opcional `editing: Transaction | null`.

> A transação é a única que **não** ganha drawer próprio: os campos editáveis dela já são
> exatamente os do `expense-drawer`. Duplicar aquele formulário obrigaria a manter dois
> lugares em sincronia para sempre.

- [ ] **Step 1: Escrever o teste que falha**

Acrescentar a `expense-drawer.component.spec.ts`:

```ts
const TX_EDIT = {
  id: 't1', date: '2026-05-05', label: 'Mercado', value: 240, cat: 'casa',
  holder: 'Mateus' as const, method: 'pix', installments: null, reviewed: false,
};

describe('ExpenseDrawerComponent — modo edição', () => {
  it('preenche o formulário a partir da transação', () => {
    const fixture = buildDrawer();
    fixture.componentRef.setInput('editing', TX_EDIT);
    fixture.detectChanges();
    expect(fixture.componentInstance.form.getRawValue()).toMatchObject({
      label: 'Mercado', value: 240,
    });
  });

  it('salva com updateTransaction, não createTransaction', () => {
    const fixture = buildDrawer();
    fixture.componentRef.setInput('editing', TX_EDIT);
    fixture.detectChanges();
    fixture.componentInstance.form.markAsDirty();
    fixture.componentInstance.save();
    expect(fixture.data.updateTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ id: 't1' }),
    );
    expect(fixture.data.createTransaction).not.toHaveBeenCalled();
  });

  it('continua criando quando não há transação em edição', () => {
    const fixture = buildDrawer();
    fixture.detectChanges();
    // preencher o mínimo que o save() exige, conforme o formulário atual
    fixture.componentInstance.form.patchValue({ label: 'Nova', value: 10 });
    fixture.componentInstance.save();
    expect(fixture.data.createTransaction).toHaveBeenCalled();
    expect(fixture.data.updateTransaction).not.toHaveBeenCalled();
  });

  it('trava o chip de tipo na edição', () => {
    const fixture = buildDrawer();
    fixture.componentRef.setInput('editing', TX_EDIT);
    fixture.detectChanges();
    expect(fixture.componentInstance.form.controls.type.disabled).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx nx test ui-financial --testPathPattern=expense-drawer`
Expected: FAIL — `editing` não existe.

- [ ] **Step 3: Input e preenchimento**

Em `expense-drawer.component.ts`:

```ts
  /** Vazio = criar (comportamento atual). Preenchido = editar. */
  readonly editing = input<Transaction | null>(null);

  protected isEditing = computed(() => this.editing() !== null);
```

E no construtor:

```ts
    effect(() => {
      const tx = this.editing();
      if (!tx) return;
      this.form.patchValue({
        type: 'expense',
        label: tx.label,
        value: tx.value,
        category: tx.cat,
        method: tx.method,
        holder: tx.holder,
        date: tx.date,
        note: tx.note ?? '',
      });
      // Mudar o tipo de um lançamento existente é outra operação; o PATCH
      // também não aceita alterar parcelamento.
      this.form.controls.type.disable();
      this.form.markAsPristine();
    });
```

> Usar os nomes reais dos controles do formulário — ler a definição do `FormGroup` no
> componente antes de escrever este `patchValue`.

- [ ] **Step 4: Ramo de salvar**

No início de `save()`, antes do fluxo de criação atual:

```ts
    const tx = this.editing();
    if (tx) {
      if (this.form.pristine) return;
      const v = this.form.getRawValue();
      this.data.updateTransaction({
        ...tx,
        label: v.label,
        value: v.value,
        cat: v.category,
        method: v.method,
        holder: v.holder,
        date: v.date,
        note: v.note || undefined,
      });
      this.closed.emit();
      return;
    }
```

- [ ] **Step 5: Título e parcelamento no template**

Em `expense-drawer.component.html`, o título do cabeçalho:

```html
<span class="head-title">{{ isEditing() ? 'Editar lançamento' : 'Novo gasto' }}</span>
```

E o bloco de parcelamento ganha uma guarda — na edição ele vira somente-leitura:

```html
@if (!isEditing()) {
  <!-- bloco de parcelamento atual, inalterado -->
}
```

- [ ] **Step 6: Botão Editar no drawer de detalhe**

Em `tx-detail-drawer.component.ts`: importar `ExpenseDrawerComponent`, pôr nos `imports`, e:

```ts
  protected editing = signal(false);
```

Em `tx-detail-drawer.component.html`, trocar o botão `disabled`:

```html
      <button type="button" class="btn ghost" [disabled]="!auth.canWrite()"
        (click)="editing.set(true)">Editar</button>
```

E ao final:

```html
@if (editing()) {
  <cf-expense-drawer [editing]="tx()" (closed)="editing.set(false)" />
}
```

- [ ] **Step 7: Gate e commit**

Run: `npx nx test ui-financial && npx nx build ui-financial`

```bash
git add apps/ui-financial/src/app/features/
git commit -m "feat(ui-financial): let the expense drawer edit an existing transaction"
```

---

## Fatia G — Fechamento

### Task 17: Verificação visual e registro

**Files:**
- Modify: `docs/superpowers/specs/2026-07-11-api-front-migration-umbrella.md`

- [ ] **Step 1: Gate completo**

```bash
npx nx test ui-financial
npx nx lint ui-financial
npx nx build ui-financial
```

Expected: os três verdes.

- [ ] **Step 2: Subir o stack**

```bash
docker-compose up -d
npx nx serve api-financial
npx nx serve ui-financial
```

- [ ] **Step 3: Percorrer os oito fluxos no Chrome**

Com a skill `claude-in-chrome`, em **375px e 1280px**:

1. Transações → tocar num lançamento → **Marcar como conferido** → o indicador aparece na lista.
2. Transações → chip **"Só não conferidos"** → a lista encolhe.
3. Transações → detalhe → **Editar** → alterar o valor → salvar → a lista reflete.
4. Configurações → **Editar** categoria → alterar orçamento → salvar.
5. Configurações → **setas** de reordenar → a ordem muda e persiste ao recarregar.
6. Configurações → **excluir** categoria em uso → toast com a contagem real.
7. Metas → **Editar** meta → alterar aporte mensal → salvar.
8. Metas → **Aporte extra** → o drawer abre em modo aporte com a meta certa.
9. Gastos fixos → **Editar** e **Remover**, nas duas tabelas e nos dois cards.

Conferir em 375px que nenhum drawer novo estoura a largura: `scrollWidth == clientWidth`.

- [ ] **Step 4: Registrar no umbrella**

Em `2026-07-11-api-front-migration-umbrella.md`, §4: marcar os oito itens como ligados,
apontando para `docs/superpowers/specs/2026-08-06-ui-write-actions-design.md`, e deixar
explícito o que resta: módulo de membros, integração de pagamento, e os botões
`Importar`/`Exportar` pendentes de decisão de produto.

Registrar também as duas dívidas desta fatia:

- `app-data.service.ts` passou de 400 linhas. Continua coeso, mas vale quebrar por recurso
  numa fatia própria.
- Os três drawers de edição (`category`, `goal`, `fixed`) compartilham a mesma folha de estilo
  copiada. Agora que os três existem, extrair um `.scss` comum é refactor barato e justificado.

- [ ] **Step 5: Commit**

```bash
git add docs/
git commit -m "docs: record the UI write actions in the migration umbrella"
```

---

## Ordem e dependências

```
Task 1 (reviewed + order) ─┬─> Task 2 ─> Tasks 3, 4, 5      (conferido)
                           ├─> Task 6 ─> Tasks 7, 8, 9      (categorias)
                           ├─> Task 10 ─> Task 11           (metas)
                           └─> Task 13 ─> Tasks 14, 15      (gastos fixos)

Task 12 (aporte) é independente das demais.
Task 16 (edição de transação) depende da Task 2.
Task 17 fecha.
```

A Task 1 é bloqueante para tudo. As quatro fatias de recurso (B, C, D, E) são independentes
entre si e podem ser feitas em qualquer ordem.
