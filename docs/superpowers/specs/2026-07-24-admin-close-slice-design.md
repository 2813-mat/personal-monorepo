# Fatia 10 — Ações de fechamento (admin)

**Data:** 2026-07-24
**Umbrella:** `2026-07-11-api-front-migration-umbrella.md`

---

## 1. Objetivo e escopo

Dois endpoints prontos e sem consumidor, ambos `@Roles('admin')`:

- `POST /reports/monthly/close` — `{ year, month }` → snapshot do mês.
- `POST /cards/:id/invoices/close` — `{ year, month }` → snapshot da fatura.

**No escopo:** `isAdmin` no `AuthService`; botão "Fechar mês" em Relatórios; botão "Fechar
fatura" na tela de fatura; confirmação em ambos; o backend expor o ciclo da fatura aberta.

**Fora de escopo:** reabrir/estornar um fechamento (não existe endpoint); "Boleto" e "Pagar
agora" da tela de fatura (também não têm endpoint — seguem `disabled`).

## 2. Decisões

- **D1 — `isAdmin` não existe e é pré-requisito.** O `AuthService` tem `canWrite` (admin **ou**
  editor). Estas duas ações são admin-only; sem um `isAdmin` a UI não tem como gatear, e um
  editor veria um botão que o backend recusa com 403.
- **D2 — bloquear período em curso (decisão do usuário).** Fechar julho no dia 24 grava um total
  parcial que passa a aparecer nos Relatórios como mês fechado. O botão fica desabilitado
  enquanto o período não terminou, com o motivo visível. O backend faz `upsert`, então refazer
  depois corrige o número — mas a foto parcial já teria circulado.
- **D3 — o ciclo da fatura vem do backend, não é recalculado no front.**
  `closeInvoice(cardId, year, month)` ancora em `new Date(year, month - 1, closingDay)`: o
  `(ano, mês)` é o do **fechamento** do ciclo, que para a fatura aberta pode ser o mês seguinte
  ao corrente. Replicar essa regra na UI é a duplicação de lógica que causou os defeitos das
  fatias 8 e 9. `GET /cards/:id/invoice` passa a devolver `closingDate`, `year` e `month` do
  ciclo, e a UI **ecoa** esses valores no fechamento.
- **D4 — reusar o `confirm-modal`.** O componente existe em `app/ui/confirm-modal` e nunca foi
  usado (`title`, `description`, `confirmLabel`, `danger`, `confirmed`/`cancelled`). Não há
  motivo para construir outro.
- **D5 — idempotência é aliada, não desculpa.** Ambos os endpoints são `upsert`: fechar duas
  vezes recalcula em vez de duplicar. Isso justifica não construir fluxo de desfazer nesta
  fatia — mas não dispensa a confirmação, porque o efeito é visível em Relatórios/histórico.
- **D6 — recarregar depois de fechar.** Fechar mês invalida `loadMonthlyHistory()`; fechar
  fatura invalida `loadInvoiceHistory(cardId)` e a fatura aberta. Cada ação recarrega o que
  sujou, no padrão `create*` do `AppDataService`.

## 3. Backend (`api-financial`)

Módulo `catalog/card/`, uma mudança:

- **`domain/card.repository.ts`** — `OpenInvoice` ganha `closingDate: string`, `year: number`,
  `month: number` (as coordenadas do ciclo, iguais às que `closeInvoice` espera).
- **`infrastructure/card.prisma.repository.ts`** — `openInvoice` emite os três a partir do `end`
  que `billingCycleFor` já calcula.
- **Testes:** cobrir que `year`/`month` são os do **fechamento** e não os de hoje.

Nada muda em `reports/monthly/close` nem em `cards/:id/invoices/close`.

## 4. UI (`ui-financial`)

- **`core/auth/auth.service.ts`**: `isAdmin = computed(() => roles().includes('admin'))`, junto
  do `canWrite` e do helper puro já existente (`canWriteFromRoles`) — entra `isAdminFromRoles`.
- **`core/api/report-api.service.ts`**: `closeMonth(year, month): Observable<MonthlySummaryWire>`.
- **`core/api/invoice-api.service.ts`**: `closeInvoice(cardId, year, month): Observable<InvoiceHistoryWire>`.
- **`core/api/invoice.mapper.ts`**: o tipo da fatura aberta ganha `closingDate`, `year`, `month`.
- **`layout/app-data.service.ts`**: `closeMonth(year, month)` (recarrega `loadMonthlyHistory`) e
  `closeInvoice(cardId, year, month)` (recarrega histórico + fatura aberta); erros pelo `fail()`.
- **`features/reports`**: botão "Fechar mês" no cabeçalho, visível só para admin, desabilitado
  enquanto `currentMonth()` for o mês corrente do calendário (D2), com `confirm-modal`.
- **`features/invoice`**: botão "Fechar fatura", visível só para admin, desabilitado enquanto a
  data de fechamento do ciclo não passou (D2), com `confirm-modal`.

## 5. Testes e gate

- Backend: `card.prisma.repository.spec` cobre as coordenadas do ciclo.
- UI: `auth.service.spec` (`isAdmin`); specs dos dois api services (POST); `app-data.service.spec`
  (fecha e recarrega); `reports.component.spec` e `invoice.component.spec` (visibilidade por
  papel, guarda de período em curso, e que confirmar dispara a ação).
- `nx build` + `nx test` + `nx lint`.

## 6. Riscos

- **403 silencioso.** Se a UI errar o gate, o backend recusa com 403 e o usuário vê só o toast
  genérico. Mitigado por esconder o botão para não-admin, mas o `fail()` continua sendo a rede.
- **Fuso e limites de dia.** A guarda de "período em curso" compara datas locais; um fechamento
  no próprio dia do fechamento é permitido (`>=`). Documentar o critério no teste, para não
  virar discussão depois.
- **`year`/`month` do ciclo ≠ mês navegado.** É justamente o ponto de D3: quem ler o código
  rápido pode "corrigir" para `currentMonth()` e reintroduzir o defeito. Comentar no código.
