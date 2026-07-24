# Fatia 12 — Histórico real por categoria em Orçamentos

**Data:** 2026-07-24
**Descoberto por:** o gate de dado fabricado da Fatia 11 (`grep charCodeAt`), que eu esperava
voltar vazio.

---

## 1. Objetivo e escopo

`budgets.component.ts:77-83` gera a série de 6 meses de cada categoria a partir de um seed do
`catId`, escalada pelo orçamento:

```ts
private catHistory(catId: string, budget: number): number[] {
  const seed = catId.charCodeAt(0) + (catId.charCodeAt(1) || 0);
  return Array.from({ length: 6 }, (_, i) => Math.round(budget * (0.6 + ((seed + i * 7) % 90) / 100) * 100) / 100);
}
```

Alimenta a sparkline **e** o `histAvg` de cada linha da tabela — ou seja, a "média histórica"
exibida também é inventada.

**O dado real já está carregado.** `GET /reports/monthly` devolve `perCategory` em cada summary,
e o `report.mapper` **descarta** o campo — o mesmo padrão que causou o defeito dos KPIs na
Fatia 9. Não é preciso mudar o backend nem fazer chamada nova.

**No escopo:** `MonthEntry` carregar `perCategory`; Orçamentos derivar série e média reais.

**Fora de escopo:** mudar o que a coluna mostra; a comparação gasto-vs-orçamento do mês (já é
real desde a Fatia 4).

## 2. Decisões

- **D1 — aditivo no mapper, como na Fatia 9.** `MonthEntry` ganha `perCategory:
  Record<string, number>`. `m`, `year`, `month` e `total` seguem intactos; nenhum consumidor
  atual quebra.
- **D2 — categoria sem gasto no mês vale zero, não some.** Um mês fechado em que a categoria não
  teve gasto é um ponto **zero** na série, não um buraco: a sparkline precisa de pontos
  alinhados no tempo. `perCategory[catId] ?? 0`.
- **D3 — os mesmos 6 pontos da tabela de cartões.** Últimos 6 meses fechados, para a coluna não
  mudar de forma.
- **D4 — média guardada contra série vazia.** O código atual divide por `history.length`, que
  era sempre 6 porque o dado era fabricado. Com dado real pode ser **0**, e a média viraria
  `NaN` na tela. A divisão passa a ser protegida.
- **D5 — a função fabricada morre.** `catHistory()` é removida.

## 3. Trabalho

**UI (`ui-financial`)** — backend não muda.

- **`core/api/report.mapper.ts`**: `MonthEntry` ganha `perCategory`; as duas projeções param de
  descartá-lo.
- **`features/budgets/budgets.component.ts`**: `catHistory()` sai; a série de cada linha vem de
  `data.history()`, e `histAvg` ganha a guarda de D4.

## 4. Testes e gate

- `report.mapper.spec`: as projeções carregam `perCategory`; summary sem o campo vira `{}`.
- `budgets.component.spec` (novo): série real por categoria; zero para mês sem gasto na
  categoria; corte em 6; série vazia sem meses fechados; `histAvg` não vira `NaN`.
- `nx build` + `nx test` + `nx lint`.
- **Gate:** `grep -rn "charCodeAt" apps/ui-financial/src --include=*.ts` (fora de specs) retorna
  vazio — desta vez de verdade.

## 5. Riscos

- **Base sem meses fechados.** A coluna fica vazia e a média zera para todas as categorias. É o
  comportamento correto, mas muda visualmente em relação às barras que sempre apareciam.
- **`perCategory` usa slug de categoria.** O backend grava `perCategory[category.slug]`, e o
  `Category.id` da UI **é** o slug (convenção do projeto) — o casamento é direto. Se a convenção
  mudar, este ponto quebra silenciosamente; coberto por teste.
