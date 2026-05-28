# T5 — Tela: Metas (`/goals`)

**Data:** 2026-05-28
**Referência de design:** `design_handoff_controle_financeiro/src/screens/goals.jsx`
**Arquivo principal:** `apps/ui-financial/src/app/features/goals/goals.component.ts`

---

## Contexto

Tela de acompanhamento de metas financeiras do app Caixa Família (Angular 21, standalone components + signals, sem backend). Exibe as duas metas do casal (Reserva S.O.S e Casamento) com progresso, histórico e projeção futura. Dados mockados.

---

## Decisões tomadas

| Decisão | Escolha | Razão |
|---------|---------|-------|
| Tabela de projeção | Uma tabela compartilhada (design reference) | Mais compacta, mostra total consolidado |
| Goal card | Private subcomponent no mesmo arquivo | Separação clara sem proliferação de arquivos |
| Histórico de aportes | Campo `history: number[]` na interface `Goal` | Dado pertence ao domínio, não ao componente |
| Subtítulo e tipo | Campos `subtitle` e `type` na interface `Goal` | Mais limpo que lookup por id no componente |

---

## 1. Alterações na camada de dados

### `libs/shared-types/src/lib/finance.types.ts`

Adicionar campos à interface `Goal`:

```typescript
export interface Goal {
  id: Id;
  label: string;
  target: number;
  balance: number;
  monthly: number;
  color: string;
  subtitle: string;
  type: 'sonho' | 'emergencia';
  history: number[];
}
```

### `libs/shared-mocks/src/lib/shared-mocks.ts`

Atualizar `MOCK_GOALS` com os novos campos:

```typescript
export const MOCK_GOALS: Goal[] = [
  {
    id: 'casamento',
    label: 'Casamento',
    target: 30000,
    balance: 18420,
    monthly: 800,
    color: '#A16207',
    subtitle: 'evento · agosto/2027',
    type: 'sonho',
    history: [500, 500, 500, 600, 600, 700, 700, 800, 800, 800, 800, 800],
  },
  {
    id: 'sos',
    label: 'Reserva S.O.S',
    target: 12000,
    balance: 7500,
    monthly: 1000,
    color: '#0B6E2F',
    subtitle: 'emergência · 6 meses de despesas',
    type: 'emergencia',
    history: [200, 200, 300, 300, 300, 300, 300, 300, 500, 800, 1000, 1000],
  },
];
```

---

## 2. Estrutura do componente

**Arquivo único:** `apps/ui-financial/src/app/features/goals/goals.component.ts`

### `GoalCardComponent` (privado, topo do arquivo)

```
selector: cf-goal-card
Inputs: goal: Goal, history: number[]
```

**Propriedades computadas (na classe):**
- `pct` = `goal.balance / goal.target * 100`
- `remaining` = `goal.target - goal.balance`
- `months` = `Math.ceil(remaining / goal.monthly)`
- `softColor` = amber → `#FBF1E1` / green → `#E0F0E7` (derivado de `goal.color`)
- `typeLabel` = `'sonho'` → `'Sonho'` / `'emergencia'` → `'Emergência'`

**Template (seções):**
1. Stripe de cor (`border-top: 4px solid goal.color`)
2. Header: nome + pill de tipo + subtítulo + botões desabilitados ("Editar" ghost, "Aporte extra" colorido)
3. Valor acumulado `<cf-money size="xxl">` + `/ R$ target`
4. `<cf-progress-bar>` (height 8, color = goal.color)
5. Linha de `% concluído` (esquerda, colorido) + `R$ restantes` (direita, cinza)
6. Stats row (border-top): Aporte/mês · Conclusão prev. (meses) · Aportes feitos (history.length ×) · Sparkbars (width 140, height 28)

### `GoalsComponent` (exportado)

```
selector: cf-goals
Injeta: AppDataService
```

**Computed signals:**
```typescript
totalSaved   = computed(() => goals().reduce((s, g) => s + g.balance, 0))
totalTarget  = computed(() => goals().reduce((s, g) => s + g.target, 0))
totalMonthly = computed(() => goals().reduce((s, g) => s + g.monthly, 0))
totalPct     = computed(() => totalSaved() / totalTarget() * 100)
projectionRows = computed(() =>
  Array.from({ length: 12 }, (_, i) => {
    // Para cada goal: acc = goal.balance + goal.monthly * (i+1)
    // Retorna { label, goals: [{ goal, acc, reached }], total }
  })
)
```

**Seções do template:**

**KPI strip** (grid `1.4fr 1fr 1fr 1fr`, gap 12px):
1. Card largo: "Acumulado em metas" (xl) + "Objetivo total" (lg) + ProgressBar (height 6, color var(--pos)) + % atingido
2. KPI simples: "Metas ativas" → `goals().length` + subtexto "1 emergência · 1 sonho"
3. KPI simples: "Aporte mensal" → `<cf-money>` soma de monthly (sem centavos)
4. KPI simples: "Próx. aporte" → hardcoded `22/mai` + subtexto "automático · Pix débito conta"

**Grid de cards** (grid `1fr 1fr`, gap 12px):
```html
@for (goal of goals(); track goal.id) {
  <cf-goal-card [goal]="goal" [history]="goal.history" />
}
```

**Tabela de projeção** (card full-width):
- Título: "Projeção · próximos 12 meses" + meta "no ritmo atual de aporte"
- Colunas: Mês | Casamento (aporte) | [spacer] | Acumulado Casamento + pbar 3px | S.O.S (aporte) | Acumulado S.O.S + pbar 3px | Total
- Pill "meta atingida" aparece inline quando `acc >= target` (classe `.pill.pos`)
- Valores monetários sem centavos (`formatBRLShort`)

---

## 3. Rota

`apps/ui-financial/src/app/app.routes.ts`:

```typescript
{
  path: 'goals',
  loadComponent: () =>
    import('./features/goals/goals.component').then(m => m.GoalsComponent),
},
```

---

## 4. Estilização

- `.goals-kpi-grid`: `display: grid; grid-template-columns: 1.4fr 1fr 1fr 1fr; gap: 12px; margin-bottom: 12px`
- `.goals-cards-grid`: `display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px`
- `.card`, `.kpi`: mesmas classes e padrão visual dos outros dashboards (surface, border, border-radius, padding)
- Stripe de cor: `border-top: 4px solid` via binding inline em cada card
- Pill de tipo: `background` = softColor, `color` = goal.color, sem borda
- Tabela de projeção: classe `.tx` (padrão do codebase), `.pill.pos` para "meta atingida"
- Todos os valores monetários usam classe `.num` (tabular numerics)

---

## 5. Componentes reutilizados

| Componente | Uso |
|------------|-----|
| `MoneyComponent` | KPI strip, card header, projection table |
| `ProgressBarComponent` | KPI strip, goal card, projection table inline |
| `SparkbarsComponent` | Stats row dentro de cada goal card |
| `IconComponent` | Botão "Aporte extra" (ícone plus) |

Todos importados de `../../ui/` no `GoalsComponent` e `GoalCardComponent`.

---

## 6. Itens fora do escopo (POC)

- Botões "Editar" e "Aporte extra" — visíveis mas desabilitados (`disabled` attribute)
- Data real de próximo aporte — hardcoded `22/mai`
- Navegação de mês (`currentMonth` signal não afeta esta tela no POC)
- Filtro por titular (`holderFilter` não afeta metas)
