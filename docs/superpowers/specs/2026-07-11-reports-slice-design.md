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
- **D4 — o gráfico precisa aguentar N ≠ 12 (2026-07-24):** `reports.component.ts:195` fixa
  `groupW = W / 12`. Com menos de 12 meses as barras ocupam só a fração esquerda da largura;
  com mais, vazam para fora do SVG. Passa a ser `W / Math.max(n, 12)`: até 12 meses o visual
  atual é preservado, acima disso as barras encolhem para caber. Dividir por `n` puro faria
  uma série de 1 mês virar uma barra gigante.
- **D5 — série vazia (2026-07-24):** `reports.component.ts:194` faz
  `Math.max(...incomes, ...expenses) * 1.15 || 1`. Com arrays vazios isso é
  `Math.max()` = `-Infinity`, e `-Infinity` é **truthy** — o `|| 1` não protege. Era inalcançável
  com mock de 12 meses; com dado real é alcançável. O cálculo passa a tratar a série vazia
  explicitamente, e a tela ganha estado vazio.
- **D6 — verificação por identidade:** o seed cria os `MonthlySummary` a partir do próprio
  `MOCK_HISTORY`/`MOCK_INCOME_HISTORY` (`seed.ts:130-139`). Num banco semeado, a tela deve
  renderizar **exatamente os mesmos números** depois da migração — é esse o critério de smoke.

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
- ~~**Meses vazios / série curta**~~ — confirmado e endereçado em D4 e D5: a tela **não** lidava
  bem com N ≠ 12 nem com N = 0.
- **Rótulo de mês:** garantir consistência da abreviação com o que a tela já usa
  (`MOCK_HISTORY` usa `'Mai/26'`).
- **Anos fixos no código (fora de escopo).** `sum2026` filtra `'/26'` e `vs2025` filtra `'/25'`
  por sufixo de string (`reports.component.ts:69-109`), e os rótulos dos KPIs dizem "2026 YTD"
  e "vs. 2025". Com dado real de outros anos esses KPIs zeram silenciosamente. É problema
  preexistente e independente da migração — anotar para depois, não corrigir aqui.
