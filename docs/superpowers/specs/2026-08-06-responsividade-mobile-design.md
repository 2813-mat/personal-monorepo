# Spec — Responsividade mobile-first (`ui-financial`)

**Data:** 2026-08-06
**Projeto 1 de 3** do pedido "responsivo + sem mocks + API completa".
**Branch:** `feat/upgrading-the-system` (commits diretos na branch atual, sem PR —
decisão do usuário nesta sessão).

---

## 1. Contexto e problema

A UI é hoje **desktop-only na prática**: os 31 arquivos `.scss` de `ui-financial` têm
**zero media queries**. O shell é `grid-template-columns: 200px 1fr` com `height: 100vh` e
`overflow: hidden`, a sidebar está sempre visível, e há **10 telas com `<table>`** — a de
Transações com 8 colunas. Numa tela de 375px nada disso cabe.

O `index.html` já traz `<meta name="viewport" content="width=device-width, initial-scale=1">`,
então o problema é só de CSS/estrutura, não de configuração.

### O que esta fatia **não** faz

Nenhum botão `disabled` é habilitado aqui. Os 8 stubs documentados no umbrella
(`2026-07-11-api-front-migration-umbrella.md`, §4) dependem de endpoints `PATCH`/`DELETE`
que não existem — são os Projetos 2 (backend) e 3 (wiring). **Esta fatia é exclusivamente
layout.**

Também não se remove mock algum: a migração API↔front foi concluída em 2026-07-24 e
`grep "shared-mocks\|MOCK_" apps/ui-financial/src` já retorna vazio, com trava de lint
(`@nx/enforce-module-boundaries`) impedindo reintrodução.

---

## 2. Decisões tomadas

| # | Decisão | Escolha |
|---|---------|---------|
| 1 | Estratégia | **Mobile-first de verdade**: o corpo do seletor é o celular; media query devolve o desktop |
| 2 | Breakpoints | **2 faixas**: base (celular) + `min-width: 768px`. Tablet herda o desktop |
| 3 | Navegação mobile | **Bottom bar de 4 destinos + botão central de novo gasto** |
| 4 | Tabelas no mobile | **Cada linha vira um card**, com o toque abrindo o detalhe existente |
| 5 | Drawers no mobile | **Tela cheia** nos dois, um único caminho de código |
| 6 | Gráfico de Relatórios | **Janela de 6 meses** no celular; série cheia no desktop |

---

## 3. Fundação CSS

### 3.1 Mixin único

Novo `apps/ui-financial/src/styles/_responsive.scss`:

```scss
@mixin desktop { @media (min-width: 768px) { @content; } }
```

Registrar `stylePreprocessorOptions.includePaths` em `apps/ui-financial/project.json`
(hoje **ausente**) apontando para `apps/ui-financial/src/styles`, para que os componentes
importem por nome em vez de caminho relativo.

**Convenção:** para cada bloco existente, as regras de largura fixa / grid multi-coluna
migram para dentro de `@include desktop`, e o empilhamento vira o corpo base.

### 3.2 Unidade de altura

Trocar `100vh` por `100dvh` em `.shell`, `.shell__main` e nos dois `.panel` de drawer.
`vh` no celular é calculado com a barra de endereço retraída, o que corta conteúdo.

### 3.3 Budget de estilo (bloqueio)

`anyComponentStyle` está em `maximumWarning: 4kb` / `maximumError: 8kb`.
**10 dos 16 componentes já passam de 4 kB hoje**, e o maior (`settings.component.scss`,
5.820 B) está a 2,2 kB do limite de erro. Estilos mobile-first empurram `settings`,
`invoice` e `expense-drawer` para além de 8 kB e **quebram o `nx build` de produção**.

Ajuste: `maximumWarning: 8kb`, `maximumError: 16kb`. O limite atual já não descreve o
projeto — é dívida preexistente registrada no umbrella (§4, "decisão de config pendente"),
resolvida aqui porque agora bloqueia.

---

## 4. Shell e navegação

### 4.1 Fonte única de itens de navegação

`NAV_ITEMS` sai de `sidebar.component.ts` para `layout/nav-items.ts`. Passa a ter três
consumidores: `cf-sidebar`, `cf-bottom-nav` e `cf-more-sheet`.

### 4.2 Componentes novos

**`cf-bottom-nav`** — fixo no rodapé, `display: none` acima de 768px:

| Posição | Item | Rota |
|---|---|---|
| 1 | Início | `/dashboard` |
| 2 | Transações | `/transactions` |
| 3 | **[+] novo gasto** | (abre o drawer) |
| 4 | Cartões | `/cards` |
| 5 | Mais | (abre a folha) |

**`cf-more-sheet`** — folha que sobe: Gastos fixos, Orçamentos, Metas, Relatórios,
Configurações, Importar, Sair.

### 4.3 Refactor de propriedade do drawer

Hoje `drawerOpen` e `<cf-expense-drawer>` vivem dentro de `topbar.component`. A bottom-nav
é **irmã** do topbar, então o FAB não tem como disparar aquele signal.

Mover ambos para `AppShellComponent`, que passa a ser o dono do estado. Topbar (desktop) e
FAB (mobile) viram dois gatilhos do mesmo signal. O gate `auth.canWrite()` permanece nos
dois pontos de disparo.

### 4.4 Topbar no celular

- **Mantém:** navegação de mês (é contexto global, usado por todas as telas) e avatar.
- **Filtro de titular:** os três botões com rótulo viram três avatares sem texto.
- **Descem para a folha "Mais":** "Importar" e "Sair".

### 4.5 Sidebar

Oculta abaixo de 768px. `.shell` vira uma coluna, com `padding-bottom` reservado para a
altura da bottom-nav (mais `env(safe-area-inset-bottom)`).

---

## 5. Tabelas → cards

### 5.1 Por que não CSS-only

A técnica clássica (`display: block` nas células + `::before` com o rótulo da coluna) **não
serve aqui**: as células contêm componentes Angular (`cf-money`, `cf-cat-dot`, `cf-icon`,
`cf-card-chip`) e o CSS não consegue rotular o conteúdo de um componente filho.

### 5.2 `ViewportService`

Novo `core/viewport.service.ts` expondo `isDesktop` como signal, alimentado por
`matchMedia('(min-width: 768px)')` e atualizado no evento `change`.

Cada tela convertida ganha:

```
@if (vp.isDesktop()) { <table> ... } @else { <lista de cards> ... }
```

Os dois ramos leem **os mesmos signals** já existentes no componente — nenhuma lógica de
dados é duplicada, só a apresentação.

### 5.3 Onde aplicar

São **14 tabelas em 10 arquivos**: Dashboard A, Gastos fixos, Fatura e Configurações têm
**duas cada**.

**Recebem o padrão de cards (9 tabelas):**

| Tela | Colunas |
|---|---|
| Transações | 8 |
| Orçamentos | 7 (Categoria, Orçamento, Gasto, Restante, Progresso, Tendência 6m, Status) |
| Configurações — categorias | 7 |
| Configurações — cartões | 5 (Banco, Titular, Fatura, Limite) |
| Fatura — itens | 6 |
| Gastos fixos — a vencer | 5 |
| Gastos fixos — pagos | 5 |
| Cartões | 7 |
| Dashboard A — lançamentos | 6 |
| Dashboard B — lançamentos | 6 |

**Só empilham, sem virar card (3 tabelas):** parcelas futuras (Fatura, 3 colunas) e faturas
abertas (Dashboard A, 4 colunas) não têm cabeçalho e já leem como lista — aplicar o padrão
seria trabalho sem ganho.

**Recebem scroll horizontal (2 tabelas), e por quê:**

| Tela | Motivo |
|---|---|
| Metas | é uma **matriz de colunas dinâmicas**: `@for (goal of goals())` emite *duas* colunas por meta (rótulo + Acumulado). Com 3 metas são 8 colunas e ~1.140px, sem teto superior. Não há card estável a extrair |
| Relatórios | a grade mês-a-mês **é** o conteúdo; comparar linhas entre meses é o propósito da tela |

Nessas duas, a tabela rola dentro do próprio card, com a primeira coluna (`Mês`) fixa via
`position: sticky`, e um indicador visual de que há mais conteúdo à direita.

> **Nota de processo.** A primeira versão desta spec classificava Metas, Orçamentos e
> Configurações como "listas de resumo que só precisam empilhar". Estava errado nas três —
> a classificação foi feita pelo nome da tela, sem abrir o markup. É exatamente o
> aprendizado registrado no umbrella §6 ("revalidar o contrato real antes do plano").

### 5.4 Anatomia do card (Transações, como referência)

- **Linha 1:** descrição (peso 600) à esquerda, valor monoespaçado à direita.
- **Linha 2:** etiquetas secundárias — categoria (com `cf-cat-dot`), método, parcela, titular.
- **Separador de dia** entre grupos de data.
- O toque no card continua abrindo o `tx-detail-drawer`, que já exibe todos os campos.
  Nenhuma informação se perde: ela só migra para onde já estava disponível.

---

## 6. Gráfico e alvos de toque

**`report-chart.component`:**
- `preserveAspectRatio` de `"none"` para `"xMidYMid meet"`. O `none` estica o SVG e distorce
  texto e espessura de traço — a correção também melhora o desktop.
- Novo input `maxPoints`. `ReportsComponent` passa `6` quando `!vp.isDesktop()`, e a série
  completa caso contrário. Com 12–18 meses em 375px os rótulos colidem.

**Alvos de toque** sobem para 44px no mobile: `month-nav-btn`, `seg-btn`, `filter-chip` e o
`close-btn` dos drawers (hoje **26px**).

---

## 7. Drawers em tela cheia

Base (celular): `position: fixed; inset: 0; width: 100%; height: 100dvh;` com header próprio
e botão de voltar. Sem `border-left`, sem sombra lateral.

`@include desktop` restaura o comportamento atual: 460px (`expense-drawer`) / 480px
(`tx-detail-drawer`), ancorado à direita, com a animação `cf-slide` de entrada.

A animação de slide lateral não se aplica no mobile — em tela cheia ela lê como transição de
página, não como painel.

---

## 8. Verificação

1. **`ViewportService`** — teste unitário com `matchMedia` mockado, cobrindo o estado inicial
   e a troca de estado pelo evento `change`.
2. **Telas convertidas** — teste de componente com `ViewportService` falso: `isDesktop=false`
   renderiza a lista de cards e **não** renderiza `<table>`; `isDesktop=true` faz o inverso.
3. **`nx build ui-financial`** é o gate que importa. O umbrella (§6) registra que o Jest da UI
   não faz type-check estrito de template, e que três vezes a suíte passou verde com o build
   quebrado. Rodar build antes de dar qualquer coisa por pronta.
4. **`nx lint ui-financial`** — a trava de fronteira do `shared-mocks` precisa continuar verde.
5. **Validação visual no Chrome** (skill `claude-in-chrome`), tela a tela, em **375 / 768 /
   1280**.

---

## 9. Riscos

| Risco | Mitigação |
|---|---|
| Mobile-first toca os 31 `.scss`; regressão no desktop é o perigo real | O desktop é o estado conhecido: validar as 3 larguras tela a tela, e o build a cada passo |
| Mover `drawerOpen` do topbar quebra `topbar.component.spec.ts` | O teste existe e será atualizado junto, não depois |
| `preserveAspectRatio` corrigido muda o visual do gráfico **no desktop** | É intencional (hoje está distorcido); confirmar no smoke visual |
| Bottom-nav cobrindo conteúdo em telas com rodapé fixo (`table-foot`) | `padding-bottom` no `.shell__content` + `env(safe-area-inset-bottom)` |

---

## 10. Achados registrados para os próximos projetos

**Dois botões mortos além dos 8 stubs do umbrella:** "Importar" (`topbar.component.html`) e
"Exportar" (`transactions.component.html`). Ambos renderizam **sem `(click)` e sem
`disabled`** — parecem clicáveis e não fazem nada, o que é pior que um stub desabilitado.
Não entram nesta fatia. O Projeto 2 decide: implementar ou remover.

**Ordem dos projetos:**
1. **Responsividade** (esta spec)
2. **Backend** — `PATCH /goals/:slug`, `PATCH`+`DELETE /categories/:slug`,
   `PATCH /transactions/:id`, `PATCH`+`DELETE /fixed-expenses/:id`
3. **Wiring** — habilitar os 7 stubs cobertos pelo Projeto 2

Fora de escopo por decisão do usuário: módulo de membros ("Convidar pessoa") e integração de
pagamento ("Boleto" / "Pagar agora").
