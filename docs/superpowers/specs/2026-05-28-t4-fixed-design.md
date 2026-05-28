# T4 — Tela: Gastos Fixos (`/fixed`)

**Data:** 2026-05-28  
**Referência de design:** `design_handoff_controle_financeiro/src/screens/fixed.jsx`  
**Arquivo a criar:** `apps/ui-financial/src/app/features/fixed/fixed.component.ts`

---

## Contexto

Tela de visualização dos compromissos fixos mensais da família. Mostra quais itens já foram pagos no mês e quais ainda estão pendentes, com KPIs de resumo no topo.

---

## Rota

Adicionar em `app.routes.ts`:

```typescript
{
  path: 'fixed',
  loadComponent: () =>
    import('./features/fixed/fixed.component').then(m => m.FixedComponent)
}
```

---

## Estrutura do arquivo

Single-file standalone component com template e styles inline — mesmo padrão de `transactions.component.ts`. Nenhum subcomponente adicional.

---

## Lógica de "pago" vs "pendente"

Partição de `MOCK_FIXED` por correspondência de **valor** com transações `recurring: true`:

```typescript
private paidValueSet = computed(() =>
  new Set(this.data.transactions().filter(t => t.recurring).map(t => t.value))
);

pendingItems = computed(() =>
  this.data.fixed().filter(f => !this.paidValueSet().has(f.value)).sort((a, b) => a.due - b.due)
);

paidItems = computed(() =>
  this.data.fixed().filter(f => this.paidValueSet().has(f.value)).sort((a, b) => a.due - b.due)
);
```

Com o mock atual (Mai/2026): **5 pendentes** / **5 pagos**.

Itens pagos (valor confere com transação recurring):
- Clubinho almoço R$ 1.300,00 → t28
- Conta de Luz R$ 550,91 → t27
- Internet R$ 114,90 → t29
- Faculdade Thais R$ 711,45 → t32
- Faculdade Mateus R$ 202,34 → t33

Itens pendentes (sem transação recurring com mesmo valor):
- Aluguel + IPTU, Imposto PJ, Honorários, Corte (Mateus), Unha (Thais)

---

## Computeds de KPI

```typescript
totalFixed   = computed(() => this.data.fixed().reduce((s, f) => s + f.value, 0));
totalPaid    = computed(() => this.paidItems().reduce((s, f) => s + f.value, 0));
totalPending = computed(() => this.pendingItems().reduce((s, f) => s + f.value, 0));

upcoming7 = computed(() => {
  const today = new Date().getDate();
  return this.pendingItems().filter(f => f.due >= today && f.due <= today + 7).length;
});

pctReceita = computed(() =>
  this.totalFixed() / this.data.incomes().reduce((s, i) => s + i.value, 0)
);
```

---

## Layout

### KPI strip — grid `1.4fr 1fr 1fr 1fr`, gap 12, margin-bottom 12

**Card 1 (grande — "Compromissos fixos do mês"):**
- Label "Compromissos fixos do mês"
- `<cf-money [value]="totalFixed()" [negColor]="false" size="xl">`
- Pill `{fixed().length} contas` (brand) + texto "renovam todo mês"
- `<cf-progress-bar [value]="totalPaid()" [max]="totalFixed()" color="var(--pos)" [height]="6">` com mt-12
- Footer row: "R$ X pagos" (esquerda) · "R$ Y a vencer" (direita)

**KPI 2 — "Pagos":**
- Valor: `paidItems().length` em `var(--pos)`
- Meta: "de {fixed().length} contas"

**KPI 3 — "Próx. 7 dias":**
- Valor: `upcoming7()` em `var(--warn)`
- Meta: "vencendo em breve"

**KPI 4 — "% da receita":**
- Valor: `formatPercent(pctReceita())`
- Meta: "renda fixa comprometida"

---

### Duas tabelas — grid `1fr 1fr`, gap 12

#### Tabela esquerda — "A vencer"
- Header: título "A vencer" + pill warn com count
- Meta: "ordenado por vencimento"
- Colunas:

| Coluna | Conteúdo |
|--------|----------|
| Venc. | Dia formatado `DD/mai` + linha `Xd`; pill "urgente" (warn) se `daysAway ≤ 3` |
| Conta | `<cf-icon name="repeat">` + label |
| Categoria | `<cf-cat-dot>` + label da categoria |
| Quem | `<cf-avatar>` simples ou dois avatares sobrepostos se `holder === 'shared'` |
| Valor | `<cf-money>` right-aligned, `negColor: false` |

- Footer: count de contas + total

#### Tabela direita — "Pagos no mês"
- Header: título "Pagos no mês" + pill pos com count
- Meta: "automático via boleto/PIX"
- Colunas idênticas à esquerda, exceto:
  - "Venc." mostra `<cf-icon name="check" color="var(--pos)">` + data (sem urgência)
  - Valor em `var(--ink-3)` (tom atenuado — já pago)

- Footer: count de contas + total

---

## Componentes a importar

```typescript
import { MoneyComponent }       from '../../ui/money/money.component';
import { AvatarComponent }      from '../../ui/avatar/avatar.component';
import { CatDotComponent }      from '../../ui/cat-dot/cat-dot.component';
import { IconComponent }        from '../../ui/icon/icon.component';
import { ProgressBarComponent } from '../../ui/progress-bar/progress-bar.component';
```

---

## Dados

```typescript
this.data.fixed()       // MOCK_FIXED: 10 despesas fixas
this.data.transactions() // para extração do paidValueSet
this.data.incomes()      // para cálculo de % da receita
this.data.catBy()        // lookup categoria → label
```

---

## Fora do escopo (YAGNI)

- Seção "Regras de agendamento" presente no design reference — omitida por não estar na spec
- Edição de gastos fixos
- Filtro por holder (tela é somente leitura no POC)
