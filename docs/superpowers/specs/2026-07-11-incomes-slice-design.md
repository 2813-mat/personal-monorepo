# Fatia 1 — Incomes (conectar API ↔ front)

**Data:** 2026-07-11
**Roadmap:** `docs/superpowers/plans/2026-07-04-ui-api-connection-roadmap.md` (Fatia 1)
**Template:** fatia de Transactions já implementada (`feat/ui-api-connection-transactions`)

---

## 1. Objetivo e escopo

Conectar o recurso **Incomes** API↔front, seguindo o mesmo roteiro de Transactions.

**No escopo:**
- **Ler:** o signal `incomes` deixa de ser mock e passa a vir de `GET /incomes`, carregado
  no login (**sem filtro de mês** — ver Decisão D1). Alimenta o total de receita no Dashboard.
- **Criar:** ligar o tipo **"Receita"** do `expense-drawer` ao `POST /incomes` (hoje o
  drawer ignora o tipo e cria uma transação errada).
- **Alinhar contrato do backend:** `memberId → holder` (mesmo padrão de tx).

**Fora de escopo:**
- Aporte / `contribution` (Fatia 3 — Goals). O tipo permanece intocado no drawer.
- `incomeHistory` da tela de Reports (Fatia 6).
- Filtro por mês nos incomes (ver Decisão D1).
- Endpoint dedicado de membros / seletor de titular server-side (holder continua sendo
  nome no wire).

## 2. Decisões

- **D1 — Escopo mensal:** `GET /incomes` retorna **todas** as receitas, sem filtro de mês; a
  UI carrega no login (como o catálogo). Motivo: receitas são majoritariamente
  `recurring: true` (salários com uma única `date`); filtrar por `date` esconderia a
  recorrente nos demais meses. Casa com o comportamento atual do mock (o Dashboard apenas
  soma). A nota transversal #2 do roadmap (respeitar `currentMonth()`) **não se aplica** a
  este recurso por essa razão semântica.
- **D2 — Contrato member:** manter a entity `Income` no backend e **renomear** a dimensão de
  membro de `memberId` para `holder` (churn menor que migrar para o padrão "view" de tx,
  mesmo efeito de contrato).
- **D3 — Write gate:** a criação já está protegida no `topbar` (`@if (auth.canWrite())` no
  botão que abre o drawer) e no backend (`@Roles('admin','editor')` no `POST`). Nenhum gate
  adicional é necessário no drawer.

## 3. Backend — alinhamento de contrato (`memberId → holder`)

Wire resultante (read e create): `{ id, label, holder, value, date, recurring }` — 1:1 com
`Income` do `shared-types`.

Arquivos em `apps/api-financial/src/modules/ledger/income/`:

- **`domain/income.entity.ts`**: `IncomeProps.memberId: string | null` → `holder: string`.
  `toJSON()` passa a expor `holder`. Mantém a validação `value >= 0`.
- **`domain/income.repository.ts`**: `CreateIncomeData.memberId?` → `holder: string`.
- **`infrastructure/income.mapper.ts`**: `toDomain` recebe a row **com `member` incluído** e
  mapeia `holder = r.member?.name ?? 'shared'`. Tipar a row para incluir a relação
  (`Prisma.IncomeGetPayload<{ include: { member: true } }>`).
- **`infrastructure/income.prisma.repository.ts`**:
  - `findAll`: incluir `member` no `findMany` (`include: { member: true }`), manter
    `orderBy: { date: 'desc' }`, mapear com `toDomain`.
  - `create`: resolver `holder → memberId` por nome quando `holder !== 'shared'`
    (`prisma.member.findFirst({ where: { householdId, name: holder } })`), gravar e retornar
    via `toDomain` (com `member` incluído no retorno).
- **`interface/dto/create-income.dto.ts`**: substituir `@IsOptional() @IsString() memberId?`
  por `@IsString() holder!: string`.
- **`interface/income.controller.ts`**: sem mudança estrutural. `GET /incomes` sem query;
  `POST /incomes` gated por `@Roles('admin','editor')`, recebendo `holder`.

## 4. UI — camada de dados

Espelhando `transaction-api.service` / `transaction.mapper`. Arquivos em
`apps/ui-financial/src/app/`:

- **`core/api/wire.types.ts`**: adicionar
  - `IncomeWire { id, label, holder, value, date, recurring }`
  - `CreateIncomeWire { label, holder, value, date, recurring }`
- **`core/api/income-api.service.ts`** (novo): `@Injectable({ providedIn: 'root' })` com
  - `list(): Observable<IncomeWire[]>` → `GET {apiBaseUrl}/incomes` (sem params);
  - `create(body: CreateIncomeWire): Observable<IncomeWire>` → `POST {apiBaseUrl}/incomes`.
- **`core/api/income.mapper.ts`** (novo):
  - `wireToIncome(w): Income` (`holder as Holder`);
  - `incomeToCreateWire(i: Income): CreateIncomeWire`.
- **`layout/app-data.service.ts`**:
  - `incomes` vira `signal<Income[]>([])` (remover import/uso de `MOCK_INCOMES`);
  - novos signals `incomesLoading` / `incomesError`;
  - `loadIncomes()`: chama `list()`, seta `incomes` com `map(wireToIncome)`, trata loading e
    erro;
  - `createIncome(i: Income)`: chama `create(incomeToCreateWire(i))`, no sucesso recarrega
    `loadIncomes()`, no erro chama `fail()`;
  - **refatorar `fail()`** para receber o error-signal alvo (hoje fixa `transactionsError`),
    mantendo o toast `neg`. Atualizar as chamadas existentes de tx para passar
    `transactionsError`.
- **`layout/app-shell.component.ts`**: chamar `this.data.loadIncomes()` no `effect` de auth
  (junto de `loadCatalog`, pois não depende de mês).

## 5. UI — criação via drawer

Arquivo `features/expense-drawer/expense-drawer.component.ts`:

- Em `save()`, ramificar por `form.controls.type.value`:
  - `'expense'` → comportamento atual (monta `Transaction`, `data.createTransaction`);
  - `'income'` → montar `Income { id: '', label, holder, value, date, recurring }` e chamar
    `data.createIncome()`;
  - `'contribution'` → intocado (Fatia 3).
- **Validação por tipo:** `cat` (e método/parcelas) não se aplicam a receita. Alternar o
  validator `required` de `cat` reativamente quando o tipo muda (assinar
  `form.controls.type.valueChanges`): limpar em `'income'`, restaurar em `'expense'`, e
  `updateValueAndValidity()`. Assim `form.invalid` não bloqueia o salvar de receita. Campos
  de método/parcela são simplesmente ignorados no payload de income.

## 6. Testes e gate

- **Backend:**
  - ajustar `application/create-income.usecase.spec.ts` (`memberId → holder`);
  - adicionar spec do `infrastructure/income.mapper.ts` (`member.name → holder`, e
    `null → 'shared'`).
- **UI:**
  - `core/api/income.mapper.spec.ts` (wire↔Income, ambos sentidos);
  - `core/api/income-api.service.spec.ts` (`HttpTestingController`: GET sem params, POST body);
  - caso em `layout/app-data.service.spec.ts` para `loadIncomes` (sucesso preenche signal) e
    `createIncome` (recarrega no sucesso; `fail`/toast no erro).
- **Gate:** `nx build api-financial` e `nx build ui-financial` (o jest não faz type-check
  estrito) + smoke manual contra o stack rodando: login → abrir drawer → criar receita →
  ver o total no Dashboard.
- Fluxo **TDD** por item; `/code-review` como gate antes do merge; PR pequeno (uma fatia).

## 7. Riscos / notas

- **`fail()` compartilhado:** a refatoração para receber o error-signal toca o caminho de tx
  já em produção — cobrir com o build + os specs de app-data existentes para não regredir.
- **Resolução de holder no create:** se `holder` não casar com nenhum `member.name`, o
  income é criado com `memberId` indefinido (tratado como `shared` na leitura) — mesmo
  comportamento tolerante de tx.
- **`shared-mocks`:** a limpeza final dos imports de mock em `AppDataService` só acontece
  após todas as fatias (ver roadmap §5); aqui removemos apenas `MOCK_INCOMES`.
