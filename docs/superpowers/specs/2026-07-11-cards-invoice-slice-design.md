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
- **D4 — a condição de D3 se confirmou: a fatia tem código (2026-07-24).** A tela de fatura
  **já tem** o painel "Histórico desta fatura" — e ele é alimentado por **dado fabricado**:
  `invoice.component.ts:86-93` gera 9 valores a partir de um seed dos char codes do `cardId`
  (`card.current ±20%`), e a UI exibe média/maior/menor calculados em cima disso. É esse painel
  que passa a ler `GET /cards/:id/invoices`.
- **D5 — a tabela de cartões fica fora (decisão do usuário).** `cards.component.ts:15-21`
  fabrica outra série ("Hist. 6m") pelo mesmo truque de seed. Como o endpoint é **por cartão**,
  alimentá-la custaria uma requisição por cartão no load. Fica como está nesta fatia, mas o
  `cardHistory()` recebe um comentário explícito de que o dado é fictício.
- **D6 — barra aberta destacada, estatísticas só do fechado.** O painel mostra as faturas
  **fechadas** (reais) e, como última barra destacada, a fatura **aberta** do mês
  (client-derived), preservando a intenção visual do código antigo (`highlightIndex` = última).
  Média/maior/menor passam a considerar **apenas as fechadas** — misturar um mês parcial na
  média é o tipo de distorção que o dado fabricado já causava.

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
- ~~**Escopo real incerto**~~ — resolvido em D4: o painel existe e exibe dado fabricado, então
  a fatia tem entrega concreta e não é só verificação.
- **Base vazia.** Num ambiente sem faturas fechadas, o histórico volta vazio. O painel precisa
  de estado vazio explícito — hoje ele nunca ficava vazio porque o dado era inventado.
- **Contagem variável.** O template fixa "9 meses" e `highlightIndex = 8`; com dado real a série
  tem o tamanho que tiver, então ambos passam a derivar do array.
- A fatura aberta client-derived filtra por `method === cardId` dentro do mês corrente, não por
  ciclo de fechamento real; manter essa simplificação (fora de escopo mudá-la).
