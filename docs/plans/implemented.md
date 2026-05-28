# Implementado — Caixa Família (ui-financial)

## Contexto

App de controle financeiro pessoal para Mateus & Thais, substituindo uma planilha Excel de 60 abas. Stack: Angular 21, standalone components + signals, Nx monorepo. Design de referência em `design_handoff_controle_financeiro/` (protótipos HTML/React de alta fidelidade). Dados mockados para validação de viabilidade das telas — sem backend.

---

## Estrutura do Monorepo

```
personal-monorepo/
├── apps/
│   └── ui-financial/               # App Angular 21
│       └── src/
│           ├── index.html          # Google Fonts (IBM Plex Sans/Mono) + título
│           ├── styles.scss         # Design tokens globais + reset
│           └── app/
│               ├── app.ts          # Root component (só router-outlet)
│               ├── app.config.ts   # provideRouter
│               ├── app.routes.ts   # Rotas lazy-loaded
│               ├── layout/         # Shell de layout
│               │   ├── app-data.service.ts
│               │   ├── app-shell.component.ts
│               │   ├── sidebar.component.ts
│               │   └── topbar.component.ts
│               ├── ui/             # Componentes atômicos
│               │   ├── money/
│               │   ├── avatar/
│               │   ├── cat-dot/
│               │   ├── card-chip/
│               │   ├── icon/
│               │   ├── progress-bar/
│               │   ├── sparkbars/
│               │   ├── donut/
│               │   └── index.ts    # Barrel export
│               └── features/
│                   ├── dashboard/  # Container com 3 variantes
│                   │   ├── dashboard.component.ts     # Container + tabs
│                   │   ├── dashboard-a.component.ts   # Planilha modernizada
│                   │   ├── dashboard-b.component.ts   # KPI Grid clássico
│                   │   └── dashboard-c.component.ts   # Faturas em destaque
│                   └── transactions/ # Tela de transações
├── libs/
│   ├── shared-types/               # Interfaces TypeScript
│   ├── shared-utils/               # Funções utilitárias
│   └── shared-mocks/               # Dados mockados completos
└── design_handoff_controle_financeiro/  # Protótipos React (referência)
```

---

## Libs compartilhadas

### `@caixa-familia/shared-types`

Interfaces de domínio em `libs/shared-types/src/lib/finance.types.ts`:

```typescript
Card, Income, Category, FixedExpense, Goal, Transaction, Installments
Holder = 'Mateus' | 'Thais' | 'shared'
HolderFilter = Holder | 'todos'
MonthContext = { year: number; month: number }
BudgetStatus = 'folga' | 'no-ritmo' | 'atencao' | 'estourou'
```

### `@caixa-familia/shared-utils`

Funções em `libs/shared-utils/src/lib/`:

- `formatBRL(value)` → `"1.234,56"`
- `formatBRLShort(value)` → `"1.234"`
- `formatPercent(ratio)` → `"42%"`
- `daysUntilClosing(card, ref?)` → dias até o próximo fechamento do cartão
- `cardUtilization(card)` → ratio 0–1 de uso do limite
- `installmentProgress(inst)` → ratio n/of
- `installmentsRemaining(inst)` → parcelas restantes

### `@caixa-familia/shared-mocks`

Dados completos de Maio/2026 em `libs/shared-mocks/src/lib/shared-mocks.ts`:

| Export | Conteúdo |
|--------|----------|
| `MOCK_CARDS` | 7 cartões (Nubank ×2, PicPay, Itaú, Renner, Santander, Inter) |
| `MOCK_INCOMES` | 2 salários (Mateus R$ 1.700, Thais R$ 5.793,69) |
| `MOCK_CATEGORIES` | 11 categorias com cor e orçamento |
| `MOCK_FIXED` | 10 despesas fixas mensais |
| `MOCK_GOALS` | 2 metas (Reserva S.O.S R$ 7.500/12.000, Casamento R$ 18.420/30.000) |
| `MOCK_TRANSACTIONS` | 33 transações de Mai/2026 |
| `MOCK_HISTORY` | Histórico 12 meses de gastos (Jun/25–Mai/26) |
| `MOCK_INCOME_HISTORY` | Histórico 12 meses de receitas |
| `CAT_BY` | `Record<string, Category>` lookup por id |
| `CARD_BY` | `Record<string, Card>` lookup por id |
| `CURRENT_MONTH` | `{ year: 2026, month: 5, label: 'Maio 2026', short: 'Mai/26' }` |

---

## Design tokens (`styles.scss`)

CSS variables globais disponíveis em toda a aplicação:

```scss
// Superfícies
--bg, --surface, --surface-sunk, --surface-alt

// Texto (4 níveis)
--ink-1 (#0A0E1A), --ink-2 (#3F4654), --ink-3 (#6B7280), --ink-4 (#9CA3AF)

// Bordas
--line, --line-strong, --line-soft

// Semânticas
--brand (#0F2D4F), --brand-soft
--neg (#B91C1C), --neg-soft
--pos (#0B6E2F), --pos-soft
--warn (#A16207), --warn-soft

// Fontes
--font-sans: 'IBM Plex Sans', ...
--font-mono: 'IBM Plex Mono', ...

// Utilitários
.num { font-variant-numeric: tabular-nums; ... }  // OBRIGATÓRIO em valores monetários
.skeleton { shimmer animation }
```

---

## Shell de layout

### `AppDataService` (providedIn root)

Singleton que expõe dados mockados como signals. Ponto central de estado da aplicação.

```typescript
// Signals de dados (readonly)
cards, transactions, categories, goals, incomes, fixed, history, incomeHistory
catBy, cardBy   // lookups

// Signals de estado global (mutáveis via .set())
currentMonth: signal<MonthContext & { label, short }>({ year: 2026, month: 5, ... })
holderFilter: signal<HolderFilter>('todos')  // Todos | Mateus | Thais
```

**Padrão de filtro por holder:** `todos` inclui tudo. `Mateus`/`Thais` inclui as do titular + as `shared`. Receita filtra só pelo titular selecionado.

### `AppShellComponent`

Grid `200px sidebar | 1fr main`, height 100vh. Sidebar fixa à esquerda, TopBar no topo direito (48px), `<router-outlet>` no conteúdo com `overflow-y: auto` e `padding: 16px 20px`.

### `SidebarComponent`

8 itens de navegação com `routerLinkActive="active"` e borda esquerda `var(--brand)` no ativo. Seções: Operação · Planejamento · Sistema.

### `TopBarComponent`

- Navegação de mês (← →): muda `currentMonth` signal
- Segmented control Todos/Mateus/Thais: muda `holderFilter` signal
- Botão "+ Lançar gasto" presente mas desabilitado

---

## Componentes atômicos (`src/app/ui/`)

| Componente | Selector | Inputs principais |
|------------|----------|-------------------|
| `MoneyComponent` | `<cf-money>` | `value`, `size` (sm/md/lg/xl/xxl), `cents`, `negColor`, **`color`** (override) |
| `AvatarComponent` | `<cf-avatar>` | `holder` (Mateus/Thais/shared), `size` |
| `CatDotComponent` | `<cf-cat-dot>` | `catId`, `size` — injeta `AppDataService` para lookup de cor |
| `CardChipComponent` | `<cf-card-chip>` | `cardId`, `size` (sm/md) — injeta `AppDataService` |
| `IconComponent` | `<cf-icon>` | `name` (22 ícones), `size`, `color` — SVG inline |
| `ProgressBarComponent` | `<cf-progress-bar>` | `value`, `max`, `color`, `height` |
| `SparkbarsComponent` | `<cf-sparkbars>` | `data`, `height`, `width`, `baseColor`, `highlightColor`, `highlightIndex` |
| `DonutComponent` | `<cf-donut>` | `segments: DonutSegment[]`, `size`, `stroke` — SVG inline |

**`DonutSegment`:** `{ value: number; color: string; label?: string }`

**Ícones disponíveis:** home, list, grid, plus, card, target, repeat, chart, layers, arrowLeft, arrowRight, arrowUp, arrowDown, search, filter, download, settings, bell, check, x, chevDown, chevRight, chevUp, chevLeft, calendar, receipt, flame, bank, upload, pix

**Nota `MoneyComponent`:** o input `color` faz override completo da lógica de `negColor`. Use `[color]="value >= 0 ? 'var(--pos)' : 'var(--neg)'"` para coloração bidirecional.

---

## Telas implementadas

### Dashboard (`/dashboard`) — 3 variantes com seletor de tabs

O `DashboardComponent` é um **container** que renderiza uma das 3 variantes conforme a aba ativa. A seleção é persistida em `localStorage` via chave `cf-dash-tab`. Default: aba C (Faturas).

```typescript
// DashboardComponent
activeTab = signal<'a' | 'b' | 'c'>(localStorage.getItem('cf-dash-tab') ?? 'c');
// effect() persiste qualquer mudança no localStorage
```

---

#### Dashboard A — Planilha modernizada (`dashboard-a.component.ts`)
Referência: `design_handoff_controle_financeiro/src/screens/dashboard-a.jsx`

**Header strip**: 5 KPIs inline (Receita · Gastos · Fixos · Reserva · Saldo) com cor semântica + sparkbars 12 meses de gastos históricos (direita).

**Grid `1.7fr 1fr`:**
- Esquerda: tabela densa com top 16 transações (desc por data), colunas Data/Descrição/Categoria/Método/Quem/Valor
- Direita superior: tabela de faturas abertas (todos 7 cartões, barra stripe lateral colorida, % limite, valor)
- Direita inferior: top 7 categorias com gasto vs. orçamento, ProgressBar colorida por categoria

---

#### Dashboard B — KPI Grid clássico (`dashboard-b.component.ts`)
Referência: `design_handoff_controle_financeiro/src/screens/dashboard-b.jsx`

**4 KPI cards** (grid `repeat(4, 1fr)`): Receita do mês · Gastos do mês · Saldo livre · Reserva S.O.S — com delta % vs. mês anterior (seta para cima/baixo + cor semântica, lógica invertida para gastos).

**Grid `1.4fr 1fr`:**
- Esquerda: lista de faturas em aberto (todos 7 cartões, stripe lateral, data de fechamento, barra de limite, valor)
- Direita: donut de categorias (`DonutComponent` SVG) + legenda com % e valor de cada categoria

**Últimas 9 transações** (tabela full-width abaixo).

---

#### Dashboard C — Faturas em destaque (`dashboard-c.component.ts`)
Referência: `design_handoff_controle_financeiro/src/screens/dashboard-c.jsx`

**KPI strip**: Receita · Gastos (vermelho) · Saldo (verde/vermelho via `color` input) · Faturas — todos via `computed()` reagindo a `holderFilter`.

**Grid `1.55fr 1fr`:**
- Esquerda: grid 2×3 dos **6 cartões** com maior urgência de fechamento (`.slice(0, 6)` após sort por `daysUntilClosing`). Cada card: barra de cor do banco (top), nome+last4, holder, pill de dias (urgente ≤3d, warn ≤7d), valor xl, ProgressBar colorida por banco.
- Direita: Metas & Reservas (2 goals com ProgressBar e % concluído) + Atividade Recente (7 transações mais recentes).

---

### Transactions (`/transactions`)
Referência: `design_handoff_controle_financeiro/src/screens/transactions.jsx`

**KPI strip**: Total · Mateus · Thais · Compartilhado (fixos por holder, independente do filter global).

**Filtros** (signals locais):
- Chips de categoria: Todas + 11 categorias com `CatDot` — `selectedCat: signal<string|null>`
- Busca sobre `transaction.label` — `searchQuery: signal<string>`
- Toggle Agrupar: Data | Categoria — `groupMode: signal<'category'|'date'>`

**Computed principal:**
```typescript
filteredTx = computed(() =>
  transactions()
    .filter(holder match via holderFilter global)
    .filter(cat match)
    .filter(search match)
    .sort(by sortCol/sortDir)
)
```

**Tabela densa** (sticky thead): checkbox · Data · Descrição (+pill fixo) · Categoria · Método (CardChip + last4 ou ícone Pix) · Quem (Avatar ou M+T para shared) · Parcela (n/of + ProgressBar 2px) · Valor (right-aligned).

**Agrupamento por categoria**: group rows com total parcial, itens dentro ordenados por date desc.

**Ordenação**: click no header Data ou Valor, com indicador de direção via `IconComponent`.

---

## Decisões de arquitetura tomadas

| Decisão | Escolha | Razão |
|---------|---------|-------|
| Estado global | Signals no `AppDataService` | POC sem NgRx, simples e reativo |
| Dados | Mocks em lib separada | Facilita substituição por API futura |
| Estilização | Pure CSS + CSS variables | Fidelidade ao design, zero dependências externas |
| Charts | SVG inline (Sparkbars + Donut) | Sem Chart.js/Highcharts, como o design especifica |
| Rotas | Lazy-loaded (`loadComponent`) | Boa prática mesmo no POC |
| Seletor de dashboard | Tabs dentro do container | Troca instantânea, sem mudar URL, persistida em localStorage |
| Drawers | Não implementados | Fora do escopo inicial |
| Mobile | Não implementado | Fora do escopo — validar web primeiro |
| `Array.at()` | Substituído por `arr[arr.length-N]` | `tsconfig.base.json` usa `lib: ["es2020"]` — `.at()` não existe |

---

## Números do mock (Mai/2026)

- Receita total: R$ 7.493,69
- Gastos totais: R$ 6.621,52
- Saldo: R$ 872,17
- Faturas abertas: R$ 4.791,00
- Transações Mateus: R$ 437,87
- Transações Thais: R$ 1.237,57
- Transações compartilhadas: R$ 4.946,08
- Reserva S.O.S: R$ 7.500 / R$ 12.000 (63%)
- Casamento: R$ 18.420 / R$ 30.000 (61%)

---

## Como rodar

```bash
nx serve ui-financial          # http://localhost:4200
nx build ui-financial          # build de produção
```
