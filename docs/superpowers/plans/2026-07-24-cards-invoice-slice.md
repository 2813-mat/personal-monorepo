# Fatia 5 — Cards + Invoice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o histórico **fabricado** do painel "Histórico desta fatura" por faturas fechadas reais, vindas de `GET /cards/:id/invoices`.

**Architecture:** O backend não muda. Na UI entra o par `invoice-api.service.ts` + `invoice.mapper.ts`, o `AppDataService` ganha `loadInvoiceHistory(cardId)` sob demanda (a rota é por cartão), e o `InvoiceComponent` troca o `history()` gerado por seed pela série real, mantendo a fatura aberta como última barra destacada.

**Tech Stack:** Nx 22 · Angular 21 standalone + signals · Jest 30.

**Spec:** `docs/superpowers/specs/2026-07-11-cards-invoice-slice-design.md`
**Umbrella:** `docs/superpowers/specs/2026-07-11-api-front-migration-umbrella.md`

## Global Constraints

- **Camada de dados na UI.** `app/core/api/<recurso>-api.service.ts` (tipado pelo wire, testado com `HttpTestingController`) + `app/core/api/<recurso>.mapper.ts` (wire ↔ domínio, com unit test). `AppDataService` é a fachada de signals.
- **Erro/loading.** `AppDataService.fail(message, errorSignal)` seta o signal e dispara toast `neg`; o recurso tem `invoiceHistoryLoading` / `invoiceHistoryError`.
- **Load sob demanda.** O histórico é **por cartão** e não entra nos effects do `AppShell`: quem dispara é o `InvoiceComponent`, que conhece o `cardId` da rota.
- **Fora de escopo:** fechar fatura (`POST .../invoices/close`, admin); alimentar a sparkline da tabela de cartões (D5); mudar a fatura aberta client-derived (D1).
- **Comandos:** `npx nx test <projeto>`, `npx nx build <projeto>`. Jest 30 usa `--testPathPatterns`.
- **Branch:** direto em `master`.
- **Shell:** Git Bash. Commit multi-linha por heredoc (`git commit -F - <<'EOF'`).

## File Structure

**UI (`apps/ui-financial/src/app/`)**
- `core/api/wire.types.ts` — `InvoiceHistoryWire`.
- `core/api/invoice-api.service.ts` (novo) — só HTTP.
- `core/api/invoice.mapper.ts` (novo) — só tradução.
- `layout/app-data.service.ts` — `loadInvoiceHistory(cardId)` + signals.
- `features/invoice/invoice.component.{ts,html}` — consome a série real.
- `features/cards/cards.component.ts` — só o comentário de D5.

Backend não muda.

---

### Task 1: UI — wire type + `InvoiceApiService`

**Files:**
- Modify: `apps/ui-financial/src/app/core/api/wire.types.ts`
- Create: `apps/ui-financial/src/app/core/api/invoice-api.service.ts`
- Test: `apps/ui-financial/src/app/core/api/invoice-api.service.spec.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `InvoiceApiService.listByCard(cardId: string): Observable<InvoiceHistoryWire[]>`. A Task 3 injeta isso.

- [ ] **Step 1: Escrever o teste que falha**

Criar `apps/ui-financial/src/app/core/api/invoice-api.service.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { InvoiceApiService } from './invoice-api.service';
import { environment } from '../../../environments/environment';

describe('InvoiceApiService', () => {
  let service: InvoiceApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [InvoiceApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(InvoiceApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('GETs the invoice history for a card', () => {
    service.listByCard('nu-t').subscribe();
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/cards/nu-t/invoices`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx nx test ui-financial --testPathPatterns=invoice-api.service`
Expected: FAIL — `Cannot find module './invoice-api.service'`.

- [ ] **Step 3: Adicionar o wire type**

Acrescentar a `wire.types.ts`:

```typescript
export interface InvoiceHistoryWire {
  id: string;
  cardId: string;
  year: number;
  month: number;
  closingDate: string;
  dueDate: string;
  total: number;
  perCategory: Record<string, number>;
  status: 'CLOSED' | 'PAID';
}
```

- [ ] **Step 4: Escrever o serviço**

Criar `apps/ui-financial/src/app/core/api/invoice-api.service.ts`:

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { InvoiceHistoryWire } from './wire.types';

@Injectable({ providedIn: 'root' })
export class InvoiceApiService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  listByCard(cardId: string): Observable<InvoiceHistoryWire[]> {
    return this.http.get<InvoiceHistoryWire[]>(`${this.base}/cards/${cardId}/invoices`);
  }
}
```

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `npx nx test ui-financial --testPathPatterns=invoice-api.service`
Expected: PASS — 1 teste.

- [ ] **Step 6: Commit**

```bash
git add apps/ui-financial/src/app/core/api/wire.types.ts apps/ui-financial/src/app/core/api/invoice-api.service.ts apps/ui-financial/src/app/core/api/invoice-api.service.spec.ts
git commit -F - <<'EOF'
feat(ui-financial): add InvoiceApiService

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 2: UI — `invoice.mapper`

**Files:**
- Create: `apps/ui-financial/src/app/core/api/invoice.mapper.ts`
- Test: `apps/ui-financial/src/app/core/api/invoice.mapper.spec.ts`

**Interfaces:**
- Consumes: `InvoiceHistoryWire` (Task 1).
- Produces: o tipo `InvoiceHistoryEntry { year: number; month: number; total: number; perCategory: Record<string, number> }` e `wireToInvoiceHistory(w: InvoiceHistoryWire): InvoiceHistoryEntry`. As Tasks 3 e 4 usam ambos.

Nota: o tipo mora no mapper, não em `shared-types` — é forma de leitura da UI, não conceito de domínio compartilhado com o backend. `closingDate`/`dueDate`/`status`/`id` são descartados: o painel não os usa.

- [ ] **Step 1: Escrever o teste que falha**

Criar `apps/ui-financial/src/app/core/api/invoice.mapper.spec.ts`:

```typescript
import { wireToInvoiceHistory } from './invoice.mapper';
import type { InvoiceHistoryWire } from './wire.types';

const wire: InvoiceHistoryWire = {
  id: 'inv-1',
  cardId: 'nu-t',
  year: 2026,
  month: 3,
  closingDate: '2026-03-05',
  dueDate: '2026-03-12',
  total: 1895.5,
  perCategory: { mercado: 900, lazer: 995.5 },
  status: 'CLOSED',
};

describe('wireToInvoiceHistory', () => {
  it('keeps the month coordinates, total and category breakdown', () => {
    expect(wireToInvoiceHistory(wire)).toEqual({
      year: 2026,
      month: 3,
      total: 1895.5,
      perCategory: { mercado: 900, lazer: 995.5 },
    });
  });

  it('drops the fields the invoice panel does not use', () => {
    const entry = wireToInvoiceHistory(wire);
    expect(entry).not.toHaveProperty('id');
    expect(entry).not.toHaveProperty('status');
    expect(entry).not.toHaveProperty('closingDate');
  });

  it('defaults a missing breakdown to an empty object', () => {
    const entry = wireToInvoiceHistory({ ...wire, perCategory: undefined as never });
    expect(entry.perCategory).toEqual({});
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx nx test ui-financial --testPathPatterns=invoice.mapper`
Expected: FAIL — `Cannot find module './invoice.mapper'`.

- [ ] **Step 3: Escrever o mapper**

Criar `apps/ui-financial/src/app/core/api/invoice.mapper.ts`:

```typescript
import type { InvoiceHistoryWire } from './wire.types';

/** Fatura fechada, na forma que o painel de histórico consome. */
export interface InvoiceHistoryEntry {
  year: number;
  month: number;
  total: number;
  perCategory: Record<string, number>;
}

export function wireToInvoiceHistory(w: InvoiceHistoryWire): InvoiceHistoryEntry {
  return {
    year: w.year,
    month: w.month,
    total: w.total,
    perCategory: w.perCategory ?? {},
  };
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx nx test ui-financial --testPathPatterns=invoice.mapper`
Expected: PASS — 3 testes.

- [ ] **Step 5: Commit**

```bash
git add apps/ui-financial/src/app/core/api/invoice.mapper.ts apps/ui-financial/src/app/core/api/invoice.mapper.spec.ts
git commit -F - <<'EOF'
feat(ui-financial): add invoice history mapper

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 3: UI — `AppDataService.loadInvoiceHistory(cardId)`

**Files:**
- Modify: `apps/ui-financial/src/app/layout/app-data.service.ts`
- Test: `apps/ui-financial/src/app/layout/app-data.service.spec.ts`

**Interfaces:**
- Consumes: `InvoiceApiService` (Task 1), `wireToInvoiceHistory` (Task 2).
- Produces: `invoiceHistory: Signal<InvoiceHistoryEntry[]>`, `loadInvoiceHistory(cardId: string): void`, `invoiceHistoryLoading`, `invoiceHistoryError`. A Task 4 consome.

Decisão de forma: **um único signal**, não um mapa por cartão. A rota `cards/:cardId/invoice` mostra um cartão por vez; cada entrada na tela dispara o load e substitui o conteúdo. Um mapa seria estado a mais sem consumidor.

- [ ] **Step 1: Escrever os testes que falham**

Em `app-data.service.spec.ts`, importar o serviço e acrescentar o stub ao `setup()`:

```typescript
import { InvoiceApiService } from '../core/api/invoice-api.service';
```

```typescript
  const invApi = {
    listByCard: jest.fn(() =>
      of([
        { id: 'inv-1', cardId: 'nu-t', year: 2026, month: 3, closingDate: '2026-03-05', dueDate: '2026-03-12', total: 1000, perCategory: {}, status: 'CLOSED' },
      ]),
    ),
  };
```

```typescript
      { provide: InvoiceApiService, useValue: invApi },
```

```typescript
  return { svc: TestBed.inject(AppDataService), txApi, incApi, fixApi, goalApi, catApi, invApi };
```

E ao final do arquivo:

```typescript
describe('AppDataService.loadInvoiceHistory', () => {
  it('requests the history for the given card', () => {
    const { svc, invApi } = setup();
    svc.loadInvoiceHistory('nu-t');
    expect(invApi.listByCard).toHaveBeenCalledWith('nu-t');
    expect(svc.invoiceHistory()[0]).toEqual({ year: 2026, month: 3, total: 1000, perCategory: {} });
    expect(svc.invoiceHistoryLoading()).toBe(false);
  });

  it('starts empty', () => {
    const { svc } = setup();
    expect(svc.invoiceHistory()).toEqual([]);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx nx test ui-financial --testPathPatterns=app-data.service`
Expected: FAIL — `svc.loadInvoiceHistory is not a function`.

- [ ] **Step 3: Implementar**

Em `app-data.service.ts`, acrescentar imports:

```typescript
import { InvoiceApiService } from '../core/api/invoice-api.service';
import { wireToInvoiceHistory, type InvoiceHistoryEntry } from '../core/api/invoice.mapper';
```

Injetar:

```typescript
  private invApi = inject(InvoiceApiService);
```

Signals, junto dos demais:

```typescript
  readonly invoiceHistory = signal<InvoiceHistoryEntry[]>([]);
  readonly invoiceHistoryLoading = signal(false);
  readonly invoiceHistoryError = signal<string | null>(null);
```

Método, ao final da classe:

```typescript
  /** Histórico de faturas fechadas de um cartão. Disparado pela tela de fatura. */
  loadInvoiceHistory(cardId: string): void {
    this.invoiceHistoryLoading.set(true);
    this.invoiceHistoryError.set(null);
    this.invApi.listByCard(cardId).subscribe({
      next: (rows) => {
        this.invoiceHistory.set(rows.map(wireToInvoiceHistory));
        this.invoiceHistoryLoading.set(false);
      },
      error: () => {
        this.fail('Falha ao carregar o histórico de faturas', this.invoiceHistoryError);
        this.invoiceHistoryLoading.set(false);
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
feat(ui-financial): load per-card invoice history via AppDataService

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 4: UI — painel de histórico com dado real

**Files:**
- Modify: `apps/ui-financial/src/app/features/invoice/invoice.component.ts:84-101`
- Modify: `apps/ui-financial/src/app/features/invoice/invoice.component.html:188-219`
- Test: `apps/ui-financial/src/app/features/invoice/invoice.component.spec.ts` (novo)

**Interfaces:**
- Consumes: `AppDataService.invoiceHistory` e `loadInvoiceHistory` (Task 3).
- Produces: nada. Fecha o miolo da fatia.

Contexto (D4/D6): o `history()` atual gera 9 números de um seed dos char codes do `cardId`. Passa a ser: totais das faturas **fechadas** em ordem cronológica, mais a fatura **aberta** (`total()`) como última barra destacada. Média/maior/menor consideram **só as fechadas** (D6).

- [ ] **Step 1: Escrever os testes que falham**

Criar `apps/ui-financial/src/app/features/invoice/invoice.component.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { InvoiceComponent } from './invoice.component';
import { AppDataService } from '../../layout/app-data.service';
import type { InvoiceHistoryEntry } from '../../core/api/invoice.mapper';
import type { Card, Transaction } from '@caixa-familia/shared-types';

const CARD = {
  id: 'nu-t', name: 'Nubank', holder: 'Thais', bank: 'Nubank', color: '#820AD1',
  closing: 5, due: 12, current: 300, limit: 4500, last4: '4421',
} as Card;

const TRANSACTIONS: Transaction[] = [
  { id: 't1', date: '2026-05-10', label: 'Compra', value: 300, cat: 'lazer', holder: 'Thais', method: 'nu-t', installments: null, recurring: false },
];

const CLOSED: InvoiceHistoryEntry[] = [
  { year: 2026, month: 2, total: 1000, perCategory: {} },
  { year: 2026, month: 3, total: 2000, perCategory: {} },
  { year: 2026, month: 4, total: 1500, perCategory: {} },
];

function mockDataService(history: InvoiceHistoryEntry[]) {
  return {
    cardBy: signal({ 'nu-t': CARD }),
    catBy: signal({}),
    transactions: signal(TRANSACTIONS),
    currentMonth: signal({ year: 2026, month: 5, label: 'Maio 2026', short: 'mai' }),
    invoiceHistory: signal(history),
    invoiceHistoryLoading: signal(false),
    loadInvoiceHistory: jest.fn(),
  };
}

function build(history: InvoiceHistoryEntry[]) {
  const data = mockDataService(history);
  TestBed.configureTestingModule({
    imports: [InvoiceComponent],
    providers: [
      { provide: AppDataService, useValue: data },
      { provide: ActivatedRoute, useValue: { snapshot: { params: { cardId: 'nu-t' } } } },
    ],
  });
  const fixture = TestBed.createComponent(InvoiceComponent);
  fixture.detectChanges();
  return { component: fixture.componentInstance, data };
}

afterEach(() => TestBed.resetTestingModule());

describe('InvoiceComponent — history panel', () => {
  it('asks for the history of the routed card', () => {
    const { data } = build(CLOSED);
    expect(data.loadInvoiceHistory).toHaveBeenCalledWith('nu-t');
  });

  it('plots closed invoices followed by the open one', () => {
    const { component } = build(CLOSED);
    expect(component.history()).toEqual([1000, 2000, 1500, 300]);
  });

  it('highlights the open invoice as the last bar', () => {
    const { component } = build(CLOSED);
    expect(component.highlightIndex()).toBe(3);
  });

  it('computes the stats from closed invoices only', () => {
    const { component } = build(CLOSED);
    expect(component.histAvg()).toBeCloseTo(1500);
    expect(component.histMax()).toBe(2000);
    expect(component.histMin()).toBe(1000);
  });

  it('reports how many closed invoices there are', () => {
    const { component } = build(CLOSED);
    expect(component.closedCount()).toBe(3);
  });

  it('survives an empty history with zeroed stats', () => {
    const { component } = build([]);
    expect(component.closedCount()).toBe(0);
    expect(component.histAvg()).toBe(0);
    expect(component.histMax()).toBe(0);
    expect(component.histMin()).toBe(0);
  });

  it('still plots the open invoice when there is no closed history', () => {
    const { component } = build([]);
    expect(component.history()).toEqual([300]);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx nx test ui-financial --testPathPatterns=invoice.component`
Expected: FAIL — `component.highlightIndex is not a function` e `history()` devolvendo a série do seed.

- [ ] **Step 3: Trocar o histórico fabricado pelo real**

Em `invoice.component.ts`, substituir o bloco `history`/`histAvg`/`histMax`/`histMin` (linhas ~84-101) por:

```typescript
  // Faturas fechadas do cartão, em ordem cronológica, vindas da API.
  private closed = computed(() =>
    [...this.data.invoiceHistory()].sort((a, b) => a.year - b.year || a.month - b.month),
  );

  closedCount = computed(() => this.closed().length);

  /** Fechadas (reais) + a fatura aberta do mês como última barra. */
  history = computed((): number[] => [...this.closed().map((i) => i.total), this.total()]);

  /** A fatura aberta é sempre a última barra. */
  highlightIndex = computed(() => this.history().length - 1);

  // Estatísticas consideram só faturas fechadas: incluir o mês aberto, que ainda
  // está sendo formado, distorceria a média.
  private closedTotals = computed(() => this.closed().map((i) => i.total));

  histAvg = computed(() => {
    const t = this.closedTotals();
    return t.length ? t.reduce((s, v) => s + v, 0) / t.length : 0;
  });
  histMax = computed(() => (this.closedTotals().length ? Math.max(...this.closedTotals()) : 0));
  histMin = computed(() => (this.closedTotals().length ? Math.min(...this.closedTotals()) : 0));
```

E disparar o load no `constructor` da classe:

```typescript
  constructor() {
    this.data.loadInvoiceHistory(this.cardId);
  }
```

Nota: `cardId` é um campo inicializado a partir de `route.snapshot`; declarar o `constructor` **depois** dos campos garante que ele já esteja definido.

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx nx test ui-financial --testPathPatterns=invoice.component`
Expected: PASS — 7 testes.

- [ ] **Step 5: Ajustar o template**

Em `invoice.component.html`, o painel de histórico deixa de fixar "9 meses" e `highlightIndex="8"`, e ganha estado vazio:

```html
      <!-- History -->
      <div class="panel">
        <div class="panel-head">
          <span class="panel-title">Histórico desta fatura</span>
          <span class="panel-meta">
            {{ closedCount() }} {{ closedCount() === 1 ? 'fatura fechada' : 'faturas fechadas' }}
          </span>
        </div>
        <div class="hist-body">
          <cf-sparkbars
            [data]="history()"
            [width]="320"
            [height]="48"
            [baseColor]="c.color"
            [highlightColor]="c.color"
            [highlightIndex]="highlightIndex()"
          />
          <hr class="hr" />
          @if (closedCount() === 0) {
            <p class="hist-empty">Nenhuma fatura fechada ainda. A barra mostra a fatura aberta.</p>
          } @else {
            <div class="hist-stats">
              <div class="stat-col">
                <span class="stat-label">Média</span>
                <cf-money [value]="histAvg()" [negColor]="false" size="sm" />
              </div>
              <div class="stat-col">
                <span class="stat-label">Maior</span>
                <cf-money [value]="histMax()" [negColor]="false" size="sm" />
              </div>
              <div class="stat-col">
                <span class="stat-label">Menor</span>
                <cf-money [value]="histMin()" [negColor]="false" size="sm" />
              </div>
            </div>
          }
        </div>
      </div>
```

Acrescentar o estilo do estado vazio em `invoice.component.scss`, seguindo os tokens já usados no arquivo:

```scss
.hist-empty { margin: 0; font-size: 11.5px; color: var(--ink-4); }
```

- [ ] **Step 6: Build para type-check de template**

Run: `npx nx build ui-financial`
Expected: build verde.

- [ ] **Step 7: Commit**

```bash
git add apps/ui-financial/src/app/features/invoice
git commit -F - <<'EOF'
feat(ui-financial): plot real closed invoices in the history panel

The panel showed nine values fabricated from a seed of the card id's
char codes, with average/max/min computed on top of them. It now plots
the card's closed invoices from the API, with the open invoice as the
highlighted last bar; the stats cover closed invoices only, since a
partial month would skew the average.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 5: Marcar o histórico sintético que fica

**Files:**
- Modify: `apps/ui-financial/src/app/features/cards/cards.component.ts:14-21`

**Interfaces:** nenhuma.

Contexto (D5): a sparkline "Hist. 6m" da tabela de cartões segue sintética por decisão de escopo (o endpoint é por cartão e alimentá-la custaria uma requisição por cartão). O comentário atual diz "histórico mock determinístico", o que é fácil de ler como "dado de mock que some em produção". Deixar explícito que é ficção exibida ao usuário, e por quê.

- [ ] **Step 1: Trocar o comentário**

```typescript
// ATENÇÃO: dado fictício exibido ao usuário. Gera uma série determinística por
// cartão a partir de um seed do id — não é histórico real.
// O histórico real existe em GET /cards/:id/invoices, mas é por cartão: alimentar
// esta coluna custaria uma requisição por cartão no load da tela. Ver D5 em
// docs/superpowers/specs/2026-07-11-cards-invoice-slice-design.md.
function cardHistory(card: Card): number[] {
```

- [ ] **Step 2: Confirmar que nada quebrou**

Run: `npx nx test ui-financial --testPathPatterns=cards`
Expected: PASS (ou nenhum teste correspondente — o componente não tem spec).

- [ ] **Step 3: Commit**

```bash
git add apps/ui-financial/src/app/features/cards
git commit -F - <<'EOF'
docs(ui-financial): flag the cards sparkline as fabricated data

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 6: Gate da fatia

- [ ] **Step 1: Suítes**

Run: `npx nx test api-financial && npx nx test ui-financial`
Expected: PASS nos dois.

- [ ] **Step 2: Builds**

Run: `npx nx build api-financial && npx nx build ui-financial`
Expected: verde nos dois.

- [ ] **Step 3: Lint**

Run: `npx nx lint ui-financial`
Expected: "All files pass linting".

- [ ] **Step 4: Confirmar que o seed sumiu da tela de fatura**

Run: `grep -n "charCodeAt" apps/ui-financial/src/app/features/invoice/invoice.component.ts`
Expected: **nenhum resultado**. (Em `cards.component.ts` ele permanece, por D5.)

- [ ] **Step 5: Smoke manual**

Com o stack rodando e logado:
1. Abrir a fatura de um cartão → o painel "Histórico desta fatura" mostra as faturas fechadas reais e a contagem correta.
2. Numa base sem faturas fechadas → mensagem de vazio, uma barra só (a aberta), sem estatísticas.
3. Trocar de cartão → o histórico recarrega para o cartão certo (não fica o do anterior).
4. Média/maior/menor batem com as faturas fechadas, **sem** o mês aberto.

- [ ] **Step 6: Gate de review**

Rodar `/code-review` sobre o diff da fatia.

---

## Self-Review

**Cobertura da spec:**
- §3 Backend: nenhuma mudança — nenhuma task, correto.
- §4 UI: wire type + api service → Task 1; mapper → Task 2; `AppDataService` → Task 3; `features/invoice` → Task 4.
- D5 (tabela de cartões fora de escopo) → Task 5, só comentário.
- §5 Testes e gate → distribuídos e consolidados na Task 6.

**Type consistency:** `InvoiceHistoryEntry` é declarado no mapper (Task 2) e importado por Tasks 3 e 4 pelo mesmo caminho; `loadInvoiceHistory(cardId: string)` tem a mesma assinatura na Task 3 (produz) e na Task 4 (consome); `history()` continua `number[]`, que é o que `cf-sparkbars` exige.

**Ponto de atenção conhecido:** o `perCategory` das faturas fechadas é mapeado mas ainda não tem consumidor na tela — o painel só usa `total`. Mantido no tipo porque é o dado natural para um detalhamento por categoria da fatura fechada, provável próximo passo; se não vier, é candidato a remoção.
