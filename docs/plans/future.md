# Tasks futuras — Caixa Família

> **Leia `implemented.md` antes de iniciar qualquer task.** Ele documenta arquitetura, componentes disponíveis, padrões de signal/computed e estrutura de dados. Não recrie o que já existe.
>
> Cada task é autocontida: tem referência de design, componentes a reutilizar e dados do mock necessários. Tasks sem dependência podem rodar em paralelo.

---

## Mapa de dependências

```
[T1] Fix Transactions  ──────────────────────────────── independente
[T2] Cartões           ──────────────────────────────── independente
  └─ [T8] Fatura       ← depende de T2 (rota /cards/:id/invoice)
[T3] Orçamentos        ──────────────────────────────── independente
[T4] Gastos fixos      ──────────────────────────────── independente
[T5] Metas             ──────────────────────────────── independente
[T6] Relatórios        ──────────────────────────────── independente
[T7] Configurações     ──────────────────────────────── independente
[T9] Drawer Gasto      ── depende de layout existente (independente de telas)
[T10] Drawer Detalhe   ── depende de T1 estar estável (ou rodar junto)
[T11] UI States        ── independente (componentes reutilizáveis)
```

**Pode rodar tudo em paralelo exceto T8** (precisa que T2 exista primeiro).

---

## ~~T1 — Fix: tela Transactions~~ ✅ concluída

**Fix 1:** avatares sobrepostos com `margin-left: -5px` no segundo avatar — implementado.
**Fix 2:** ordenação dentro dos grupos já funcionava via `flatSorted` — comportamento correto documentado no código.

---

## T2 — Tela: Cartões (`/cards`)

**Referência:** `design_handoff_controle_financeiro/src/screens/cards-list.jsx`
**Arquivo a criar:** `apps/ui-financial/src/app/features/cards/cards.component.ts`
**Paralelo:** sim

### Rota
Adicionar em `app.routes.ts`:
```typescript
{ path: 'cards', loadComponent: () => import('./features/cards/cards.component').then(m => m.CardsComponent) }
```

### Seções

**KPI strip** (4 valores em linha, mesmo padrão dos outros dashboards):
- Total em aberto: `cards().reduce((s,c) => s + c.current, 0)`
- Cartões ativos: `cards().filter(c => c.current > 0).length`
- Próximo fechamento: `cards()` ordenados por `daysUntilClosing` → exibir `card.bank` + dias
- Próximo vencimento: menor `card.due` a partir de hoje

**Tabela de cartões** (todos 7, sticky thead):

| Coluna | Conteúdo |
|--------|----------|
| Banco | barra stripe colorida + nome + `last4` |
| Titular | `<cf-avatar>` + nome |
| Fecha | dia do fechamento + `daysUntilClosing()` em pill |
| Vence | dia de vencimento |
| Uso | `<cf-progress-bar>` + % |
| Histórico | `<cf-sparkbars [data]="cardHistory(card.id)" [width]="80" [height]="20">` |
| Fatura aberta | `<cf-money>` right-aligned |

Para o histórico por cartão: calcular de `MOCK_HISTORY` não é possível (não está por cartão). Usar dados sintéticos: gerar 6 meses baseados em `card.current` com variação ±20% por índice (mock visual suficiente para POC).

**Card "Compromissos futuros"** (abaixo da tabela):
- Calcular de `MOCK_TRANSACTIONS` com `installments !== null`
- Para cada transação parcelada, projetar as parcelas restantes nos próximos 6 meses
- Exibir como grid de meses com total de compromissos

### Componentes a usar
`MoneyComponent`, `AvatarComponent`, `ProgressBarComponent`, `SparkbarsComponent`, `IconComponent` — todos de `../../ui/`

### Dados
```typescript
inject(AppDataService).cards()           // 7 cartões
inject(AppDataService).transactions()    // para compromissos futuros
daysUntilClosing(card)                   // de @caixa-familia/shared-utils
```

---

## T3 — Tela: Orçamentos (`/budgets`)

**Referência:** `design_handoff_controle_financeiro/src/screens/budgets.jsx`
**Arquivo a criar:** `apps/ui-financial/src/app/features/budgets/budgets.component.ts`
**Paralelo:** sim

### Rota
```typescript
{ path: 'budgets', loadComponent: () => import('./features/budgets/budgets.component').then(m => m.BudgetsComponent) }
```

### Seções

**KPI strip:**
- Orçamento total: `categories().reduce((s,c) => s + c.budget, 0)`
- Gasto total: `transactions().reduce((s,t) => s + t.value, 0)`
- Categorias estouradas: contagem de `catSpend[id] > cat.budget`
- Projeção de sobra: `totalBudget - totalSpent`

**Tabela de categorias** (11 linhas, sticky thead):

| Coluna | Conteúdo |
|--------|----------|
| Categoria | `<cf-cat-dot>` + label |
| Orçamento | `<cf-money>` |
| Gasto | `<cf-money>` com cor de status |
| Restante | `<cf-money>` (pode ser negativo) |
| Progresso | `<cf-progress-bar>` com cor de status |
| Tendência | `<cf-sparkbars>` 6 meses (usar `MOCK_HISTORY` proporcional) |
| Status | pill com `BudgetStatus` |

**Status calculado** (usar tipo `BudgetStatus` de `@caixa-familia/shared-types`):
```typescript
const pct = catSpend / cat.budget;
pct < 0.7  → 'folga'     // var(--pos), pill verde
pct < 0.9  → 'no-ritmo'  // var(--brand), pill azul
pct < 1.0  → 'atencao'   // var(--warn), pill amarelo
pct >= 1.0 → 'estourou'  // var(--neg), pill vermelho
```

**Computed principal:**
```typescript
catRows = computed(() =>
  categories().map(cat => {
    const spent = transactions()
      .filter(t => t.cat === cat.id)
      .reduce((s, t) => s + t.value, 0);
    const pct = spent / cat.budget;
    const status: BudgetStatus = pct < 0.7 ? 'folga' : pct < 0.9 ? 'no-ritmo' : pct < 1 ? 'atencao' : 'estourou';
    return { cat, spent, remaining: cat.budget - spent, pct, status };
  })
)
```

---

## T4 — Tela: Gastos fixos (`/fixed`)

**Referência:** `design_handoff_controle_financeiro/src/screens/fixed.jsx`
**Arquivo a criar:** `apps/ui-financial/src/app/features/fixed/fixed.component.ts`
**Paralelo:** sim

### Rota
```typescript
{ path: 'fixed', loadComponent: () => import('./features/fixed/fixed.component').then(m => m.FixedComponent) }
```

### Seções

**KPI strip:**
- Total fixo: `MOCK_FIXED.reduce((s,f) => s + f.value, 0)` → R$ 3.999,60
- Pago no mês: soma de `MOCK_TRANSACTIONS.filter(t => t.recurring)`
- Vencendo em 7 dias: `MOCK_FIXED.filter(f => f.due >= today && f.due <= today+7).length`
- % da receita: `totalFixed / totalIncome * 100`

**Lógica de "pago":** cruzar `MOCK_FIXED` com `MOCK_TRANSACTIONS` por label aproximado ou usar `fixedRef` (se disponível no tipo). Na ausência de `fixedRef`, considerar `t.recurring === true` como indicador de fixo pago.

**Duas tabelas lado a lado:**

*Pendentes* — itens de `MOCK_FIXED` sem correspondência em `MOCK_TRANSACTIONS.recurring`:

| Coluna | Conteúdo |
|--------|----------|
| Descrição | label |
| Categoria | `<cf-cat-dot>` + label |
| Vence | dia do mês + pill de urgência |
| Titular | `<cf-avatar>` |
| Valor | `<cf-money>` right-aligned |

*Pagos este mês* — transações com `recurring: true`:
- Mesmas colunas + data de pagamento

---

## T5 — Tela: Metas (`/goals`)

**Referência:** `design_handoff_controle_financeiro/src/screens/goals.jsx`
**Arquivo a criar:** `apps/ui-financial/src/app/features/goals/goals.component.ts`
**Paralelo:** sim

### Rota
```typescript
{ path: 'goals', loadComponent: () => import('./features/goals/goals.component').then(m => m.GoalsComponent) }
```

### Seções

**2 cards grandes** (grid 2 colunas), um por goal:

Cada card contém:
- Header: nome da meta + cor (`goal.color`)
- Valor acumulado: `<cf-money size="xxl">` + `/ R$ target`
- `<cf-progress-bar [value]="goal.balance" [max]="goal.target" [color]="goal.color" [height]="6">`
- % concluído + meses restantes: `Math.ceil((target - balance) / monthly)`
- Aporte mensal: `<cf-money>`
- Projeção de conclusão: data calculada (mês atual + meses restantes)
- `<cf-sparkbars>` de 12 meses (usar `MOCK_INCOME_HISTORY` como proxy de progresso histórico, ou gerar acumulado sintético)
- Botões desabilitados: "Editar meta" + "Aporte extra" (sem funcionalidade no POC)

**Tabela de projeção** (abaixo de cada card):
Projetar 12 meses à frente: a cada mês, `balance += monthly`. Colunas: Mês · Aporte · Saldo acumulado · % da meta.

### Dados
```typescript
inject(AppDataService).goals()  // MOCK_GOALS: sos + casamento
```

---

## T6 — Tela: Relatórios (`/reports`)

**Referência:** `design_handoff_controle_financeiro/src/screens/reports.jsx`
**Arquivo a criar:** `apps/ui-financial/src/app/features/reports/reports.component.ts`
**Paralelo:** sim

### Rota
```typescript
{ path: 'reports', loadComponent: () => import('./features/reports/reports.component').then(m => m.ReportsComponent) }
```

### Seções

**KPI strip YTD** (baseado em `MOCK_HISTORY` e `MOCK_INCOME_HISTORY`):
- Receita total YTD: soma do ano de `MOCK_INCOME_HISTORY`
- Gastos total YTD: soma do ano de `MOCK_HISTORY`
- Superávit: diferença
- Maior mês de gasto: `Math.max(...history.map(h => h.total))` + qual mês
- Delta vs. ano anterior: não há dados de 2025 completo — exibir `—` ou simular

**Gráfico dual-bar SVG** (inline, sem Chart.js):

Referência de implementação está em `reports.jsx`. Padrão:
- SVG com `viewBox="0 0 width height"`
- Para cada mês: 2 barras lado a lado (receita = `var(--pos)`, gasto = `var(--neg)`)
- Linha de superávit: `<polyline>` conectando os pontos `receita[i] - gasto[i]`
- Labels de mês no eixo X, valores no eixo Y
- Destacar mês atual com opacidade diferente

**Tabela** de top categorias (comparação YTD — como só há 1 ano de dados mockados, usar meses anteriores vs. mês atual):

| Categoria | Mai/26 | Média histórica | Δ% |
|-----------|--------|-----------------|----|

**Breakdown** Mateus / Thais / Compartilhado com barras proporcionais (pode usar `ProgressBarComponent`).

### Dados
```typescript
inject(AppDataService).history()        // 12 meses de gastos
inject(AppDataService).incomeHistory()  // 12 meses de receitas
inject(AppDataService).transactions()   // para breakdown por pessoa
inject(AppDataService).categories()     // para tabela de categorias
```

---

## T7 — Tela: Configurações (`/settings`)

**Referência:** `design_handoff_controle_financeiro/src/screens/settings.jsx`
**Arquivo a criar:** `apps/ui-financial/src/app/features/settings/settings.component.ts`
**Paralelo:** sim — somente leitura, sem lógica de edição

### Rota
```typescript
{ path: 'settings', loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent) }
```

### Layout
2 colunas: nav lateral (`200px`) + área de conteúdo (`1fr`). Seção ativa controlada por signal local `activeSection`.

### Seções (nav lateral)
Categorias · Pessoas · Cartões · Recorrências · Importar · Notificações · Backup

### Conteúdo de cada seção (somente leitura no POC)

**Categorias** (seção default):
- Tabela: ícone drag (estático), `<cf-cat-dot>` + nome, cor (quadrado), orçamento, contagem de transações (`transactions().filter(t => t.cat === cat.id).length`), status ativo/inativo

**Pessoas:**
- 2 cards: Mateus (admin, azul `#1F4E79`) e Thais (editor, bordô `#7A1F3D`)
- Cada card: avatar grande, nome, papel, contagem de transações

**Cartões:**
- Tabela com os 7 cartões: nome, banco, titular, last4, limite, fechamento, vencimento

**Demais seções:** placeholder com mensagem "Em breve" — sem implementação no POC.

---

## T8 — Tela: Fatura (`/cards/:cardId/invoice`) ⚠️ depende de T2

**Referência:** `design_handoff_controle_financeiro/src/screens/invoice.jsx`
**Arquivo a criar:** `apps/ui-financial/src/app/features/invoice/invoice.component.ts`
**Paralelo:** não — requer que T2 (rota `/cards`) exista para navegação

### Rota
```typescript
{ path: 'cards/:cardId/invoice', loadComponent: () => import('./features/invoice/invoice.component').then(m => m.InvoiceComponent) }
```

### Seções

**Header** (card com cor do banco no topo):
- Banco + last4 + `<cf-avatar holder="card.holder">`
- Valor da fatura: `<cf-money size="xxl">`
- Limite, fechamento, vencimento
- Botões desabilitados: "Boleto" + "Pagar agora" (sem funcionalidade)

**Tabela de compras:**
- `transactions().filter(t => t.method === cardId)` ordenadas por data desc
- Colunas: Data · Descrição · Categoria · Parcela (`n/of` + `ProgressBarComponent` 2px) · Valor

**Sidebar direita:**
- Donut de categorias para este cartão (`DonutComponent` — já implementado)
- Sparkbars 9 meses de histórico deste cartão (dados sintéticos, mesmo padrão de T2)
- Parcelas futuras: transações parceladas com `installments.n < installments.of`, projetadas mês a mês

### Dados
```typescript
const cardId = inject(ActivatedRoute).snapshot.params['cardId'];
inject(AppDataService).cardBy()[cardId]       // dados do cartão
inject(AppDataService).transactions()
  .filter(t => t.method === cardId)           // transações da fatura
```

---

## T9 — Drawer: Lançar gasto

**Referência:** `design_handoff_controle_financeiro/src/screens/add-expense.jsx`
**Arquivo a criar:** `apps/ui-financial/src/app/features/expense-drawer/expense-drawer.component.ts`
**Paralelo:** sim — independente das telas de listagem

### Integração
- Habilitar o botão "+ Lançar gasto" no `TopBarComponent` (`apps/ui-financial/src/app/layout/topbar.component.ts`)
- O drawer é um overlay: posição `fixed`, `right: 0`, `top: 0`, `height: 100vh`, `width: 460px`
- Animação de entrada: `transform: translateX(100%)` → `translateX(0)` em 240ms `cubic-bezier(.2,.7,.3,1)`
- Backdrop: `fixed`, `inset: 0`, `background: rgba(0,0,0,0.3)`, `opacity` de 0→1 em 200ms

### Estrutura do formulário (Reactive Forms)
```typescript
form = new FormGroup({
  type:        new FormControl<'expense'|'income'|'contribution'>('expense'),
  value:       new FormControl<number>(0, Validators.required),
  label:       new FormControl('', Validators.required),
  cat:         new FormControl('', Validators.required),
  date:        new FormControl(today, Validators.required),
  method:      new FormControl<string>('pix', Validators.required),
  holder:      new FormControl<Holder>('shared', Validators.required),
  installments: new FormGroup({
    enabled: new FormControl(false),
    total:   new FormControl(1),
  }),
})
```

### Seções do formulário
1. Toggle Despesa / Receita / Aporte (3 botões segmentados)
2. Input de valor grande — inteiro e centavos separados visualmente
3. Campo descrição
4. Seletor de categoria (grid de dots coloridos)
5. Campo data
6. Seletor de método: Pix + lista de cartões com `<cf-card-chip>` + valor de fatura atual
7. Toggle de pessoa: Mateus / Thais / Compartilhado
8. Expansível "Parcelamento" — número de parcelas
9. Expansível "Recorrente" — checkbox

### Salvar
```typescript
save() {
  const tx: Transaction = { id: `t${Date.now()}`, ...form.value };
  this.data.transactions.update(prev => [tx, ...prev]);
  this.close();
}
```
Atalhos: `⌘+Enter` (ou `Ctrl+Enter`) salva, `Escape` fecha.

---

## T10 — Drawer: Detalhe de transação

**Referência:** `design_handoff_controle_financeiro/src/screens/tx-detail.jsx`
**Arquivo a criar:** `apps/ui-financial/src/app/features/tx-detail-drawer/tx-detail-drawer.component.ts`
**Paralelo:** sim (pode ser desenvolvido independentemente da T1)

### Integração
Emitir evento ao clicar em qualquer linha da tabela de transações. O `TransactionsComponent` mantém um signal `selectedTx = signal<Transaction | null>(null)` e renderiza o drawer quando não é null.

### Conteúdo
- Valor grande no topo: `<cf-money size="xxl">`
- Categoria (dot + label), método (chip + last4 ou pix), pessoa (avatar + nome), data, recorrência
- Se parcelado: barra de parcelas pagas (n barras coloridas + of-n barras cinza)
- Tags / nota (exibir `tx.note` se houver)
- Histórico de auditoria (mock: "Criado em {data}")
- Botões de ação: **Duplicar** · **Excluir** · **Editar** · **Verificar**
  - Duplicar: adiciona cópia via `data.transactions.update`
  - Excluir: remove via `data.transactions.update(prev => prev.filter(t => t.id !== tx.id))`
  - Editar / Verificar: sem funcionalidade no POC (botões visíveis mas desabilitados)

---

## T11 — UI States (componentes reutilizáveis)

**Referência:** `design_handoff_controle_financeiro/src/screens/states/empty-loading-error.jsx` e `overlays.jsx`
**Diretório:** `apps/ui-financial/src/app/ui/` (adicionar ao barrel `index.ts`)
**Paralelo:** sim — componentes puros sem dependência de features

### Componentes a criar

**`EmptyStateComponent` (`<cf-empty-state>`)**
- Inputs: `title`, `description`, `actions: {label, icon}[]`
- Layout: ícone grande + título + descrição + até 3 botões CTA
- Usar na versão futura do dashboard quando `transactions().length === 0`

**`SkeletonComponent` (`<cf-skeleton>`)**
- Inputs: `width`, `height`, `lines?: number`
- Aplica a classe `.skeleton` (já definida em `styles.scss`) em um `<div>` com as dimensões corretas
- Usar em qualquer lugar que aguarda dados

**`ConfirmModalComponent` (`<cf-confirm-modal>`)**
- Inputs: `title`, `description`, `confirmLabel`, `cancelLabel`
- Outputs: `confirmed`, `cancelled`
- Overlay centralizado com backdrop, animação de fade

**`SuccessModalComponent` (`<cf-success-modal>`)**
- Inputs: `title`, `amount?: number`, `transactionId?: string`
- Check verde animado + valores + botões "Recibo" / "Voltar"

**`ToastService`** (service, não componente)
- `show(message: string, type: 'pos'|'neg'|'warn', action?: {label, callback})`
- Stack de toasts no `bottom-right` via signal array, auto-dismiss em 4s

---

## Depois do POC: integração com API

1. Criar `DataService` com `HttpClient` + `toSignal()` — mesma interface de signals do `AppDataService`
2. `AppDataService` atual vira `MockDataService` para testes
3. Componentes não precisam mudar — consomem signals independente da origem
4. Autenticação: dois usuários (Mateus admin, Thais editor) — `AuthService` + guards nas rotas

---

## Decisões de arquitetura em aberto

Estas decisões precisam ser tomadas antes de implementar as tasks indicadas:

| # | Decisão | Task afetada |
|---|---------|--------------|
| 1 | Parcelamento: 1 pai + N filhos **ou** N transações com `installment_group_id`? | T10, T8 |
| 2 | Fatura: entidade própria **ou** `tx WHERE method=card`? | T8 |
| 3 | Despesa fixa: template **ou** filtro virtual por `recurring: true`? | T4 |
| 4 | Aporte em meta: tx especial **ou** entidade separada? | T5 |
| 5 | Despesa compartilhada: tag soft **ou** divisão de valor? | T9, relatórios |
