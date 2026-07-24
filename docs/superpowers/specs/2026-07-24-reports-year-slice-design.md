# Fatia 9 — KPIs de Relatórios sem ano fixo

**Data:** 2026-07-24
**Registrado em:** `2026-07-11-reports-slice-design.md` §6 (deixado fora do escopo da Fatia 6)

---

## 1. Objetivo e escopo

Os KPIs da tela de Relatórios têm **2026 e 2025 escritos no código**:

```ts
// reports.component.ts:69-70
private sum2026 = (entries) => entries.filter(e => e.m.endsWith('/26')) ...
// :103-104
const y25 = hist.filter(e => e.m.endsWith('/25'));
const y26 = hist.filter(e => e.m.endsWith('/26'));
```

E os rótulos dizem `'Receita 2026 YTD'`, `'Despesa 2026 YTD'`, `'Sobra 2026'`, `'vs. 2025'`.

Enquanto o mês corrente estava travado em maio/2026 (corrigido na Fatia 7) isso nunca aparecia.
Agora que o mês é real, **em 01/01/2027 os quatro cards zeram e o rótulo passa a mentir** — sem
erro, sem aviso, só números errados.

**No escopo:** os KPIs derivarem o ano do contexto de mês, e os rótulos acompanharem.

**Fora de escopo:** redesenhar os KPIs; mudar quais métricas existem.

## 2. Decisões

- **D1 — a causa raiz é o filtro por sufixo de rótulo.** `e.m.endsWith('/26')` casa string contra
  um rótulo de **exibição** (`'Mai/26'`). O wire do backend traz `year` e `month` como números, e
  o `report.mapper` os **descarta**. `MonthEntry` passa a carregar `year` e `month` além de `m`,
  e os filtros viram comparação numérica. Sem isso, a correção seria trocar um literal por outro
  literal montado à mão.
- **D2 — o ano vem de `currentMonth()`, não de `new Date()`.** A tela já é sensível ao mês
  navegado (`short()`, `topCats`, `holderBlocks` usam `currentMonth()`/`transactions()`).
  Derivar de `currentMonth().year` mantém os KPIs coerentes com o que o usuário está olhando;
  derivar de `new Date()` faria o card discordar do resto da tela ao navegar para outro ano.
- **D3 — rótulos dinâmicos.** `'Receita ${ano} YTD'`, `'Despesa ${ano} YTD'`, `'Sobra ${ano}'`,
  `'vs. ${ano - 1}'`.
- **D4 — aditivo, não quebra consumidores.** `m` continua existindo e continua sendo o que
  Dashboard e o eixo do gráfico exibem (`dashboard-a.component.ts:40-41`,
  `reports.component.ts:187`). Só entram campos novos.

## 3. Trabalho

**UI (`ui-financial`)**

- **`core/api/report.mapper.ts`**: `MonthEntry` ganha `year: number` e `month: number`; as duas
  projeções param de descartá-los.
- **`features/reports/reports.component.ts`**:
  - `currentYear = computed(() => this.data.currentMonth().year)`.
  - `sum2026` → `sumYear(entries, year)` filtrando `e.year === year`.
  - `vs2025` → compara `currentYear()` com `currentYear() - 1`, filtrando por `e.year`.
  - Os quatro rótulos passam a interpolar o ano.

Backend não muda: o wire já traz `year` e `month`.

## 4. Testes e gate

- `report.mapper.spec`: as projeções carregam `year`/`month`.
- `reports.component.spec`: KPIs somam o ano de `currentMonth()`; mudando o mês corrente para
  outro ano, os KPIs seguem; rótulos refletem o ano; `vs.` compara com o ano anterior.
- `nx build` + `nx test` + `nx lint`.

## 5. Riscos

- **Série de um ano só.** Se não houver meses do ano anterior, `vs.` fica sem base — o código já
  trata (`avg25 > 0 ? ... : 0`), mas o card mostra `0%` como se fosse estabilidade. Fora do
  escopo mudar a mensagem; registrar se incomodar.
- **Fixtures de teste com `m` sintético.** O `reports.component.spec` da Fatia 6 usa
  `{ m: 'M0', total }` sem ano. Com o filtro numérico esses itens deixam de entrar nos KPIs —
  os testes de **layout do gráfico** não dependem disso, mas as fixtures precisam de `year`/
  `month` para compilar.
