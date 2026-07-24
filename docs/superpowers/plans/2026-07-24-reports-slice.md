# Fatia 6 — Reports (monthly) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer `history` e `incomeHistory` — os dois últimos mocks do `AppDataService` — virem de `GET /reports/monthly`, e deixar a tela de Relatórios robusta a séries de tamanho diferente de 12.

**Architecture:** O backend não muda. Entra o par `report-api.service.ts` + `report.mapper.ts`; uma única chamada popula os dois signals (despesa e receita saem do mesmo summary). Como a série não tem dimensão de mês, o load vai no effect de auth. A tela de Relatórios ganha as correções de D4/D5 para aguentar N ≠ 12 e N = 0.

**Tech Stack:** Nx 22 · Angular 21 standalone + signals · Jest 30.

**Spec:** `docs/superpowers/specs/2026-07-11-reports-slice-design.md`
**Umbrella:** `docs/superpowers/specs/2026-07-11-api-front-migration-umbrella.md`

## Global Constraints

- **Camada de dados na UI.** `app/core/api/<recurso>-api.service.ts` + `app/core/api/<recurso>.mapper.ts`, ambos com teste. `AppDataService` é a fachada de signals.
- **Erro/loading.** `AppDataService.fail(message, errorSignal)` seta o signal e dispara toast `neg`; o recurso tem `reportsLoading` / `reportsError`.
- **Disparo de load.** `reports` **não** tem dimensão de mês: carrega no effect de auth, junto de catálogo, receitas e metas — **não** no effect que reage a `currentMonth()`.
- **Formato de rótulo.** `{ m: 'Mai/26', total }` — abreviação de 3 letras com inicial maiúscula e ano de 2 dígitos, idêntico ao que `MOCK_HISTORY` usava.
- **Fora de escopo:** fechar mês (`POST /reports/monthly/close`, admin); `perCategory` na tela; os anos fixos `'/26'`/`'/25'` dos KPIs (problema preexistente, ver §6 da spec).
- **Comandos:** `npx nx test <projeto>`, `npx nx build <projeto>`. Jest 30 usa `--testPathPatterns`.
- **Branch:** direto em `master`.
- **Shell:** Git Bash. Commit multi-linha por heredoc (`git commit -F - <<'EOF'`).

## File Structure

**UI (`apps/ui-financial/src/app/`)**
- `core/api/wire.types.ts` — `MonthlySummaryWire`.
- `core/api/report-api.service.ts` (novo) — só HTTP.
- `core/api/report.mapper.ts` (novo) — `monthLabel` + as duas projeções.
- `layout/app-data.service.ts` — `loadMonthlyHistory()` + signals; sai o último import de `shared-mocks` para dados.
- `layout/app-shell.component.ts` — load no effect de auth.
- `features/reports/reports.component.ts` — D4 e D5.
- `features/reports/reports.component.html` — estado vazio.

Backend não muda. `features/dashboard` não muda: já consome os signals.

---

### Task 1: UI — wire type + `ReportApiService`

**Files:**
- Modify: `apps/ui-financial/src/app/core/api/wire.types.ts`
- Create: `apps/ui-financial/src/app/core/api/report-api.service.ts`
- Test: `apps/ui-financial/src/app/core/api/report-api.service.spec.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `ReportApiService.listMonthly(): Observable<MonthlySummaryWire[]>`. A Task 3 injeta isso.

- [ ] **Step 1: Escrever o teste que falha**

Criar `apps/ui-financial/src/app/core/api/report-api.service.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ReportApiService } from './report-api.service';
import { environment } from '../../../environments/environment';

describe('ReportApiService', () => {
  let service: ReportApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ReportApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ReportApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('GETs the monthly summaries without params', () => {
    service.listMonthly().subscribe();
    const req = httpMock.expectOne(`${environment.apiBaseUrl}/reports/monthly`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx nx test ui-financial --testPathPatterns=report-api.service`
Expected: FAIL — `Cannot find module './report-api.service'`.

- [ ] **Step 3: Adicionar o wire type**

Acrescentar a `wire.types.ts`:

```typescript
export interface MonthlySummaryWire {
  id: string;
  year: number;
  month: number;
  expenseTotal: number;
  incomeTotal: number;
  perCategory: Record<string, number>;
  closed: boolean;
}
```

- [ ] **Step 4: Escrever o serviço**

Criar `apps/ui-financial/src/app/core/api/report-api.service.ts`:

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { MonthlySummaryWire } from './wire.types';

@Injectable({ providedIn: 'root' })
export class ReportApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/reports`;

  listMonthly(): Observable<MonthlySummaryWire[]> {
    return this.http.get<MonthlySummaryWire[]>(`${this.base}/monthly`);
  }
}
```

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `npx nx test ui-financial --testPathPatterns=report-api.service`
Expected: PASS — 1 teste.

- [ ] **Step 6: Commit**

```bash
git add apps/ui-financial/src/app/core/api/wire.types.ts apps/ui-financial/src/app/core/api/report-api.service.ts apps/ui-financial/src/app/core/api/report-api.service.spec.ts
git commit -F - <<'EOF'
feat(ui-financial): add ReportApiService

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 2: UI — `report.mapper`

**Files:**
- Create: `apps/ui-financial/src/app/core/api/report.mapper.ts`
- Test: `apps/ui-financial/src/app/core/api/report.mapper.spec.ts`

**Interfaces:**
- Consumes: `MonthlySummaryWire` (Task 1).
- Produces: `MonthEntry { m: string; total: number }`, `monthLabel(year: number, month: number): string`, `wireToExpenseHistory(rows: MonthlySummaryWire[]): MonthEntry[]`, `wireToIncomeHistory(rows: MonthlySummaryWire[]): MonthEntry[]`. A Task 3 usa as duas projeções.

Nota: as projeções recebem o **array inteiro** (não uma linha), porque ordenam a série antes de projetar — o backend já devolve ordenado, mas depender disso deixaria a UI frágil.

- [ ] **Step 1: Escrever o teste que falha**

Criar `apps/ui-financial/src/app/core/api/report.mapper.spec.ts`:

```typescript
import { monthLabel, wireToExpenseHistory, wireToIncomeHistory } from './report.mapper';
import type { MonthlySummaryWire } from './wire.types';

const row = (year: number, month: number, expenseTotal: number, incomeTotal: number): MonthlySummaryWire => ({
  id: `s-${year}-${month}`,
  year,
  month,
  expenseTotal,
  incomeTotal,
  perCategory: {},
  closed: true,
});

describe('monthLabel', () => {
  it('formats as three-letter month and two-digit year', () => {
    expect(monthLabel(2026, 5)).toBe('Mai/26');
    expect(monthLabel(2025, 12)).toBe('Dez/25');
    expect(monthLabel(2026, 1)).toBe('Jan/26');
  });
});

describe('wireToExpenseHistory', () => {
  it('projects the expense total per month', () => {
    expect(wireToExpenseHistory([row(2026, 4, 4791, 7769), row(2026, 5, 5234, 7493)])).toEqual([
      { m: 'Abr/26', total: 4791 },
      { m: 'Mai/26', total: 5234 },
    ]);
  });

  it('sorts chronologically regardless of input order', () => {
    const out = wireToExpenseHistory([row(2026, 5, 5234, 0), row(2025, 12, 8596, 0), row(2026, 1, 7036, 0)]);
    expect(out.map((e) => e.m)).toEqual(['Dez/25', 'Jan/26', 'Mai/26']);
  });

  it('maps an empty series to an empty array', () => {
    expect(wireToExpenseHistory([])).toEqual([]);
  });
});

describe('wireToIncomeHistory', () => {
  it('projects the income total per month', () => {
    expect(wireToIncomeHistory([row(2026, 5, 5234, 7493)])).toEqual([{ m: 'Mai/26', total: 7493 }]);
  });

  it('stays index-aligned with the expense series', () => {
    const rows = [row(2026, 5, 5234, 7493), row(2026, 4, 4791, 7769)];
    const exp = wireToExpenseHistory(rows);
    const inc = wireToIncomeHistory(rows);
    expect(inc.map((e) => e.m)).toEqual(exp.map((e) => e.m));
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx nx test ui-financial --testPathPatterns=report.mapper`
Expected: FAIL — `Cannot find module './report.mapper'`.

- [ ] **Step 3: Escrever o mapper**

Criar `apps/ui-financial/src/app/core/api/report.mapper.ts`:

```typescript
import type { MonthlySummaryWire } from './wire.types';

/** Ponto de uma série mensal, no formato que os gráficos consomem. */
export interface MonthEntry {
  m: string;
  total: number;
}

const MONTH_ABBR = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/** `2026, 5` → `'Mai/26'`. */
export function monthLabel(year: number, month: number): string {
  return `${MONTH_ABBR[month - 1]}/${String(year).slice(2)}`;
}

const chronological = (rows: MonthlySummaryWire[]): MonthlySummaryWire[] =>
  [...rows].sort((a, b) => a.year - b.year || a.month - b.month);

export function wireToExpenseHistory(rows: MonthlySummaryWire[]): MonthEntry[] {
  return chronological(rows).map((r) => ({ m: monthLabel(r.year, r.month), total: r.expenseTotal }));
}

export function wireToIncomeHistory(rows: MonthlySummaryWire[]): MonthEntry[] {
  return chronological(rows).map((r) => ({ m: monthLabel(r.year, r.month), total: r.incomeTotal }));
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx nx test ui-financial --testPathPatterns=report.mapper`
Expected: PASS — 7 testes.

- [ ] **Step 5: Commit**

```bash
git add apps/ui-financial/src/app/core/api/report.mapper.ts apps/ui-financial/src/app/core/api/report.mapper.spec.ts
git commit -F - <<'EOF'
feat(ui-financial): add monthly report mapper

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 3: UI — `loadMonthlyHistory()` e o fim dos mocks de dados

**Files:**
- Modify: `apps/ui-financial/src/app/layout/app-data.service.ts`
- Modify: `apps/ui-financial/src/app/layout/app-shell.component.ts` (effect de auth)
- Test: `apps/ui-financial/src/app/layout/app-data.service.spec.ts`

**Interfaces:**
- Consumes: `ReportApiService` (Task 1), `wireToExpenseHistory`/`wireToIncomeHistory` (Task 2).
- Produces: `history: Signal<MonthEntry[]>`, `incomeHistory: Signal<MonthEntry[]>` (ambos agora vazios por padrão), `loadMonthlyHistory(): void`, `reportsLoading`, `reportsError`.

Depois desta task, o único símbolo importado de `@caixa-familia/shared-mocks` no `AppDataService` é `CURRENT_MONTH` — a remoção dele fica para a Fatia 7.

- [ ] **Step 1: Escrever os testes que falham**

Em `app-data.service.spec.ts`, importar o serviço e acrescentar o stub ao `setup()`:

```typescript
import { ReportApiService } from '../core/api/report-api.service';
```

```typescript
  const repApi = {
    listMonthly: jest.fn(() =>
      of([
        { id: 's1', year: 2026, month: 4, expenseTotal: 4791, incomeTotal: 7769, perCategory: {}, closed: true },
        { id: 's2', year: 2026, month: 5, expenseTotal: 5234, incomeTotal: 7493, perCategory: {}, closed: true },
      ]),
    ),
  };
```

```typescript
      { provide: ReportApiService, useValue: repApi },
```

```typescript
  return { svc: TestBed.inject(AppDataService), txApi, incApi, fixApi, goalApi, catApi, invApi, repApi };
```

E ao final do arquivo:

```typescript
describe('AppDataService.loadMonthlyHistory', () => {
  it('fills both series from a single call', () => {
    const { svc, repApi } = setup();
    svc.loadMonthlyHistory();
    expect(repApi.listMonthly).toHaveBeenCalledTimes(1);
    expect(svc.history()).toEqual([
      { m: 'Abr/26', total: 4791 },
      { m: 'Mai/26', total: 5234 },
    ]);
    expect(svc.incomeHistory()).toEqual([
      { m: 'Abr/26', total: 7769 },
      { m: 'Mai/26', total: 7493 },
    ]);
    expect(svc.reportsLoading()).toBe(false);
  });

  it('starts both series empty instead of serving mock data', () => {
    const { svc } = setup();
    expect(svc.history()).toEqual([]);
    expect(svc.incomeHistory()).toEqual([]);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx nx test ui-financial --testPathPatterns=app-data.service`
Expected: FAIL — `svc.loadMonthlyHistory is not a function`.

- [ ] **Step 3: Implementar**

Em `app-data.service.ts`:

O import de `@caixa-familia/shared-mocks` perde `MOCK_HISTORY` e `MOCK_INCOME_HISTORY`, restando só `CURRENT_MONTH`:

```typescript
import { CURRENT_MONTH } from '@caixa-familia/shared-mocks';
```

Acrescentar:

```typescript
import { ReportApiService } from '../core/api/report-api.service';
import { wireToExpenseHistory, wireToIncomeHistory, type MonthEntry } from '../core/api/report.mapper';
```

Injetar:

```typescript
  private repApi = inject(ReportApiService);
```

Os dois signals saem do bloco "still-mock" (que deixa de existir) e viram:

```typescript
  readonly history = signal<MonthEntry[]>([]);
  readonly incomeHistory = signal<MonthEntry[]>([]);
```

Signals de estado:

```typescript
  readonly reportsLoading = signal(false);
  readonly reportsError = signal<string | null>(null);
```

E o método, ao final da classe:

```typescript
  /**
   * Série de meses fechados. Uma chamada alimenta as duas projeções — despesa e
   * receita saem do mesmo summary.
   */
  loadMonthlyHistory(): void {
    this.reportsLoading.set(true);
    this.reportsError.set(null);
    this.repApi.listMonthly().subscribe({
      next: (rows) => {
        this.history.set(wireToExpenseHistory(rows));
        this.incomeHistory.set(wireToIncomeHistory(rows));
        this.reportsLoading.set(false);
      },
      error: () => {
        this.fail('Falha ao carregar o histórico mensal', this.reportsError);
        this.reportsLoading.set(false);
      },
    });
  }
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx nx test ui-financial --testPathPatterns=app-data.service`
Expected: PASS.

- [ ] **Step 5: Disparar o load no shell**

Em `app-shell.component.ts`, o effect de auth (sem mês):

```typescript
    // Load the month-independent resources once the user is authenticated.
    effect(() => {
      if (this.auth.isAuthenticated()) {
        this.data.loadCatalog();
        this.data.loadIncomes();
        this.data.loadGoals();
        this.data.loadMonthlyHistory();
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
feat(ui-financial): load the monthly history from the API

history and incomeHistory were the last two mock-backed signals. One
call to GET /reports/monthly now fills both, since expense and income
totals come from the same summary.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 4: UI — Relatórios robusto a séries de qualquer tamanho

**Files:**
- Modify: `apps/ui-financial/src/app/features/reports/reports.component.ts:181-225`
- Modify: `apps/ui-financial/src/app/features/reports/reports.component.html` (bloco do gráfico)
- Test: `apps/ui-financial/src/app/features/reports/reports.component.spec.ts` (novo)

**Interfaces:**
- Consumes: `AppDataService.history` / `incomeHistory` (Task 3).
- Produces: nada. Fecha a fatia.

Contexto (D4/D5): o `chartModel` fixa `groupW = W / 12` e calcula `max` de um jeito que devolve `-Infinity` para série vazia. Com mock de 12 meses nada disso aparecia; com dado real, aparece.

- [ ] **Step 1: Escrever os testes que falham**

Criar `apps/ui-financial/src/app/features/reports/reports.component.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ReportsComponent } from './reports.component';
import { AppDataService } from '../../layout/app-data.service';
import type { MonthEntry } from '../../core/api/report.mapper';

function mockDataService(history: MonthEntry[], incomeHistory: MonthEntry[]) {
  return {
    history: signal(history),
    incomeHistory: signal(incomeHistory),
    transactions: signal([]),
    categories: signal([]),
    catBy: signal({}),
    currentMonth: signal({ year: 2026, month: 5, label: 'Maio 2026', short: 'mai' }),
  };
}

function build(history: MonthEntry[], incomeHistory: MonthEntry[]) {
  TestBed.configureTestingModule({
    imports: [ReportsComponent],
    providers: [{ provide: AppDataService, useValue: mockDataService(history, incomeHistory) }],
  });
  const fixture = TestBed.createComponent(ReportsComponent);
  fixture.detectChanges();
  return fixture.componentInstance;
}

afterEach(() => TestBed.resetTestingModule());

const twelve = (): MonthEntry[] =>
  Array.from({ length: 12 }, (_, i) => ({ m: `M${i}`, total: 1000 + i }));

describe('ReportsComponent — chart layout', () => {
  it('keeps twelve-month spacing for a full year', () => {
    const c = build(twelve(), twelve());
    const bars = c.chartModel().bars;
    expect(bars).toHaveLength(12);
    // último grupo começa dentro da largura do SVG
    expect(bars[11].expX + c.chartModel().barW).toBeLessThanOrEqual(1100);
  });

  it('does not overflow the SVG when there are more than twelve months', () => {
    const many: MonthEntry[] = Array.from({ length: 18 }, (_, i) => ({ m: `M${i}`, total: 1000 }));
    const c = build(many, many);
    const model = c.chartModel();
    expect(model.bars).toHaveLength(18);
    expect(model.bars[17].expX + model.barW).toBeLessThanOrEqual(1100);
  });

  it('does not blow the bars up for a short series', () => {
    const three: MonthEntry[] = [
      { m: 'Mar/26', total: 100 },
      { m: 'Abr/26', total: 200 },
      { m: 'Mai/26', total: 300 },
    ];
    const c = build(three, three);
    // três meses ocupam a mesma largura de grupo de um ano cheio
    expect(c.chartModel().barW).toBeCloseTo(build(twelve(), twelve()).chartModel().barW);
  });
});

describe('ReportsComponent — empty series', () => {
  it('reports that it has no data', () => {
    const c = build([], []);
    expect(c.hasHistory()).toBe(false);
  });

  it('reports that it has data when the series is populated', () => {
    const c = build(twelve(), twelve());
    expect(c.hasHistory()).toBe(true);
  });

  it('produces no bars and finite geometry for an empty series', () => {
    const model = build([], []).chartModel();
    expect(model.bars).toEqual([]);
    expect(model.gridlines.every((g) => Number.isFinite(g.y))).toBe(true);
  });

  it('zeroes the savings aggregates for an empty series', () => {
    const c = build([], []);
    expect(c.avgSavings()).toBe(0);
    expect(c.bestSavingsMonth()).toEqual({ m: '', total: 0 });
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx nx test ui-financial --testPathPatterns=reports.component`
Expected: FAIL — `c.hasHistory is not a function`; e o teste de 18 meses mostra `expX` além de 1100.

- [ ] **Step 3: Corrigir o `chartModel`**

Em `reports.component.ts`, dentro de `chartModel`, substituir o cálculo de `max` e `groupW`:

```typescript
    const W = 1100;
    const H = 200;
    const padTop = 10;
    const padBottom = 22;
    const chartH = H - padTop - padBottom;
    // Série vazia: Math.max() é -Infinity, que passa por `|| 1` por ser truthy.
    const peak = n > 0 ? Math.max(...incomes, ...expenses) : 0;
    const max = peak > 0 ? peak * 1.15 : 1;
    // Até 12 meses preserva o espaçamento original; acima disso encolhe para caber.
    const groupW = W / Math.max(n, 12);
    const barW = (groupW - 8) / 2 - 1;
```

O resto do corpo (`bars`, `points`, `polyline`, `gridlines`) fica como está: com `n === 0`, `months.map` devolve `[]` e `sav.map` também.

- [ ] **Step 4: Expor o estado vazio**

Ainda em `reports.component.ts`, junto dos outros computeds públicos:

```typescript
  hasHistory = computed(() => this.data.history().length > 0);
```

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `npx nx test ui-financial --testPathPatterns=reports.component`
Expected: PASS — 7 testes.

- [ ] **Step 6: Estado vazio no template**

Em `reports.component.html`, envolver o bloco do gráfico comparativo com o guarda e uma mensagem:

```html
@if (hasHistory()) {
  <!-- ... bloco do gráfico existente, sem alterações internas ... -->
} @else {
  <div class="panel">
    <div class="panel-head">
      <span class="panel-title">Receita × Despesa</span>
    </div>
    <p class="empty-note">
      Nenhum mês fechado ainda. O histórico aparece aqui quando o primeiro mês for fechado.
    </p>
  </div>
}
```

Acrescentar em `reports.component.scss`:

```scss
.empty-note { margin: 0; padding: 16px; font-size: 12px; color: var(--ink-4); }
```

Conferir a estrutura real do bloco no arquivo antes de envolver — usar as classes de painel já presentes.

- [ ] **Step 7: Build para type-check de template**

Run: `npx nx build ui-financial`
Expected: build verde.

- [ ] **Step 8: Commit**

```bash
git add apps/ui-financial/src/app/features/reports
git commit -F - <<'EOF'
fix(ui-financial): make the reports chart handle any series length

The chart hardcoded twelve month slots and computed its scale in a way
that yields -Infinity for an empty series (Math.max() is -Infinity, which
is truthy, so the `|| 1` fallback never fired). Neither was reachable
with the twelve-entry mock; both are with real data.

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

- [ ] **Step 4: Confirmar que só sobrou o `CURRENT_MONTH`**

Run: `grep -n "MOCK_\|shared-mocks" apps/ui-financial/src/app/layout/app-data.service.ts`
Expected: só a linha do import de `CURRENT_MONTH`. **Nenhum** `MOCK_*`.

- [ ] **Step 5: Smoke manual**

Com o stack rodando e logado:
1. Tela de **Relatórios** com dado real. Como o seed cria os `MonthlySummary` a partir do próprio `MOCK_HISTORY` (D6), os números devem ficar **idênticos** aos de antes da migração — é esse o critério.
2. Dashboard: os cards que usavam `history`/`incomeHistory` seguem coerentes.
3. Se possível, apagar os summaries do banco e recarregar → a tela mostra o estado vazio, sem gráfico quebrado e sem `NaN`.

- [ ] **Step 6: Gate de review**

Rodar `/code-review` sobre o diff da fatia.

---

## Self-Review

**Cobertura da spec:**
- §3 Backend: nenhuma mudança — nenhuma task, correto.
- §4 UI: wire type + api service → Task 1; mapper → Task 2; `AppDataService` + shell → Task 3; `features/reports` → Task 4.
- D4/D5 (robustez do gráfico) → Task 4.
- §5 Testes e gate → distribuídos e consolidados na Task 5.
- `features/dashboard` não aparece em nenhuma task **de propósito**: consome os mesmos signals e passa a ser real sem alteração.

**Type consistency:** `MonthEntry` é declarado no mapper (Task 2) e importado por Task 3 e pelo spec da Task 4 pelo mesmo caminho; `loadMonthlyHistory()` não recebe parâmetros nas Tasks 3 e 5; o formato `{ m, total }` é idêntico ao que `MOCK_HISTORY` produzia, então nenhum consumidor precisa mudar.

**Ponto de atenção conhecido:** os KPIs da tela filtram ano por sufixo de string fixo (`'/26'`, `'/25'`) e os rótulos dizem "2026 YTD"/"vs. 2025". Isso é preexistente e independente da migração, mas com dado real de outros anos os KPIs zeram sem avisar. Registrado na §6 da spec para uma fatia futura.
