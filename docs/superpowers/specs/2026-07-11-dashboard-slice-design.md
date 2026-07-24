# Fatia 7 — Dashboard (fechamento) (conectar API ↔ front)

**Data:** 2026-07-11
**Umbrella:** `2026-07-11-api-front-migration-umbrella.md`

---

## 1. Objetivo e escopo

Fatia de **fechamento**. Sem endpoints novos — o Dashboard agrega signals que já foram
conectados pelas fatias 1–6.

**No escopo:**
- **Remover leituras de mock residuais** do Dashboard: `data.fixed()`, `data.goals()`,
  `data.history()`, `data.incomeHistory()` — todos já reais após as fatias 2/3/6.
- **Estados:** garantir loading/empty coerentes nos cards do Dashboard (saldo, gastos, metas,
  fatura, fixos) quando os signals ainda estão vazios.
- **Limpeza final:** remover de `AppDataService` os imports remanescentes de
  `@caixa-familia/shared-mocks` e rebaixar `shared-mocks` a dependência **só de teste** no build
  de produção.

**Fora de escopo:** redesenho de layout; novos widgets.

## 2. Decisões
- **D1 — verificação, não feature:** esta fatia é essencialmente checagem + limpeza; não deve
  introduzir lógica de dados nova.
- **D2 — gate de mock zero:** ao final, `grep` por `MOCK_` em `apps/ui-financial/src` (fora de
  specs) deve retornar vazio.
- **D3 — `CURRENT_MONTH` era um bug, não só um import (2026-07-24):**
  `CURRENT_MONTH = { year: 2026, month: 5, label: 'Maio 2026', short: 'Mai/26' }` é o mês
  corrente de **toda** a aplicação, fixo em maio/2026. Como `loadTransactions` e `loadFixed`
  usam `currentMonth()` na query, o app carregava o mês errado. Passa a derivar de `new Date()`.
- **D4 — um único formatador de mês.** O topbar constrói o contexto de mês por
  `toLocaleDateString` **duplicado** em `prevMonth`/`nextMonth`, e o formato resultante
  (`'mai. de 26'`) **diverge** do inicial (`'Mai/26'`): bastava navegar um mês para o rótulo
  mudar de cara em Orçamentos, Fatura e Relatórios. Entra `monthContextOf(date)` em
  `shared-utils`, usado nos três pontos. O `monthLabel` do `report.mapper` passa a delegar para
  o mesmo helper, para não existirem duas definições de `'Mai/26'`.
- **D5 — fronteira por lint, não por disciplina.** `shared-mocks` sai do caminho de produção com
  uma regra de `@nx/enforce-module-boundaries` (as tags já existem: `scope:web` e
  `type:data`), de modo que reintroduzir o import quebre o lint em vez de passar despercebido.
- **D6 — estado do Dashboard: faixa única (decisão do usuário).** Um aviso no container do
  Dashboard — carregando enquanto os loads correm, vazio quando não há dados no mês — valendo
  para as três abas. Sem tocar nos cards individuais.
- **D7 — `loadCatalog()` ganha tratamento de erro.** Era o único load com `subscribe` de um
  argumento: falha em categorias ou cartões passava sem toast. Alinhado ao padrão `fail()`.

## 3. Trabalho

- **`layout/app-data.service.ts`**: confirmar que `goals`, `fixed`, `history`, `incomeHistory`
  já são signals reais (fatias 2/3/6); remover quaisquer imports de `shared-mocks` que sobrarem.
- **`features/dashboard/dashboard-{a,b,c}`**: confirmar que todas as leituras
  (`incomes/transactions/fixed/goals/cards/categories/history/incomeHistory`) são reais; ajustar
  estados de empty/loading (ex.: mostrar placeholder enquanto `*Loading()` ou listas vazias).
- **Build de produção:** ajustar `shared-mocks` para não entrar no bundle de produção (mover
  para devDependency/uso só em specs), conforme a limpeza final do roadmap.

## 4. Testes e gate
- `nx build ui-financial` (bundle sem `shared-mocks`) + `nx test ui-financial`.
- **Gate de limpeza:** `grep -rn "shared-mocks\|MOCK_" apps/ui-financial/src --include=*.ts`
  (excluindo `*.spec.ts`) retorna vazio.
- Smoke: login → Dashboard com todos os cards refletindo dados reais; estados de vazio quando
  o household não tem dados.

## 5. Riscos
- **Dependências entre fatias:** só executar após 1–6 concluídas; caso contrário sobram mocks.
- **Uso de `shared-mocks` em specs:** a limpeza deve preservar o uso em testes (não remover a
  lib, apenas tirá-la do caminho de produção). O `seed.ts` do backend também consome a lib
  (por caminho relativo) e **deve continuar funcionando**.
- **Mês corrente vira dinâmico (D3).** Testes que assumiam maio/2026 implicitamente podem
  quebrar; o helper precisa ser determinístico (aceitar uma data injetada) para ser testável.
