# Fatia 6 — Reports (monthly) (conectar API ↔ front)

**Data:** 2026-07-11
**Umbrella:** `2026-07-11-api-front-migration-umbrella.md`

---

## 1. Objetivo e escopo

Conectar o recurso **Reports (monthly summaries)** API↔front.

**No escopo:**
- **Ler histórico mensal:** `history` (despesa/mês) e `incomeHistory` (receita/mês) deixam de
  ser mock; vêm de `GET /reports/monthly` (`MonthlySummaryView[]`), carregado no login.
  Alimentam a tela `reports` e o Dashboard.

**Fora de escopo:**
- **Fechar mês** (`POST /reports/monthly/close`, admin) — fatia futura.
- Detalhamento por categoria na tela (o `perCategory` existe no wire; usar só se a tela pedir).

## 2. Decisões
- **D1 — só meses fechados:** `GET /reports/monthly` retorna os `MonthlySummary` **fechados**.
  O mês corrente em progresso não é um summary — aparece só quando fechado. A UI mostra o
  histórico de fechados; o mês corrente já é visível ao vivo no Dashboard/telas do mês.
  **Não** sintetizar o mês corrente aqui (YAGNI).
- **D2 — formato da UI:** a tela consome dois arrays de `{ m: string; total: number }` (rótulo
  tipo `'Mai/26'`). O mapper transforma cada summary em `{ m, total }` usando `expenseTotal` e
  `incomeTotal`.
- **D3 — sem dimensão de mês no load:** carrega a série inteira uma vez no login.

## 3. Backend (`api-financial`)
Nenhuma mudança — `GET /reports/monthly` já retorna
`MonthlySummaryView { id, year, month, expenseTotal, incomeTotal, perCategory, closed }[]`,
ordenado por `year,month` asc.

## 4. UI (`ui-financial`)

- **`core/api/wire.types.ts`**: `MonthlySummaryWire` (espelha `MonthlySummaryView`).
- **`core/api/report-api.service.ts`** (novo): `listMonthly(): Observable<MonthlySummaryWire[]>`
  (`GET /reports/monthly`).
- **`core/api/report.mapper.ts`** (novo):
  - `wireToExpenseHistory(rows): { m: string; total: number }[]` → `{ m: monthLabel(year,month),
    total: expenseTotal }`.
  - `wireToIncomeHistory(rows): { m: string; total: number }[]` → idem com `incomeTotal`.
  - helper `monthLabel(year, month)` → `'Mai/26'` (abreviações `['Jan',...,'Dez']`).
- **`layout/app-data.service.ts`**: `history` e `incomeHistory` viram
  `signal<{ m: string; total: number }[]>([])`; `loadMonthlyHistory()` popula ambos de uma só
  chamada; `reportsLoading`/`reportsError`.
- **`layout/app-shell.component.ts`**: incluir `loadMonthlyHistory()` no `effect` de auth (sem mês).
- **`features/reports`**: passa a ler real (já consome `data.history()`/`data.incomeHistory()`).

## 5. Testes e gate
- UI: `report.mapper.spec` (summary → `{m,total}`; `monthLabel`), `report-api.service.spec` (GET),
  `app-data.service.spec` (`loadMonthlyHistory` popula os dois signals).
- `nx build` das duas apps + smoke: login → tela de Reports com séries reais.

## 6. Riscos
- **Meses vazios / série curta:** com poucos summaries fechados, os gráficos da tela (que hoje
  assumem ~12 meses) podem ficar ralos. Confirmar no plano se a tela lida bem com N < 12.
- **Rótulo de mês:** garantir consistência da abreviação com o que a tela já usa
  (`MOCK_HISTORY` usa `'Mai/26'`).
