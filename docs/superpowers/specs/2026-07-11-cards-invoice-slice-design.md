# Fatia 5 — Cards + Invoice (conectar API ↔ front)

**Data:** 2026-07-11
**Umbrella:** `2026-07-11-api-front-migration-umbrella.md`

---

## 1. Objetivo e escopo

**Contexto:** os **cartões já vêm reais** (`GET /cards` via `loadCatalog`, conectado em
Transactions). A tela de **fatura aberta** (`features/invoice`) já é **derivada no client** das
transações do mês (`transactions().filter(t => t.method === cardId)`) — não depende de endpoint.

**No escopo:**
- **Histórico de faturas (read):** ligar `GET /cards/:id/invoices` (`InvoiceHistoryView[]`) para
  exibir faturas **fechadas** anteriores, **se** a tela expuser um histórico.

**Fora de escopo:**
- **Fatura aberta via endpoint** — permanece client-derived (YAGNI; não há `GET /cards/:id/invoice`).
- **Fechar fatura** (`POST /cards/:id/invoices/close`, admin) — fatia futura.

**Nota de honestidade:** se a UI atual não tem uma seção de histórico de faturas, esta fatia se
reduz a **verificação** (cartões reais + fatura aberta client-derived já funcionam) + eventual
adição de uma pequena seção de histórico. Revalidar no plano se o histórico é desejado agora;
se não for, marcar a fatia como concluída por verificação.

## 2. Decisões
- **D1 — fatura aberta client-derived:** mantida como está (deriva de `transactions()`).
- **D2 — read-only:** sem ação de fechar fatura.
- **D3 — histórico condicional:** só implementar o read de histórico se houver (ou for
  adicionada) uma view de histórico na tela de fatura.

## 3. Backend (`api-financial`)
Nenhuma mudança — `GET /cards/:id/invoices` já existe (`InvoiceHistoryView { id, cardId, year,
month, closingDate, dueDate, total, perCategory, status }`).

## 4. UI (`ui-financial`) — apenas se o histórico entrar
- **`core/api/wire.types.ts`**: `InvoiceHistoryWire` (espelha `InvoiceHistoryView`).
- **`core/api/invoice-api.service.ts`** (novo): `listByCard(cardId): Observable<InvoiceHistoryWire[]>`
  (`GET /cards/{cardId}/invoices`).
- **`core/api/invoice.mapper.ts`** (novo): `wireToInvoiceHistory(w)` → o formato que a seção de
  histórico consumir (ex.: `{ month, total, perCategory }`), reaproveitando `catBy()` para
  rótulos/cores por categoria.
- **`layout/app-data.service.ts`**: `loadInvoiceHistory(cardId)` sob demanda (ao abrir a fatura
  de um cartão), armazenando em um signal por cartão ou map; `invoiceHistoryLoading/Error`.
- **`features/invoice`**: consumir o histórico real na seção correspondente.

## 5. Testes e gate
- Se o histórico entrar: `invoice.mapper.spec`, `invoice-api.service.spec` (GET por cartão),
  caso no `app-data.service.spec`.
- `nx build` + smoke: abrir a fatura de um cartão → fatura aberta (client) + histórico (API).
- Se a fatia ficar só em verificação: confirmar cartões reais + fatura aberta correta e
  encerrar sem código novo.

## 6. Riscos
- **Escopo real incerto** — depende de a UI ter/necessitar histórico. É a fatia mais provável de
  virar "verificação". Decidir cedo no plano para não construir UI não pedida (YAGNI).
- A fatura aberta client-derived filtra por `method === cardId` dentro do mês corrente, não por
  ciclo de fechamento real; manter essa simplificação (fora de escopo mudá-la).
