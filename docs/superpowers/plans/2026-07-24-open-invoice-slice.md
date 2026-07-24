# Fatia 8 — Fatura aberta pelo ciclo real Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer a fatura aberta vir de `GET /cards/:id/invoice`, que usa o ciclo de faturamento real, em vez de ser derivada do mês-calendário no client.

**Architecture:** O endpoint já existe e já calcula o ciclo com `billingCycleFor(card.closingDay)`. Falta a view expor dois campos que a tela usa (`holder`, `installments`) e a UI consumir. Na UI o serviço de fatura já existe (histórico); ganha um método. O template **não muda** — o tipo novo usa os mesmos nomes de campo.

**Tech Stack:** Nx 22 · NestJS 11 + Prisma · Angular 21 standalone + signals · Jest 30.

**Spec:** `docs/superpowers/specs/2026-07-24-open-invoice-slice-design.md`

## Global Constraints

- **Contrato `holder`.** Recursos com dimensão de membro emitem `holder` (nome), nunca `memberId`. `member?.name ?? 'shared'`.
- **Formato de parcelas.** `{ n, of } | null`, idêntico ao `transaction.mapper` — `n` é `installment.number`, `of` é `installment.plan.totalCount`.
- **Camada de dados na UI.** Serviço tipado pelo wire + mapper com teste; `AppDataService` é a fachada.
- **Erro/loading.** `fail(message, errorSignal)`; `openInvoiceLoading`/`openInvoiceError`. **Sem fallback** para a derivação antiga (D5).
- **Load sob demanda.** Disparado pelo `InvoiceComponent`, que conhece o `cardId` da rota. **Não** reage a `currentMonth()` (D4).
- **Fora de escopo:** fechar fatura; sparkline dos cartões; qualquer outra tela.
- **Comandos:** `npx nx test <projeto>`, `npx nx build <projeto>`. Jest 30 usa `--testPathPatterns`.
- **Branch:** direto em `master`.
- **Shell:** Git Bash. Commit multi-linha por heredoc (`git commit -F - <<'EOF'`).

## File Structure

**Backend (`apps/api-financial/src/modules/catalog/card/`)**
- `domain/card.repository.ts` — `InvoiceItem` ganha dois campos.
- `infrastructure/card.prisma.repository.ts` — includes e map.
- `infrastructure/card.prisma.repository.spec.ts` (novo) — cobre `openInvoice`.

**UI (`apps/ui-financial/src/app/`)**
- `core/api/wire.types.ts` — `OpenInvoiceWire`, `OpenInvoiceItemWire`.
- `core/api/invoice-api.service.ts` — ganha `getOpen`.
- `core/api/invoice.mapper.ts` — ganha `OpenInvoiceItem` e `wireToOpenInvoiceItem`.
- `layout/app-data.service.ts` — `loadOpenInvoice(cardId)` + signals.
- `features/invoice/invoice.component.ts` — `items()`/`total()` leem o signal.

O template do invoice **não muda**.

---

### Task 1: Backend — `holder` e `installments` na fatura aberta

**Files:**
- Modify: `apps/api-financial/src/modules/catalog/card/domain/card.repository.ts:3-9`
- Modify: `apps/api-financial/src/modules/catalog/card/infrastructure/card.prisma.repository.ts:33-53`
- Test: `apps/api-financial/src/modules/catalog/card/infrastructure/card.prisma.repository.spec.ts` (novo)

**Interfaces:**
- Consumes: nada.
- Produces: wire `{ total: number; items: { id, date, label, value, categorySlug, holder: string, installments: { n: number; of: number } | null }[] }`. As Tasks 2–4 dependem destes nomes.

- [ ] **Step 1: Escrever o teste que falha**

Criar `apps/api-financial/src/modules/catalog/card/infrastructure/card.prisma.repository.spec.ts`:

```typescript
import { CardPrismaRepository } from './card.prisma.repository';

type FindManyArgs = { where: Record<string, unknown>; include?: Record<string, unknown> };

const card = { id: 'nu-t', householdId: 'h1', closingDay: 5 };

function setup(rows: unknown[]) {
  const prisma = {
    card: { findFirst: jest.fn(async (_a: unknown) => card) },
    transaction: {
      findMany: jest.fn(async (_a: FindManyArgs) => rows),
      aggregate: jest.fn(async (_a: unknown) => ({ _sum: { value: 0 } })),
    },
  };
  const repo = new CardPrismaRepository(prisma as never, { householdId: 'h1' } as never);
  return { repo, prisma };
}

const row = (over: Record<string, unknown> = {}) => ({
  id: 't1',
  date: new Date('2026-07-10T12:00:00Z'),
  label: 'Mercado',
  value: 100,
  category: { slug: 'mercado' },
  member: { name: 'Thais' },
  installment: null,
  ...over,
});

describe('CardPrismaRepository.openInvoice', () => {
  it('emits the member name as holder', async () => {
    const { repo } = setup([row()]);
    const inv = await repo.openInvoice('nu-t');
    expect(inv.items[0].holder).toBe('Thais');
  });

  it('falls back to "shared" when the purchase has no member', async () => {
    const { repo } = setup([row({ member: null })]);
    expect((await repo.openInvoice('nu-t')).items[0].holder).toBe('shared');
  });

  it('maps installments to the n-of shape', async () => {
    const { repo } = setup([row({ installment: { number: 2, plan: { totalCount: 6 } } })]);
    expect((await repo.openInvoice('nu-t')).items[0].installments).toEqual({ n: 2, of: 6 });
  });

  it('emits null installments for a one-off purchase', async () => {
    const { repo } = setup([row()]);
    expect((await repo.openInvoice('nu-t')).items[0].installments).toBeNull();
  });

  it('includes the relations the new fields need', async () => {
    const { repo, prisma } = setup([row()]);
    await repo.openInvoice('nu-t');
    const include = prisma.transaction.findMany.mock.calls[0][0].include;
    expect(include).toMatchObject({ category: true, member: true });
    expect(include?.['installment']).toBeTruthy();
  });

  it('totals the cycle items', async () => {
    const { repo } = setup([row(), row({ id: 't2', value: 50 })]);
    expect((await repo.openInvoice('nu-t')).total).toBe(150);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx nx test api-financial --testPathPatterns=card.prisma.repository`
Expected: FAIL — `holder` e `installments` não existem em `InvoiceItem`.

- [ ] **Step 3: Estender o tipo do domínio**

Em `domain/card.repository.ts`:

```typescript
export interface InvoiceItem {
  id: string;
  date: string;
  label: string;
  value: number;
  categorySlug: string;
  holder: string;
  installments: { n: number; of: number } | null;
}
```

- [ ] **Step 4: Incluir as relações e emitir os campos**

Em `infrastructure/card.prisma.repository.ts`, o `openInvoice` passa a ser:

```typescript
  async openInvoice(cardId: string): Promise<OpenInvoice> {
    const card = await this.prisma.card.findFirst({ where: this.scoped({ id: cardId }) });
    if (!card) throw new NotFoundException(`Cartão ${cardId} não encontrado`);
    const { start, end } = billingCycleFor(card.closingDay);
    const items = await this.prisma.transaction.findMany({
      where: { householdId: this.householdId, cardId, date: { gt: start, lte: end } },
      include: { category: true, member: true, installment: { include: { plan: true } } },
      orderBy: { date: 'desc' },
    });
    const total = items.reduce((s, t) => s + Number(t.value), 0);
    return {
      total,
      items: items.map((t) => ({
        id: t.id,
        date: t.date.toISOString().slice(0, 10),
        label: t.label,
        value: Number(t.value),
        categorySlug: t.category.slug,
        holder: t.member?.name ?? 'shared',
        installments: t.installment
          ? { n: t.installment.number, of: t.installment.plan.totalCount }
          : null,
      })),
    };
  }
```

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `npx nx test api-financial --testPathPatterns=card.prisma.repository`
Expected: PASS — 6 testes.

- [ ] **Step 6: Suíte inteira do backend**

Run: `npx nx test api-financial`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api-financial/src/modules/catalog/card
git commit -F - <<'EOF'
feat(api-financial): expose holder and installments on the open invoice

The invoice screen shows an avatar per purchase and a panel of upcoming
instalments, but the open-invoice view carried neither, so the UI could
not consume it.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 2: UI — `getOpen` no `InvoiceApiService` + mapper

**Files:**
- Modify: `apps/ui-financial/src/app/core/api/wire.types.ts`
- Modify: `apps/ui-financial/src/app/core/api/invoice-api.service.ts`
- Modify: `apps/ui-financial/src/app/core/api/invoice.mapper.ts`
- Test: `apps/ui-financial/src/app/core/api/invoice-api.service.spec.ts` (estender)
- Test: `apps/ui-financial/src/app/core/api/invoice.mapper.spec.ts` (estender)

**Interfaces:**
- Consumes: o wire da Task 1.
- Produces: `InvoiceApiService.getOpen(cardId: string): Observable<OpenInvoiceWire>`; `OpenInvoiceItem { id, date, label, value, cat, holder, installments }`; `wireToOpenInvoiceItem(w): OpenInvoiceItem`. Tasks 3 e 4 consomem.

Nota (D3): o tipo é próprio, **não** `Transaction` — o item de fatura não tem `method`, `recurring`, `cardId` nem `note`. Os nomes de campo são os que o template já usa.

- [ ] **Step 1: Escrever os testes que falham**

Em `invoice-api.service.spec.ts`, acrescentar ao describe existente:

```typescript
  it('GETs the open invoice for a card', () => {
    service.getOpen('nu-t').subscribe();
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/cards/nu-t/invoice`);
    expect(req.request.method).toBe('GET');
    req.flush({ total: 0, items: [] });
  });
```

Em `invoice.mapper.spec.ts`, acrescentar (ajustando o import do topo para incluir `wireToOpenInvoiceItem`):

```typescript
describe('wireToOpenInvoiceItem', () => {
  const item = {
    id: 't1',
    date: '2026-07-10',
    label: 'Mercado',
    value: 100,
    categorySlug: 'mercado',
    holder: 'Thais',
    installments: { n: 2, of: 6 },
  };

  it('renames categorySlug to cat and keeps the rest', () => {
    expect(wireToOpenInvoiceItem(item)).toEqual({
      id: 't1',
      date: '2026-07-10',
      label: 'Mercado',
      value: 100,
      cat: 'mercado',
      holder: 'Thais',
      installments: { n: 2, of: 6 },
    });
  });

  it('carries a null instalment through', () => {
    expect(wireToOpenInvoiceItem({ ...item, installments: null }).installments).toBeNull();
  });

  it('keeps the shared holder as-is', () => {
    expect(wireToOpenInvoiceItem({ ...item, holder: 'shared' }).holder).toBe('shared');
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx nx test ui-financial --testPathPatterns="invoice-api.service|invoice.mapper"`
Expected: FAIL — `getOpen` e `wireToOpenInvoiceItem` não existem.

- [ ] **Step 3: Adicionar os wire types**

Acrescentar a `wire.types.ts`, junto de `InvoiceHistoryWire`:

```typescript
export interface OpenInvoiceItemWire {
  id: string;
  date: string;
  label: string;
  value: number;
  categorySlug: string;
  holder: string;
  installments: { n: number; of: number } | null;
}

export interface OpenInvoiceWire {
  total: number;
  items: OpenInvoiceItemWire[];
}
```

- [ ] **Step 4: Estender o serviço**

Em `invoice-api.service.ts`, ajustar o import de tipos e acrescentar:

```typescript
  getOpen(cardId: string): Observable<OpenInvoiceWire> {
    return this.http.get<OpenInvoiceWire>(`${this.base}/cards/${cardId}/invoice`);
  }
```

- [ ] **Step 5: Estender o mapper**

Em `invoice.mapper.ts`, ajustar o import de tipos e acrescentar:

```typescript
/** Compra da fatura aberta. Não é uma transação completa: sem method/recurring/cardId. */
export interface OpenInvoiceItem {
  id: string;
  date: string;
  label: string;
  value: number;
  cat: string;
  holder: string;
  installments: { n: number; of: number } | null;
}

export function wireToOpenInvoiceItem(w: OpenInvoiceItemWire): OpenInvoiceItem {
  return {
    id: w.id,
    date: w.date,
    label: w.label,
    value: w.value,
    cat: w.categorySlug,
    holder: w.holder,
    installments: w.installments,
  };
}
```

- [ ] **Step 6: Rodar e confirmar que passa**

Run: `npx nx test ui-financial --testPathPatterns="invoice-api.service|invoice.mapper"`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/ui-financial/src/app/core/api
git commit -F - <<'EOF'
feat(ui-financial): add the open-invoice endpoint to the API layer

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 3: UI — `AppDataService.loadOpenInvoice(cardId)`

**Files:**
- Modify: `apps/ui-financial/src/app/layout/app-data.service.ts`
- Test: `apps/ui-financial/src/app/layout/app-data.service.spec.ts`

**Interfaces:**
- Consumes: `InvoiceApiService.getOpen` (Task 2), `wireToOpenInvoiceItem` (Task 2).
- Produces: `openInvoice: Signal<{ total: number; items: OpenInvoiceItem[] }>`, `loadOpenInvoice(cardId: string): void`, `openInvoiceLoading`, `openInvoiceError`. A Task 4 consome.

- [ ] **Step 1: Escrever os testes que falham**

Em `app-data.service.spec.ts`, acrescentar `getOpen` ao stub `invApi` do `setup()`:

```typescript
    getOpen: jest.fn(() =>
      of({
        total: 150,
        items: [
          {
            id: 't1',
            date: '2026-07-10',
            label: 'Mercado',
            value: 150,
            categorySlug: 'mercado',
            holder: 'Thais',
            installments: null,
          },
        ],
      }),
    ),
```

E ao final do arquivo:

```typescript
describe('AppDataService.loadOpenInvoice', () => {
  it('requests the open invoice for the given card', () => {
    const { svc, invApi } = setup();
    svc.loadOpenInvoice('nu-t');
    expect(invApi.getOpen).toHaveBeenCalledWith('nu-t');
    expect(svc.openInvoice().total).toBe(150);
    expect(svc.openInvoice().items[0]).toEqual({
      id: 't1',
      date: '2026-07-10',
      label: 'Mercado',
      value: 150,
      cat: 'mercado',
      holder: 'Thais',
      installments: null,
    });
    expect(svc.openInvoiceLoading()).toBe(false);
  });

  it('starts with an empty invoice', () => {
    const { svc } = setup();
    expect(svc.openInvoice()).toEqual({ total: 0, items: [] });
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx nx test ui-financial --testPathPatterns=app-data.service`
Expected: FAIL — `svc.loadOpenInvoice is not a function`.

- [ ] **Step 3: Implementar**

Em `app-data.service.ts`, ajustar o import do invoice mapper para trazer também
`wireToOpenInvoiceItem` e `type OpenInvoiceItem`, e acrescentar os signals junto dos de
`invoiceHistory`:

```typescript
  readonly openInvoice = signal<{ total: number; items: OpenInvoiceItem[] }>({ total: 0, items: [] });
  readonly openInvoiceLoading = signal(false);
  readonly openInvoiceError = signal<string | null>(null);
```

E o método, junto de `loadInvoiceHistory`:

```typescript
  /**
   * Fatura aberta de um cartão, pelo ciclo de faturamento real. Não deriva de
   * `transactions()`: um ciclo atravessa dois meses-calendário e a UI só carrega
   * um mês por vez.
   */
  loadOpenInvoice(cardId: string): void {
    this.openInvoiceLoading.set(true);
    this.openInvoiceError.set(null);
    this.invApi.getOpen(cardId).subscribe({
      next: (wire) => {
        this.openInvoice.set({
          total: wire.total,
          items: wire.items.map(wireToOpenInvoiceItem),
        });
        this.openInvoiceLoading.set(false);
      },
      error: () => {
        this.fail('Falha ao carregar a fatura', this.openInvoiceError);
        this.openInvoiceLoading.set(false);
      },
    });
  }
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx nx test ui-financial --testPathPatterns=app-data.service`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/ui-financial/src/app/layout
git commit -F - <<'EOF'
feat(ui-financial): load the open invoice from the API

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 4: UI — a tela consome a fatura real

**Files:**
- Modify: `apps/ui-financial/src/app/features/invoice/invoice.component.ts:54-61` e o `constructor`
- Test: `apps/ui-financial/src/app/features/invoice/invoice.component.spec.ts` (estender)

**Interfaces:**
- Consumes: `AppDataService.openInvoice` e `loadOpenInvoice` (Task 3).
- Produces: nada. Fecha a fatia.

Contexto: `items()` filtra `transactions()` por `t.method === cardId` dentro do mês-calendário; `total()` soma isso. Ambos passam a ler o signal. `breakdown()`, `donutSegments()` e `futureInstallments()` já derivam de `items()` e continuam iguais — passam a operar sobre a base correta.

- [ ] **Step 1: Escrever os testes que falham**

Em `invoice.component.spec.ts`, acrescentar `openInvoice` e `loadOpenInvoice` ao `mockDataService`:

```typescript
    openInvoice: signal({
      total: 450,
      items: [
        { id: 'a1', date: '2026-07-10', label: 'Mercado', value: 300, cat: 'mercado', holder: 'Thais', installments: null },
        { id: 'a2', date: '2026-06-28', label: 'Curso', value: 150, cat: 'educ', holder: 'Mateus', installments: { n: 2, of: 6 } },
      ],
    }),
    openInvoiceLoading: signal(false),
    loadOpenInvoice: jest.fn(),
```

E um describe novo:

```typescript
describe('InvoiceComponent — open invoice', () => {
  it('asks for the open invoice of the routed card', () => {
    const { data } = build(CLOSED);
    expect(data.loadOpenInvoice).toHaveBeenCalledWith('nu-t');
  });

  it('lists the items the API returned, not the month transactions', () => {
    const { component } = build(CLOSED);
    expect(component.items().map((i) => i.id)).toEqual(['a1', 'a2']);
  });

  it('takes the total from the API', () => {
    const { component } = build(CLOSED);
    expect(component.total()).toBe(450);
  });

  it('breaks down the API items by category', () => {
    const { component } = build(CLOSED);
    expect(component.breakdown().map((b) => b.catId)).toEqual(['mercado', 'educ']);
  });

  it('projects upcoming instalments from the API items', () => {
    const { component } = build(CLOSED);
    // a2 está em 2/6 → faltam 4 parcelas
    expect(component.futureInstallments()).toHaveLength(4);
  });
});
```

Nota: a fixture `TRANSACTIONS` do arquivo continua no mock, de propósito — os testes acima provam que a tela **deixou** de usá-la.

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx nx test ui-financial --testPathPatterns=invoice.component`
Expected: FAIL — `items()` devolve a transação do mock de `transactions()` (`t1`), não `a1`/`a2`.

- [ ] **Step 3: Ler do signal**

Em `invoice.component.ts`, substituir `items` e `total`:

```typescript
  // Compras da fatura aberta, pelo ciclo de faturamento real (vem da API).
  items = computed((): OpenInvoiceItem[] =>
    [...this.data.openInvoice().items].sort((a, b) => b.date.localeCompare(a.date))
  );

  total = computed(() => this.data.openInvoice().total);
```

Ajustar o import de tipos: entra `OpenInvoiceItem` de `../../core/api/invoice.mapper`; `Transaction` sai se não for mais usado no arquivo — conferir antes de remover.

E o `constructor` passa a disparar os dois loads:

```typescript
  constructor() {
    this.data.loadOpenInvoice(this.cardId);
    this.data.loadInvoiceHistory(this.cardId);
  }
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx nx test ui-financial --testPathPatterns=invoice.component`
Expected: PASS — os testes do histórico e os novos.

- [ ] **Step 5: Build para type-check de template**

Run: `npx nx build ui-financial`
Expected: build verde. O template não muda, mas o tipo de `items()` sim — é aqui que uma incompatibilidade apareceria.

- [ ] **Step 6: Confirmar que a tela não deriva mais de transactions**

Run: `grep -n "transactions()" apps/ui-financial/src/app/features/invoice/invoice.component.ts`
Expected: **vazio**.

- [ ] **Step 7: Commit**

```bash
git add apps/ui-financial/src/app/features/invoice
git commit -F - <<'EOF'
fix(ui-financial): show the open invoice for the real billing cycle

The screen derived the invoice from the current calendar month, so for
any card that does not close on the 1st the total was wrong at the cycle
boundaries: a purchase made after the closing day belongs to the next
invoice but was counted in the current one. The client could not fix this
on its own — it only ever loads one calendar month, and a cycle spans
two — so the figures now come from GET /cards/:id/invoice.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 5: Gate da fatia

- [ ] **Step 1: Suítes**

Run: `npx nx test api-financial && npx nx test ui-financial`
Expected: PASS nos dois.

- [ ] **Step 2: Builds**

Run: `npx nx build api-financial && npx nx build ui-financial`
Expected: verde nos dois.

- [ ] **Step 3: Lint**

Run: `npx nx lint ui-financial`
Expected: "All files pass linting".

- [ ] **Step 4: Smoke manual**

Com o stack rodando e logado:
1. Abrir a fatura de um cartão cujo fechamento **não** é dia 1 (o seed tem vários: fechamento 5, 8, 14, 18, 20, 28).
2. Conferir que os lançamentos listados são os do **ciclo** (do dia seguinte ao fechamento até o fechamento seguinte), não os do mês-calendário.
3. **A contagem pode diferir do que a tela mostrava antes — é o defeito sendo corrigido.** Conferir contra o ciclo do cartão, não contra o número antigo.
4. O avatar do titular aparece em cada compra e o painel de parcelas a vencer continua populado.
5. Derrubar a API e abrir a fatura: aparece o toast de falha, e a tela **não** volta a inventar números do mês-calendário.

- [ ] **Step 5: Gate de review**

Rodar `/code-review` sobre o diff da fatia.

---

## Self-Review

**Cobertura da spec:**
- §3 Backend (`InvoiceItem` + includes + testes) → Task 1.
- §4 UI: wire types + serviço + mapper → Task 2; `AppDataService` → Task 3; `features/invoice` → Task 4.
- §5 Testes e gate → distribuídos e consolidados na Task 5.
- D5 (sem fallback) é verificado no Step 4.5 do smoke.

**Type consistency:** `OpenInvoiceItem` é declarado no mapper (Task 2) e importado por Tasks 3 e 4 pelo mesmo caminho; `installments: { n, of } | null` tem a mesma forma no domínio do backend (Task 1), no wire (Task 2) e no tipo da UI; `loadOpenInvoice(cardId: string)` tem a mesma assinatura nas Tasks 3 e 4.

**Ponto de atenção conhecido:** `futureInstallments()` usa `this.data.currentMonth()` para projetar os meses futuros, e a fatura aberta **não** segue o mês navegado (D4). Se o usuário navegar para outro mês na topbar, os rótulos das parcelas futuras deslizam enquanto a fatura fica parada. É uma inconsistência preexistente que esta fatia não introduz nem resolve — registrar para depois.
