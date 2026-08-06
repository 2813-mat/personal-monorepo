# Endpoints de escrita (`api-financial`) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar os sete endpoints `PATCH`/`DELETE` que faltam, para que sete dos oito stubs
`disabled` da UI passem a ter contrapartida no backend.

**Architecture:** Arquitetura hexagonal já usada pelo projeto — `interface` (controller + DTO)
→ `application` (use case) → `domain` (porta do repositório) → `infrastructure` (repositório
Prisma + mapper). **Política de erro vive no use case**, não no repositório: o repositório
devolve `null`/`false`/contagem e o use case traduz para `NotFoundException`,
`ConflictException` ou `BadRequestException`. Isso mantém o `NestJS` fora da camada de
infraestrutura.

**Tech Stack:** NestJS, Prisma 6, PostgreSQL, Jest, Nx.

**Spec:** `docs/superpowers/specs/2026-08-06-api-write-endpoints-design.md`

## Global Constraints

- **Branch:** `feat/upgrading-the-system`. Commits diretos, sem PR.
- **Nenhum arquivo de `ui-financial` é tocado.** Ligar os botões é o Projeto 3.
- **Todo acesso a dado é escopado por `householdId`** via `this.scoped()` do
  `TenantRepository`. Cada recurso tem teste de que um id de outro household resulta em 404.
- **Papéis:** `@Roles('admin', 'editor')` em todos os endpoints novos, como o `POST` e o
  `DELETE` já existentes.
- **`slug` nunca é editável.** É a chave de URL e a referência usada por outros recursos.
- **`holder` no wire é nome, nunca `memberId`.** `'shared'` → `memberId: undefined`.
  Convenção transversal do umbrella §2.1.
- **`PATCH` responde 200 com a entidade atualizada; `DELETE` responde 204.**
- **Gate:** `npx nx test api-financial` e `npx nx build api-financial`, ambos verdes ao fim de
  cada task.
- Mensagens de erro em **pt-BR**.

### Padrões do repositório que o plano assume

- Specs de repositório Prisma **mockam o client** (`jest.fn()`), não usam banco real. Ver
  `goal.prisma.repository.spec.ts`.
- `ValidationPipe` global já roda com `whitelist: true` e `forbidNonWhitelisted: true`
  (`main.ts:9`) — campo desconhecido já devolve 400 sozinho.
- Controllers chamam `.toJSON()` em entidades de domínio (`Category`), mas devolvem `View`
  direto quando o repositório já retorna um objeto plano (`TransactionView`, `GoalView`).

---

### Task 1: Migração — `Category.order` e `Transaction.reviewed`

**Files:**
- Modify: `apps/api-financial/src/infrastructure/prisma/schema.prisma`
- Create: `apps/api-financial/src/infrastructure/prisma/migrations/<timestamp>_add_order_and_reviewed/migration.sql`

**Interfaces:**
- Consumes: nada.
- Produces: colunas `Category.order` (Int) e `Transaction.reviewed` (Boolean). Tasks 2 e 3
  as expõem no wire.

- [ ] **Step 1: Acrescentar as colunas ao schema**

Em `schema.prisma`, dentro de `model Category`, após `budget`:

```prisma
  order       Int     @default(0)
```

E dentro de `model Transaction`, após `recurring`:

```prisma
  reviewed    Boolean @default(false)
```

- [ ] **Step 2: Gerar a migração**

Run: `npx prisma migrate dev --name add_order_and_reviewed --create-only`
Expected: cria a pasta de migração com o `ALTER TABLE` das duas colunas, sem aplicar ainda.

- [ ] **Step 3: Acrescentar o backfill de `order` à migração**

Abrir o `migration.sql` gerado e acrescentar ao final:

```sql
-- Backfill: preserva a ordem de exibição atual, que era `label` ascendente
-- (category.prisma.repository.ts). Sem isto, todas as categorias ficam com
-- order = 0 e a ordem visível muda sozinha no deploy.
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "householdId" ORDER BY label ASC) AS rn
  FROM "Category"
)
UPDATE "Category" c
SET "order" = ranked.rn
FROM ranked
WHERE c.id = ranked.id;
```

- [ ] **Step 4: Aplicar e regenerar o client**

Run: `npx prisma migrate dev && npx prisma generate`
Expected: migração aplicada, client regenerado com os dois campos novos.

- [ ] **Step 5: Verificar o backfill no banco**

Run:

```bash
docker exec cf-postgres psql -U cf -d caixa_familia -c 'SELECT slug, label, "order" FROM "Category" ORDER BY "order";'
```

Expected: `order` de 1 em diante, e a ordem por `order` idêntica à ordem por `label`.
(Se o nome do banco/usuário divergir, conferir em `docker-compose.yml`.)

- [ ] **Step 6: Commit**

```bash
git add apps/api-financial/src/infrastructure/prisma/
git commit -m "feat(api-financial): add category order and transaction reviewed columns"
```

---

### Task 2: Expor `order` no wire de categoria

**Files:**
- Modify: `apps/api-financial/src/modules/catalog/category/domain/category.entity.ts`
- Modify: `apps/api-financial/src/modules/catalog/category/infrastructure/category.mapper.ts`
- Modify: `apps/api-financial/src/modules/catalog/category/infrastructure/category.prisma.repository.ts:15`
- Create: `apps/api-financial/src/modules/catalog/category/infrastructure/category.mapper.spec.ts`

**Interfaces:**
- Consumes: coluna `Category.order` (Task 1).
- Produces: `CategoryProps.order: number`, emitido pelo `toJSON()` que o controller devolve.
  A Task 7 (reordenação) depende dele.

> O umbrella §1b registra que o defeito mais repetido da migração anterior foi o mapper
> descartar campo que o wire trazia — 3 ocorrências. Por isso o mapper ganha teste próprio.

- [ ] **Step 1: Escrever o teste que falha**

`category.mapper.spec.ts`:

```ts
import { Category as PrismaCategory } from '@prisma/client';
import { toDomain } from './category.mapper';

const row = {
  id: 'c1',
  householdId: 'h1',
  slug: 'casa',
  label: 'Casa',
  color: '#7A4F1D',
  budget: 500 as never,
  order: 3,
} as unknown as PrismaCategory;

describe('category.mapper', () => {
  it('emite order no wire', () => {
    expect(toDomain(row).toJSON()).toMatchObject({ order: 3 });
  });

  it('converte budget de Decimal para number', () => {
    expect(typeof toDomain(row).toJSON().budget).toBe('number');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx nx test api-financial --testPathPattern=category.mapper`
Expected: FAIL — `order` ausente no objeto.

- [ ] **Step 3: Acrescentar `order` à entidade**

Em `category.entity.ts`, acrescentar a `CategoryProps`:

```ts
  order: number;
```

- [ ] **Step 4: Acrescentar `order` ao mapper**

`category.mapper.ts` inteiro:

```ts
import { Category as PrismaCategory } from '@prisma/client';
import { Category } from '../domain/category.entity';

export const toDomain = (r: PrismaCategory): Category =>
  new Category({
    id: r.id,
    slug: r.slug,
    label: r.label,
    color: r.color,
    budget: Number(r.budget),
    order: r.order,
  });
```

- [ ] **Step 5: Ordenar por `order`**

Em `category.prisma.repository.ts`, no `findAll`, trocar o `orderBy`:

```ts
    const rows = await this.prisma.category.findMany({
      where: this.scoped(),
      orderBy: [{ order: 'asc' }, { label: 'asc' }],
    });
```

`label` como desempate mantém a lista estável se duas categorias tiverem o mesmo `order`.

- [ ] **Step 6: Ajustar o `create` para pôr a categoria nova no fim**

No mesmo arquivo, substituir o `create`:

```ts
  async create(data: CreateCategoryData) {
    const last = await this.prisma.category.findFirst({
      where: this.scoped(),
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const row = await this.prisma.category.create({
      data: { ...data, householdId: this.householdId, order: (last?.order ?? 0) + 1 },
    });
    return toDomain(row);
  }
```

Sem isto toda categoria nova nasce com `order: 0` e vai para o topo da lista.

- [ ] **Step 7: Rodar e ver passar**

Run: `npx nx test api-financial --testPathPattern=category`
Expected: PASS.

- [ ] **Step 8: Gate e commit**

Run: `npx nx test api-financial && npx nx build api-financial`

```bash
git add apps/api-financial/src/modules/catalog/category/
git commit -m "feat(api-financial): expose category order on the wire"
```

---

### Task 3: Expor `reviewed` no wire de transação

**Files:**
- Modify: `apps/api-financial/src/modules/ledger/transaction/domain/transaction.repository.ts`
- Modify: `apps/api-financial/src/modules/ledger/transaction/infrastructure/transaction.mapper.ts`
- Modify: `apps/api-financial/src/modules/ledger/transaction/infrastructure/transaction.mapper.spec.ts`

**Interfaces:**
- Consumes: coluna `Transaction.reviewed` (Task 1).
- Produces: `TransactionView.reviewed: boolean`. A Task 8 permite alterá-lo.

- [ ] **Step 1: Escrever o teste que falha**

Acrescentar ao final de `transaction.mapper.spec.ts`. O arquivo já define a fixture `baseRow`
e importa `{ toView, TransactionRow }` — reaproveitar os dois, com o mesmo cast
`as unknown as TransactionRow` que o resto do arquivo usa:

```ts
describe('toView — reviewed', () => {
  it('emite reviewed no wire', () => {
    const row = { ...baseRow, reviewed: true } as unknown as TransactionRow;
    expect(toView(row).reviewed).toBe(true);
  });

  it('emite false quando a transação não foi conferida', () => {
    const row = { ...baseRow, reviewed: false } as unknown as TransactionRow;
    expect(toView(row).reviewed).toBe(false);
  });
});
```

> `TransactionRow` (não `PrismaTransaction`) é o tipo de linha que este mapper declara, em
> `transaction.mapper.ts`. Ele precisa ganhar `reviewed: boolean` no Step 4, senão o cast
> esconde a falta do campo e o teste passa por acidente.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx nx test api-financial --testPathPattern=transaction.mapper`
Expected: FAIL — `reviewed` ausente.

- [ ] **Step 3: Acrescentar ao contrato de domínio**

Em `transaction.repository.ts`, dentro de `TransactionView`, após `recurring`:

```ts
  reviewed: boolean;
```

- [ ] **Step 4: Acrescentar ao tipo de linha e ao mapper**

Em `transaction.mapper.ts`, acrescentar ao tipo `TransactionRow`:

```ts
  reviewed: boolean;
```

E, na construção do objeto retornado por `toView`:

```ts
    reviewed: r.reviewed,
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx nx test api-financial --testPathPattern=transaction`
Expected: PASS.

- [ ] **Step 6: Gate e commit**

Run: `npx nx test api-financial && npx nx build api-financial`

```bash
git add apps/api-financial/src/modules/ledger/transaction/
git commit -m "feat(api-financial): expose transaction reviewed on the wire"
```

---

### Task 4: Guarda de corpo vazio

**Files:**
- Create: `apps/api-financial/src/infrastructure/http/require-non-empty-patch.ts`
- Create: `apps/api-financial/src/infrastructure/http/require-non-empty-patch.spec.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `requireNonEmptyPatch<T extends object>(dto: T): T` — devolve o dto ou lança
  `BadRequestException`. Usado pelos controllers das Tasks 5, 6, 8, 10, 11.

- [ ] **Step 1: Escrever o teste que falha**

```ts
import { BadRequestException } from '@nestjs/common';
import { requireNonEmptyPatch } from './require-non-empty-patch';

describe('requireNonEmptyPatch', () => {
  it('devolve o dto quando há ao menos um campo', () => {
    const dto = { label: 'Casa' };
    expect(requireNonEmptyPatch(dto)).toBe(dto);
  });

  it('rejeita corpo vazio', () => {
    expect(() => requireNonEmptyPatch({})).toThrow(BadRequestException);
  });

  it('aceita campo com valor falsy', () => {
    // budget: 0 é uma edição legítima e não pode ser confundida com corpo vazio
    expect(() => requireNonEmptyPatch({ budget: 0 })).not.toThrow();
  });

  it('aceita campo explicitamente nulo', () => {
    expect(() => requireNonEmptyPatch({ note: null })).not.toThrow();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx nx test api-financial --testPathPattern=require-non-empty`
Expected: FAIL — `Cannot find module './require-non-empty-patch'`.

- [ ] **Step 3: Implementar**

```ts
import { BadRequestException } from '@nestjs/common';

/**
 * O ValidationPipe global já roda com `forbidNonWhitelisted`, então campo com
 * nome errado devolve 400 sozinho. O que sobra é o corpo genuinamente vazio,
 * que passaria como `{}` e viraria um no-op com 200.
 */
export function requireNonEmptyPatch<T extends object>(dto: T): T {
  if (Object.keys(dto).length === 0) {
    throw new BadRequestException('Informe ao menos um campo para alterar');
  }
  return dto;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx nx test api-financial --testPathPattern=require-non-empty`
Expected: PASS, 4 testes.

- [ ] **Step 5: Commit**

```bash
git add apps/api-financial/src/infrastructure/http/
git commit -m "feat(api-financial): reject empty PATCH bodies"
```

---

### Task 5: `PATCH /goals/:slug`

**Files:**
- Modify: `apps/api-financial/src/modules/goals/goal/domain/goal.repository.ts`
- Create: `apps/api-financial/src/modules/goals/goal/application/update-goal.usecase.ts`
- Create: `apps/api-financial/src/modules/goals/goal/application/update-goal.usecase.spec.ts`
- Modify: `apps/api-financial/src/modules/goals/goal/infrastructure/goal.prisma.repository.ts`
- Modify: `apps/api-financial/src/modules/goals/goal/infrastructure/goal.prisma.repository.spec.ts`
- Create: `apps/api-financial/src/modules/goals/goal/interface/dto/update-goal.dto.ts`
- Modify: `apps/api-financial/src/modules/goals/goal/interface/goal.controller.ts`
- Modify: `apps/api-financial/src/modules/goals/goals.module.ts`

**Interfaces:**
- Consumes: `requireNonEmptyPatch` (Task 4).
- Produces: `UpdateGoalData`, `GoalRepository.update(slug, data): Promise<GoalView | null>`,
  `UpdateGoalUseCase.execute(slug, data): Promise<GoalView>`.

- [ ] **Step 1: Escrever o teste do use case**

`update-goal.usecase.spec.ts`:

```ts
import { NotFoundException } from '@nestjs/common';
import { UpdateGoalUseCase } from './update-goal.usecase';

const view = { id: 'g1', slug: 'sos', label: 'Reserva', target: 30000, monthly: 800,
  color: '#0B6E2F', subtitle: 'emergência', type: 'EMERGENCIA' as const, balance: 0, history: [] };

function setup(result: typeof view | null) {
  const repo = { update: jest.fn(async () => result) };
  return { uc: new UpdateGoalUseCase(repo as never), repo };
}

describe('UpdateGoalUseCase', () => {
  it('devolve a meta atualizada', async () => {
    const { uc } = setup(view);
    await expect(uc.execute('sos', { label: 'Reserva' })).resolves.toMatchObject({ slug: 'sos' });
  });

  it('repassa slug e dados ao repositório', async () => {
    const { uc, repo } = setup(view);
    await uc.execute('sos', { monthly: 900 });
    expect(repo.update).toHaveBeenCalledWith('sos', { monthly: 900 });
  });

  it('lança 404 quando a meta não existe', async () => {
    const { uc } = setup(null);
    await expect(uc.execute('nao-existe', { label: 'x' })).rejects.toThrow(NotFoundException);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx nx test api-financial --testPathPattern=update-goal`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Porta do repositório**

Em `goal.repository.ts`, acrescentar:

```ts
export interface UpdateGoalData {
  label?: string;
  target?: number;
  monthly?: number;
  color?: string;
  subtitle?: string;
  type?: 'SONHO' | 'EMERGENCIA';
}
```

E ao `abstract class GoalRepository`:

```ts
  abstract update(slug: string, data: UpdateGoalData): Promise<GoalView | null>;
```

- [ ] **Step 4: Use case**

`update-goal.usecase.ts`:

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { GoalRepository, UpdateGoalData } from '../domain/goal.repository';

@Injectable()
export class UpdateGoalUseCase {
  constructor(private readonly repo: GoalRepository) {}

  async execute(slug: string, data: UpdateGoalData) {
    const updated = await this.repo.update(slug, data);
    if (!updated) throw new NotFoundException(`Meta ${slug} não encontrada`);
    return updated;
  }
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx nx test api-financial --testPathPattern=update-goal`
Expected: PASS, 3 testes.

- [ ] **Step 6: Teste do repositório Prisma**

Acrescentar a `goal.prisma.repository.spec.ts`:

```ts
describe('GoalPrismaRepository.update', () => {
  function setupUpdate(found: { id: string } | null) {
    const prisma = {
      goal: {
        findFirst: jest.fn(async () => found),
        update: jest.fn(async () => ({
          id: 'cuid-1', slug: 'sos', label: 'Reserva', target: 30000, monthly: 900,
          color: '#0B6E2F', subtitle: 'emergência', type: 'EMERGENCIA', householdId: 'h1',
        })),
        findMany: jest.fn(async () => []),
      },
      goalContribution: { findMany: jest.fn(async () => []) },
    };
    const repo = new GoalPrismaRepository(prisma as never, { householdId: 'h1' } as never);
    return { repo, prisma };
  }

  it('escopa a busca ao household', async () => {
    const { repo, prisma } = setupUpdate({ id: 'cuid-1' });
    await repo.update('sos', { monthly: 900 });
    expect(prisma.goal.findFirst.mock.calls[0][0].where).toMatchObject({
      householdId: 'h1', slug: 'sos',
    });
  });

  it('devolve null para meta de outro household', async () => {
    const { repo, prisma } = setupUpdate(null);
    await expect(repo.update('sos', { monthly: 900 })).resolves.toBeNull();
    expect(prisma.goal.update).not.toHaveBeenCalled();
  });

  it('não deixa o slug ser alterado', async () => {
    const { repo, prisma } = setupUpdate({ id: 'cuid-1' });
    await repo.update('sos', { label: 'Novo' } as never);
    expect(prisma.goal.update.mock.calls[0][0].data).not.toHaveProperty('slug');
  });
});
```

- [ ] **Step 7: Implementar no repositório Prisma**

Em `goal.prisma.repository.ts`, acrescentar (e importar `UpdateGoalData`):

```ts
  async update(slug: string, data: UpdateGoalData): Promise<GoalView | null> {
    const existing = await this.prisma.goal.findFirst({ where: this.scoped({ slug }) });
    if (!existing) return null;
    await this.prisma.goal.update({
      where: { id: existing.id },
      data: {
        label: data.label,
        target: data.target,
        monthly: data.monthly,
        color: data.color,
        subtitle: data.subtitle,
        type: data.type,
      },
    });
    // Relê pela via de leitura: GoalView carrega balance e history, que o
    // update não devolve.
    const all = await this.findAll();
    return all.find((g) => g.slug === slug) ?? null;
  }
```

Campos `undefined` são ignorados pelo Prisma, então o `PATCH` parcial funciona sem montar o
objeto condicionalmente. O `slug` não aparece no `data` — é o que o teste do Step 6 trava.

- [ ] **Step 8: DTO**

`update-goal.dto.ts`:

```ts
import { IsHexColor, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateGoalDto {
  @IsOptional() @IsString() label?: string;
  @IsOptional() @IsNumber() @Min(0) target?: number;
  @IsOptional() @IsNumber() @Min(0) monthly?: number;
  @IsOptional() @IsHexColor() color?: string;
  @IsOptional() @IsString() subtitle?: string;
  @IsOptional() @IsIn(['SONHO', 'EMERGENCIA']) type?: 'SONHO' | 'EMERGENCIA';
}
```

- [ ] **Step 9: Controller**

Em `goal.controller.ts`, injetar `UpdateGoalUseCase` no construtor e acrescentar:

```ts
  @Patch(':slug')
  @Roles('admin', 'editor')
  update(@Param('slug') slug: string, @Body() dto: UpdateGoalDto) {
    return this.updateUc.execute(slug, requireNonEmptyPatch(dto));
  }
```

Importar `Patch` e `Param` de `@nestjs/common`, `UpdateGoalDto` e `requireNonEmptyPatch`
(`../../../../infrastructure/http/require-non-empty-patch`).

- [ ] **Step 10: Registrar no módulo**

Em `goals.module.ts`, acrescentar `UpdateGoalUseCase` ao array `providers`.

- [ ] **Step 11: Gate e commit**

Run: `npx nx test api-financial && npx nx build api-financial`

```bash
git add apps/api-financial/src/modules/goals/
git commit -m "feat(api-financial): add PATCH /goals/:slug"
```

---

### Task 6: `PATCH /categories/:slug`

**Files:**
- Modify: `apps/api-financial/src/modules/catalog/category/domain/category.repository.ts`
- Create: `apps/api-financial/src/modules/catalog/category/application/update-category.usecase.ts`
- Create: `apps/api-financial/src/modules/catalog/category/application/update-category.usecase.spec.ts`
- Modify: `apps/api-financial/src/modules/catalog/category/infrastructure/category.prisma.repository.ts`
- Create: `apps/api-financial/src/modules/catalog/category/infrastructure/category.prisma.repository.spec.ts`
- Create: `apps/api-financial/src/modules/catalog/category/interface/dto/update-category.dto.ts`
- Modify: `apps/api-financial/src/modules/catalog/category/interface/category.controller.ts`
- Modify: `apps/api-financial/src/modules/catalog/catalog.module.ts`

**Interfaces:**
- Consumes: `requireNonEmptyPatch` (Task 4), `Category` com `order` (Task 2).
- Produces: `UpdateCategoryData`, `CategoryRepository.update(slug, data): Promise<Category | null>`,
  `UpdateCategoryUseCase.execute(slug, data): Promise<Category>`.

- [ ] **Step 1: Escrever o teste do use case**

`update-category.usecase.spec.ts`:

```ts
import { NotFoundException } from '@nestjs/common';
import { UpdateCategoryUseCase } from './update-category.usecase';
import { Category } from '../domain/category.entity';

const cat = new Category({ id: 'c1', slug: 'casa', label: 'Casa', color: '#7A4F1D', budget: 500, order: 1 });

function setup(result: Category | null) {
  const repo = { update: jest.fn(async () => result) };
  return { uc: new UpdateCategoryUseCase(repo as never), repo };
}

describe('UpdateCategoryUseCase', () => {
  it('devolve a categoria atualizada', async () => {
    const { uc } = setup(cat);
    await expect(uc.execute('casa', { budget: 600 })).resolves.toBe(cat);
  });

  it('lança 404 quando a categoria não existe', async () => {
    const { uc } = setup(null);
    await expect(uc.execute('nada', { budget: 1 })).rejects.toThrow(NotFoundException);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx nx test api-financial --testPathPattern=update-category`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Porta do repositório**

Em `category.repository.ts`, acrescentar:

```ts
export interface UpdateCategoryData {
  label?: string;
  color?: string;
  budget?: number;
}
```

E ao `abstract class CategoryRepository`:

```ts
  abstract update(slug: string, data: UpdateCategoryData): Promise<Category | null>;
```

- [ ] **Step 4: Use case**

`update-category.usecase.ts`:

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { CategoryRepository, UpdateCategoryData } from '../domain/category.repository';

@Injectable()
export class UpdateCategoryUseCase {
  constructor(private readonly repo: CategoryRepository) {}

  async execute(slug: string, data: UpdateCategoryData) {
    const updated = await this.repo.update(slug, data);
    if (!updated) throw new NotFoundException(`Categoria ${slug} não encontrada`);
    return updated;
  }
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx nx test api-financial --testPathPattern=update-category`
Expected: PASS, 2 testes.

- [ ] **Step 6: Teste do repositório Prisma**

`category.prisma.repository.spec.ts`:

```ts
import { CategoryPrismaRepository } from './category.prisma.repository';

const row = { id: 'c1', householdId: 'h1', slug: 'casa', label: 'Casa',
  color: '#7A4F1D', budget: 500, order: 1 };

function setup(found: typeof row | null = row) {
  const prisma = {
    category: {
      findFirst: jest.fn(async () => found),
      update: jest.fn(async () => ({ ...row, budget: 600 })),
      findMany: jest.fn(async () => [row]),
    },
  };
  const repo = new CategoryPrismaRepository(prisma as never, { householdId: 'h1' } as never);
  return { repo, prisma };
}

describe('CategoryPrismaRepository.update', () => {
  it('escopa a busca ao household', async () => {
    const { repo, prisma } = setup();
    await repo.update('casa', { budget: 600 });
    expect(prisma.category.findFirst.mock.calls[0][0].where).toMatchObject({
      householdId: 'h1', slug: 'casa',
    });
  });

  it('devolve null para categoria de outro household', async () => {
    const { repo, prisma } = setup(null);
    await expect(repo.update('casa', { budget: 600 })).resolves.toBeNull();
    expect(prisma.category.update).not.toHaveBeenCalled();
  });

  it('não deixa slug nem order serem alterados por aqui', async () => {
    const { repo, prisma } = setup();
    await repo.update('casa', { label: 'Lar' } as never);
    const data = prisma.category.update.mock.calls[0][0].data;
    expect(data).not.toHaveProperty('slug');
    expect(data).not.toHaveProperty('order');
  });
});

describe('CategoryPrismaRepository.findAll', () => {
  it('ordena por order, com label como desempate', async () => {
    const { repo, prisma } = setup();
    await repo.findAll();
    expect(prisma.category.findMany.mock.calls[0][0].orderBy).toEqual([
      { order: 'asc' }, { label: 'asc' },
    ]);
  });
});
```

- [ ] **Step 7: Implementar no repositório Prisma**

Em `category.prisma.repository.ts`, acrescentar (e importar `UpdateCategoryData`):

```ts
  async update(slug: string, data: UpdateCategoryData): Promise<Category | null> {
    const existing = await this.prisma.category.findFirst({ where: this.scoped({ slug }) });
    if (!existing) return null;
    const row = await this.prisma.category.update({
      where: { id: existing.id },
      data: { label: data.label, color: data.color, budget: data.budget },
    });
    return toDomain(row);
  }
```

`order` fica de fora de propósito: quem muda ordem é o endpoint da Task 8.

- [ ] **Step 8: DTO**

`update-category.dto.ts`:

```ts
import { IsHexColor, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateCategoryDto {
  @IsOptional() @IsString() label?: string;
  @IsOptional() @IsHexColor() color?: string;
  @IsOptional() @IsNumber() @Min(0) budget?: number;
}
```

- [ ] **Step 9: Controller**

Em `category.controller.ts`, injetar `UpdateCategoryUseCase` e acrescentar:

```ts
  @Patch(':slug')
  @Roles('admin', 'editor')
  async update(@Param('slug') slug: string, @Body() dto: UpdateCategoryDto) {
    return (await this.updateUc.execute(slug, requireNonEmptyPatch(dto))).toJSON();
  }
```

- [ ] **Step 10: Registrar no módulo**

Em `catalog.module.ts`, acrescentar `UpdateCategoryUseCase` aos `providers`.

- [ ] **Step 11: Gate e commit**

Run: `npx nx test api-financial && npx nx build api-financial`

```bash
git add apps/api-financial/src/modules/catalog/
git commit -m "feat(api-financial): add PATCH /categories/:slug"
```

---

### Task 7: `DELETE /categories/:slug` com 409

**Files:**
- Modify: `apps/api-financial/src/modules/catalog/category/domain/category.repository.ts`
- Create: `apps/api-financial/src/modules/catalog/category/application/remove-category.usecase.ts`
- Create: `apps/api-financial/src/modules/catalog/category/application/remove-category.usecase.spec.ts`
- Modify: `apps/api-financial/src/modules/catalog/category/infrastructure/category.prisma.repository.ts`
- Modify: `apps/api-financial/src/modules/catalog/category/infrastructure/category.prisma.repository.spec.ts`
- Modify: `apps/api-financial/src/modules/catalog/category/interface/category.controller.ts`
- Modify: `apps/api-financial/src/modules/catalog/catalog.module.ts`

**Interfaces:**
- Consumes: nada da Task 6.
- Produces: `CategoryUsage`, `CategoryRepository.countUsage(slug)`,
  `CategoryRepository.remove(slug)`, `RemoveCategoryUseCase.execute(slug): Promise<void>`.

- [ ] **Step 1: Escrever o teste do use case**

`remove-category.usecase.spec.ts`:

```ts
import { ConflictException, NotFoundException } from '@nestjs/common';
import { RemoveCategoryUseCase } from './remove-category.usecase';

function setup(usage: { transactions: number; fixedExpenses: number } | null) {
  const repo = { countUsage: jest.fn(async () => usage), remove: jest.fn(async () => true) };
  return { uc: new RemoveCategoryUseCase(repo as never), repo };
}

describe('RemoveCategoryUseCase', () => {
  it('exclui categoria sem vínculo', async () => {
    const { uc, repo } = setup({ transactions: 0, fixedExpenses: 0 });
    await uc.execute('casa');
    expect(repo.remove).toHaveBeenCalledWith('casa');
  });

  it('lança 404 quando a categoria não existe', async () => {
    const { uc, repo } = setup(null);
    await expect(uc.execute('nada')).rejects.toThrow(NotFoundException);
    expect(repo.remove).not.toHaveBeenCalled();
  });

  it('lança 409 quando há transação vinculada', async () => {
    const { uc, repo } = setup({ transactions: 3, fixedExpenses: 0 });
    await expect(uc.execute('casa')).rejects.toThrow(ConflictException);
    expect(repo.remove).not.toHaveBeenCalled();
  });

  it('lança 409 quando há gasto fixo vinculado', async () => {
    const { uc } = setup({ transactions: 0, fixedExpenses: 1 });
    await expect(uc.execute('casa')).rejects.toThrow(ConflictException);
  });

  it('devolve as contagens no corpo do 409', async () => {
    const { uc } = setup({ transactions: 3, fixedExpenses: 1 });
    await expect(uc.execute('casa')).rejects.toMatchObject({
      response: expect.objectContaining({ transactions: 3, fixedExpenses: 1 }),
    });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx nx test api-financial --testPathPattern=remove-category`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Porta do repositório**

Em `category.repository.ts`, acrescentar:

```ts
export interface CategoryUsage {
  transactions: number;
  fixedExpenses: number;
}
```

E ao `abstract class CategoryRepository`:

```ts
  /** `null` quando a categoria não existe neste household. */
  abstract countUsage(slug: string): Promise<CategoryUsage | null>;
  /** `false` quando a categoria não existe neste household. */
  abstract remove(slug: string): Promise<boolean>;
```

- [ ] **Step 4: Use case**

`remove-category.usecase.ts`:

```ts
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CategoryRepository } from '../domain/category.repository';

@Injectable()
export class RemoveCategoryUseCase {
  constructor(private readonly repo: CategoryRepository) {}

  async execute(slug: string): Promise<void> {
    const usage = await this.repo.countUsage(slug);
    if (!usage) throw new NotFoundException(`Categoria ${slug} não encontrada`);
    if (usage.transactions > 0 || usage.fixedExpenses > 0) {
      // Category.id é FK obrigatória em Transaction e FixedExpense: excluir
      // exigiria reescrever lançamentos históricos. A UI explica com a contagem.
      throw new ConflictException({
        message: 'Categoria em uso',
        transactions: usage.transactions,
        fixedExpenses: usage.fixedExpenses,
      });
    }
    await this.repo.remove(slug);
  }
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx nx test api-financial --testPathPattern=remove-category`
Expected: PASS, 5 testes.

- [ ] **Step 6: Teste do repositório Prisma**

Acrescentar a `category.prisma.repository.spec.ts`:

```ts
describe('CategoryPrismaRepository.countUsage', () => {
  function setupUsage(found: { id: string } | null, tx = 0, fx = 0) {
    const prisma = {
      category: { findFirst: jest.fn(async () => found), delete: jest.fn(async () => undefined) },
      transaction: { count: jest.fn(async () => tx) },
      fixedExpense: { count: jest.fn(async () => fx) },
    };
    const repo = new CategoryPrismaRepository(prisma as never, { householdId: 'h1' } as never);
    return { repo, prisma };
  }

  it('conta transações e gastos fixos da categoria', async () => {
    const { repo } = setupUsage({ id: 'c1' }, 3, 1);
    await expect(repo.countUsage('casa')).resolves.toEqual({ transactions: 3, fixedExpenses: 1 });
  });

  it('escopa as contagens ao household', async () => {
    const { repo, prisma } = setupUsage({ id: 'c1' }, 0, 0);
    await repo.countUsage('casa');
    expect(prisma.transaction.count.mock.calls[0][0].where).toMatchObject({ householdId: 'h1' });
    expect(prisma.fixedExpense.count.mock.calls[0][0].where).toMatchObject({ householdId: 'h1' });
  });

  it('devolve null para categoria de outro household', async () => {
    const { repo } = setupUsage(null);
    await expect(repo.countUsage('casa')).resolves.toBeNull();
  });

  it('remove devolve false para categoria de outro household', async () => {
    const { repo, prisma } = setupUsage(null);
    await expect(repo.remove('casa')).resolves.toBe(false);
    expect(prisma.category.delete).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 7: Implementar no repositório Prisma**

Em `category.prisma.repository.ts`:

```ts
  async countUsage(slug: string): Promise<CategoryUsage | null> {
    const existing = await this.prisma.category.findFirst({ where: this.scoped({ slug }) });
    if (!existing) return null;
    const [transactions, fixedExpenses] = await Promise.all([
      this.prisma.transaction.count({ where: this.scoped({ categoryId: existing.id }) }),
      this.prisma.fixedExpense.count({ where: this.scoped({ categoryId: existing.id }) }),
    ]);
    return { transactions, fixedExpenses };
  }

  async remove(slug: string): Promise<boolean> {
    const existing = await this.prisma.category.findFirst({ where: this.scoped({ slug }) });
    if (!existing) return false;
    await this.prisma.category.delete({ where: { id: existing.id } });
    return true;
  }
```

- [ ] **Step 8: Controller**

Em `category.controller.ts`, injetar `RemoveCategoryUseCase` e acrescentar:

```ts
  @Delete(':slug')
  @Roles('admin', 'editor')
  @HttpCode(204)
  async remove(@Param('slug') slug: string) {
    await this.removeUc.execute(slug);
  }
```

Importar `Delete` e `HttpCode` de `@nestjs/common`.

- [ ] **Step 9: Registrar no módulo**

Em `catalog.module.ts`, acrescentar `RemoveCategoryUseCase` aos `providers`.

- [ ] **Step 10: Gate e commit**

Run: `npx nx test api-financial && npx nx build api-financial`

```bash
git add apps/api-financial/src/modules/catalog/
git commit -m "feat(api-financial): add DELETE /categories/:slug, blocked when in use"
```

---

### Task 8: `PATCH /categories/order`

**Files:**
- Modify: `apps/api-financial/src/modules/catalog/category/domain/category.repository.ts`
- Create: `apps/api-financial/src/modules/catalog/category/application/reorder-categories.usecase.ts`
- Create: `apps/api-financial/src/modules/catalog/category/application/reorder-categories.usecase.spec.ts`
- Modify: `apps/api-financial/src/modules/catalog/category/infrastructure/category.prisma.repository.ts`
- Modify: `apps/api-financial/src/modules/catalog/category/infrastructure/category.prisma.repository.spec.ts`
- Create: `apps/api-financial/src/modules/catalog/category/interface/dto/reorder-categories.dto.ts`
- Modify: `apps/api-financial/src/modules/catalog/category/interface/category.controller.ts`
- Modify: `apps/api-financial/src/modules/catalog/catalog.module.ts`

**Interfaces:**
- Consumes: `CategoryRepository.findAll()` (existente).
- Produces: `CategoryRepository.reorder(slugs: string[]): Promise<Category[]>`,
  `ReorderCategoriesUseCase.execute(slugs): Promise<Category[]>`.

> **A rota `order` tem de ser declarada ANTES de `:slug` no controller.** Declarada depois, o
> Nest casa `order` como se fosse um slug e a reordenação vira um `PATCH` de categoria
> inexistente.

- [ ] **Step 1: Escrever o teste do use case**

`reorder-categories.usecase.spec.ts`:

```ts
import { BadRequestException } from '@nestjs/common';
import { ReorderCategoriesUseCase } from './reorder-categories.usecase';
import { Category } from '../domain/category.entity';

const make = (slug: string, order: number) =>
  new Category({ id: slug, slug, label: slug, color: '#000000', budget: 0, order });

function setup() {
  const all = [make('casa', 1), make('lazer', 2), make('saude', 3)];
  const repo = { findAll: jest.fn(async () => all), reorder: jest.fn(async () => all) };
  return { uc: new ReorderCategoriesUseCase(repo as never), repo };
}

describe('ReorderCategoriesUseCase', () => {
  it('aplica a ordem quando a lista bate exatamente', async () => {
    const { uc, repo } = setup();
    await uc.execute(['saude', 'casa', 'lazer']);
    expect(repo.reorder).toHaveBeenCalledWith(['saude', 'casa', 'lazer']);
  });

  it('rejeita lista faltando uma categoria', async () => {
    const { uc, repo } = setup();
    await expect(uc.execute(['casa', 'lazer'])).rejects.toThrow(BadRequestException);
    expect(repo.reorder).not.toHaveBeenCalled();
  });

  it('rejeita lista com slug desconhecido', async () => {
    const { uc, repo } = setup();
    await expect(uc.execute(['casa', 'lazer', 'saude', 'zzz'])).rejects.toThrow(BadRequestException);
    expect(repo.reorder).not.toHaveBeenCalled();
  });

  it('rejeita lista com slug repetido', async () => {
    // mesmo tamanho do conjunto, mas grava ordem inconsistente se passar
    const { uc, repo } = setup();
    await expect(uc.execute(['casa', 'casa', 'lazer'])).rejects.toThrow(BadRequestException);
    expect(repo.reorder).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx nx test api-financial --testPathPattern=reorder-categories`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Porta do repositório**

Em `category.repository.ts`, acrescentar ao `abstract class CategoryRepository`:

```ts
  abstract reorder(slugs: string[]): Promise<Category[]>;
```

- [ ] **Step 4: Use case**

`reorder-categories.usecase.ts`:

```ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { CategoryRepository } from '../domain/category.repository';

@Injectable()
export class ReorderCategoriesUseCase {
  constructor(private readonly repo: CategoryRepository) {}

  async execute(slugs: string[]) {
    const current = (await this.repo.findAll()).map((c) => c.toJSON().slug);
    const unique = new Set(slugs);
    // Repetido, faltando ou desconhecido: qualquer um grava ordem parcial.
    const matches =
      unique.size === slugs.length &&
      slugs.length === current.length &&
      current.every((s) => unique.has(s));
    if (!matches) {
      throw new BadRequestException(
        'A lista deve conter exatamente todas as categorias, sem repetição',
      );
    }
    return this.repo.reorder(slugs);
  }
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx nx test api-financial --testPathPattern=reorder-categories`
Expected: PASS, 4 testes.

- [ ] **Step 6: Teste do repositório Prisma**

Acrescentar a `category.prisma.repository.spec.ts`:

```ts
describe('CategoryPrismaRepository.reorder', () => {
  function setupReorder() {
    const updateMany = jest.fn(async () => ({ count: 1 }));
    const prisma = {
      category: { updateMany, findMany: jest.fn(async () => []) },
      $transaction: jest.fn(async (ops: unknown[]) => ops),
    };
    const repo = new CategoryPrismaRepository(prisma as never, { householdId: 'h1' } as never);
    return { repo, prisma, updateMany };
  }

  it('grava a posição de cada slug numa transação', async () => {
    const { repo, prisma, updateMany } = setupReorder();
    await repo.reorder(['saude', 'casa']);
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(updateMany).toHaveBeenNthCalledWith(1, {
      where: { householdId: 'h1', slug: 'saude' },
      data: { order: 1 },
    });
    expect(updateMany).toHaveBeenNthCalledWith(2, {
      where: { householdId: 'h1', slug: 'casa' },
      data: { order: 2 },
    });
  });
});
```

- [ ] **Step 7: Implementar no repositório Prisma**

Em `category.prisma.repository.ts`:

```ts
  async reorder(slugs: string[]): Promise<Category[]> {
    // updateMany já escopado por household: um slug de outro household
    // simplesmente não casa nenhuma linha.
    await this.prisma.$transaction(
      slugs.map((slug, i) =>
        this.prisma.category.updateMany({
          where: this.scoped({ slug }),
          data: { order: i + 1 },
        }),
      ),
    );
    return this.findAll();
  }
```

- [ ] **Step 8: DTO**

`reorder-categories.dto.ts`:

```ts
import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class ReorderCategoriesDto {
  @IsArray() @ArrayNotEmpty() @IsString({ each: true }) slugs!: string[];
}
```

- [ ] **Step 9: Controller — antes de `:slug`**

Em `category.controller.ts`, injetar `ReorderCategoriesUseCase` e acrescentar o método
**acima** do `@Patch(':slug')` da Task 6:

```ts
  // Precisa vir antes de @Patch(':slug'), senão o Nest casa 'order' como slug.
  @Patch('order')
  @Roles('admin', 'editor')
  async reorder(@Body() dto: ReorderCategoriesDto) {
    return (await this.reorderUc.execute(dto.slugs)).map((c) => c.toJSON());
  }
```

- [ ] **Step 10: Registrar no módulo**

Em `catalog.module.ts`, acrescentar `ReorderCategoriesUseCase` aos `providers`.

- [ ] **Step 11: Verificar a ordem de rota no app rodando**

Com `npx nx serve api-financial` e um token válido:

```bash
curl -i -X PATCH http://localhost:3000/api/categories/order \
  -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN" \
  -d '{"slugs":["casa"]}'
```

Expected: **400** com a mensagem da lista incompleta — o que prova que a rota `order` foi
atingida. Se vier **404 "Categoria order não encontrada"**, a rota está declarada depois de
`:slug`; mover para cima.

- [ ] **Step 12: Gate e commit**

Run: `npx nx test api-financial && npx nx build api-financial`

```bash
git add apps/api-financial/src/modules/catalog/
git commit -m "feat(api-financial): add PATCH /categories/order"
```

---

### Task 9: `PATCH /transactions/:id`

**Files:**
- Modify: `apps/api-financial/src/modules/ledger/transaction/domain/transaction.repository.ts`
- Create: `apps/api-financial/src/modules/ledger/transaction/application/update-transaction.usecase.ts`
- Create: `apps/api-financial/src/modules/ledger/transaction/application/update-transaction.usecase.spec.ts`
- Modify: `apps/api-financial/src/modules/ledger/transaction/infrastructure/transaction.prisma.repository.ts`
- Modify: `apps/api-financial/src/modules/ledger/transaction/infrastructure/transaction.prisma.repository.spec.ts`
- Create: `apps/api-financial/src/modules/ledger/transaction/interface/dto/update-transaction.dto.ts`
- Modify: `apps/api-financial/src/modules/ledger/transaction/interface/transaction.controller.ts`
- Modify: `apps/api-financial/src/modules/ledger/ledger.module.ts`

**Interfaces:**
- Consumes: `requireNonEmptyPatch` (Task 4), `TransactionView.reviewed` (Task 3).
- Produces: `UpdateTransactionData`,
  `TransactionRepository.update(id, data): Promise<TransactionView | null>`,
  `UpdateTransactionUseCase.execute(id, data): Promise<TransactionView>`.

- [ ] **Step 1: Escrever o teste do use case**

`update-transaction.usecase.spec.ts`:

```ts
import { NotFoundException } from '@nestjs/common';
import { UpdateTransactionUseCase } from './update-transaction.usecase';

const view = {
  id: 't1', date: '2026-05-05', label: 'Mercado', value: 240, categorySlug: 'casa',
  holder: 'Mateus', method: 'PIX' as const, cardId: null, recurring: false,
  reviewed: true, installments: null,
};

function setup(result: typeof view | null) {
  const repo = { update: jest.fn(async () => result) };
  return { uc: new UpdateTransactionUseCase(repo as never), repo };
}

describe('UpdateTransactionUseCase', () => {
  it('devolve a transação atualizada', async () => {
    const { uc } = setup(view);
    await expect(uc.execute('t1', { reviewed: true })).resolves.toMatchObject({ reviewed: true });
  });

  it('repassa id e dados ao repositório', async () => {
    const { uc, repo } = setup(view);
    await uc.execute('t1', { label: 'Mercado Extra' });
    expect(repo.update).toHaveBeenCalledWith('t1', { label: 'Mercado Extra' });
  });

  it('lança 404 quando a transação não existe', async () => {
    const { uc } = setup(null);
    await expect(uc.execute('zzz', { reviewed: true })).rejects.toThrow(NotFoundException);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx nx test api-financial --testPathPattern=update-transaction`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Porta do repositório**

Em `transaction.repository.ts`, acrescentar:

```ts
export interface UpdateTransactionData {
  date?: string;
  label?: string;
  value?: number;
  categorySlug?: string;
  holder?: string;
  method?: 'PIX' | 'CARD';
  cardId?: string | null;
  note?: string;
  reviewed?: boolean;
}
```

E ao `abstract class TransactionRepository`:

```ts
  abstract update(id: string, data: UpdateTransactionData): Promise<TransactionView | null>;
```

`installments` fica de fora de propósito — parcelamento é fatia própria (spec §1).

- [ ] **Step 4: Use case**

`update-transaction.usecase.ts`:

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { TransactionRepository, UpdateTransactionData } from '../domain/transaction.repository';

@Injectable()
export class UpdateTransactionUseCase {
  constructor(private readonly repo: TransactionRepository) {}

  async execute(id: string, data: UpdateTransactionData) {
    const updated = await this.repo.update(id, data);
    if (!updated) throw new NotFoundException(`Transação ${id} não encontrada`);
    return updated;
  }
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx nx test api-financial --testPathPattern=update-transaction`
Expected: PASS, 3 testes.

- [ ] **Step 6: Teste do repositório Prisma**

Acrescentar a `transaction.prisma.repository.spec.ts`:

```ts
describe('TransactionPrismaRepository.update', () => {
  function setupUpdate(found: { id: string } | null) {
    const updated = {
      id: 't1', householdId: 'h1', date: new Date('2026-05-05'), label: 'Mercado',
      value: 240, categoryId: 'c1', memberId: 'm1', method: 'PIX', cardId: null,
      note: null, recurring: false, reviewed: true, fixedExpenseId: null,
      installmentId: null, category: { slug: 'casa' }, member: { name: 'Mateus' },
      installment: null,
    };
    const prisma = {
      transaction: {
        findFirst: jest.fn(async () => found),
        update: jest.fn(async () => updated),
      },
      category: { findFirst: jest.fn(async () => ({ id: 'c2' })) },
      member: { findFirst: jest.fn(async () => ({ id: 'm2' })) },
    };
    const repo = new TransactionPrismaRepository(prisma as never, { householdId: 'h1' } as never);
    return { repo, prisma };
  }

  it('escopa a busca ao household', async () => {
    const { repo, prisma } = setupUpdate({ id: 't1' });
    await repo.update('t1', { reviewed: true });
    expect(prisma.transaction.findFirst.mock.calls[0][0].where).toMatchObject({
      householdId: 'h1', id: 't1',
    });
  });

  it('devolve null para transação de outro household', async () => {
    const { repo, prisma } = setupUpdate(null);
    await expect(repo.update('t1', { reviewed: true })).resolves.toBeNull();
    expect(prisma.transaction.update).not.toHaveBeenCalled();
  });

  it('resolve categorySlug para categoryId', async () => {
    const { repo, prisma } = setupUpdate({ id: 't1' });
    await repo.update('t1', { categorySlug: 'lazer' });
    expect(prisma.transaction.update.mock.calls[0][0].data).toMatchObject({ categoryId: 'c2' });
  });

  it('resolve holder para memberId', async () => {
    const { repo, prisma } = setupUpdate({ id: 't1' });
    await repo.update('t1', { holder: 'Thais' });
    expect(prisma.transaction.update.mock.calls[0][0].data).toMatchObject({ memberId: 'm2' });
  });

  it('trata shared como sem membro', async () => {
    const { repo, prisma } = setupUpdate({ id: 't1' });
    await repo.update('t1', { holder: 'shared' });
    expect(prisma.transaction.update.mock.calls[0][0].data).toMatchObject({ memberId: null });
  });

  it('não deixa parcelamento ser alterado por aqui', async () => {
    const { repo, prisma } = setupUpdate({ id: 't1' });
    await repo.update('t1', { label: 'x' } as never);
    expect(prisma.transaction.update.mock.calls[0][0].data).not.toHaveProperty('installmentId');
  });
});
```

- [ ] **Step 7: Implementar no repositório Prisma**

Em `transaction.prisma.repository.ts`, acrescentar (e importar `UpdateTransactionData`):

```ts
  async update(id: string, data: UpdateTransactionData): Promise<TransactionView | null> {
    const existing = await this.prisma.transaction.findFirst({ where: this.scoped({ id }) });
    if (!existing) return null;

    let categoryId: string | undefined;
    if (data.categorySlug) {
      const category = await this.prisma.category.findFirst({
        where: this.scoped({ slug: data.categorySlug }),
      });
      if (!category) throw new BadRequestException(`Categoria ${data.categorySlug} não existe`);
      categoryId = category.id;
    }

    // `holder` é nome no wire (convenção do umbrella §2.1); 'shared' = sem membro.
    let memberId: string | null | undefined;
    if (data.holder !== undefined) {
      if (data.holder === 'shared') {
        memberId = null;
      } else {
        const member = await this.prisma.member.findFirst({
          where: this.scoped({ name: data.holder }),
        });
        if (!member) throw new BadRequestException(`Membro ${data.holder} não existe`);
        memberId = member.id;
      }
    }

    const row = await this.prisma.transaction.update({
      where: { id: existing.id },
      data: {
        date: data.date ? new Date(data.date) : undefined,
        label: data.label,
        value: data.value,
        categoryId,
        memberId,
        method: data.method,
        cardId: data.cardId,
        note: data.note,
        reviewed: data.reviewed,
      },
      include: INCLUDE,
    });
    return toView(row);
  }
```

Importar `BadRequestException` de `@nestjs/common`.

- [ ] **Step 8: DTO**

`update-transaction.dto.ts`:

```ts
import { IsBoolean, IsDateString, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateTransactionDto {
  @IsOptional() @IsDateString() date?: string;
  @IsOptional() @IsString() label?: string;
  @IsOptional() @IsNumber() value?: number;
  @IsOptional() @IsString() categorySlug?: string;
  @IsOptional() @IsString() holder?: string;
  @IsOptional() @IsIn(['PIX', 'CARD']) method?: 'PIX' | 'CARD';
  @IsOptional() @IsString() cardId?: string | null;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsBoolean() reviewed?: boolean;
}
```

- [ ] **Step 9: Controller**

Em `transaction.controller.ts`, injetar `UpdateTransactionUseCase` e acrescentar:

```ts
  @Patch(':id')
  @Roles('admin', 'editor')
  update(@Param('id') id: string, @Body() dto: UpdateTransactionDto) {
    return this.updateUc.execute(id, requireNonEmptyPatch(dto));
  }
```

- [ ] **Step 10: Registrar no módulo**

Em `ledger.module.ts`, acrescentar `UpdateTransactionUseCase` aos `providers`.

- [ ] **Step 11: Gate e commit**

Run: `npx nx test api-financial && npx nx build api-financial`

```bash
git add apps/api-financial/src/modules/ledger/
git commit -m "feat(api-financial): add PATCH /transactions/:id"
```

---

### Task 10: `DELETE /transactions/:id` responde 404

**Files:**
- Modify: `apps/api-financial/src/modules/ledger/transaction/domain/transaction.repository.ts`
- Modify: `apps/api-financial/src/modules/ledger/transaction/application/remove-transaction.usecase.ts`
- Create: `apps/api-financial/src/modules/ledger/transaction/application/remove-transaction.usecase.spec.ts`
- Modify: `apps/api-financial/src/modules/ledger/transaction/infrastructure/transaction.prisma.repository.ts:101-103`
- Modify: `apps/api-financial/src/modules/ledger/transaction/infrastructure/transaction.prisma.repository.spec.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `TransactionRepository.remove(id): Promise<boolean>` — **assinatura muda** de
  `Promise<void>`.

> Mudança de comportamento num endpoint existente, aprovada pelo usuário. Hoje o `deleteMany`
> responde 204 mesmo com id inexistente, e o cliente não distingue "excluí" de "não existia".
> Efeito no front (verificado): `AppDataService.removeTransaction:148` recarrega a lista no
> sucesso; com 404 o ramo de erro passa a mostrar o toast "Falha ao remover transação",
> alcançável só ao excluir um id já removido.

- [ ] **Step 1: Escrever o teste do use case**

`remove-transaction.usecase.spec.ts`:

```ts
import { NotFoundException } from '@nestjs/common';
import { RemoveTransactionUseCase } from './remove-transaction.usecase';

function setup(removed: boolean) {
  const repo = { remove: jest.fn(async () => removed) };
  return { uc: new RemoveTransactionUseCase(repo as never), repo };
}

describe('RemoveTransactionUseCase', () => {
  it('exclui a transação existente', async () => {
    const { uc, repo } = setup(true);
    await uc.execute('t1');
    expect(repo.remove).toHaveBeenCalledWith('t1');
  });

  it('lança 404 quando a transação não existe', async () => {
    // antes o deleteMany respondia 204 mesmo sem apagar nada
    const { uc } = setup(false);
    await expect(uc.execute('zzz')).rejects.toThrow(NotFoundException);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx nx test api-financial --testPathPattern=remove-transaction`
Expected: FAIL — o use case atual não lança nada.

- [ ] **Step 3: Porta do repositório**

Em `transaction.repository.ts`, trocar a assinatura:

```ts
  /** `false` quando o id não existe neste household. */
  abstract remove(id: string): Promise<boolean>;
```

- [ ] **Step 4: Use case**

`remove-transaction.usecase.ts` inteiro:

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { TransactionRepository } from '../domain/transaction.repository';

@Injectable()
export class RemoveTransactionUseCase {
  constructor(private readonly repo: TransactionRepository) {}

  async execute(id: string): Promise<void> {
    const removed = await this.repo.remove(id);
    if (!removed) throw new NotFoundException(`Transação ${id} não encontrada`);
  }
}
```

- [ ] **Step 5: Repositório Prisma**

Substituir o `remove` (linhas 101-103):

```ts
  async remove(id: string): Promise<boolean> {
    const { count } = await this.prisma.transaction.deleteMany({ where: this.scoped({ id }) });
    return count > 0;
  }
```

`deleteMany` continua sendo a forma certa — mantém o escopo de household no `where`. O que
muda é usar o `count` que ele já devolve.

- [ ] **Step 6: Teste do repositório Prisma**

Acrescentar a `transaction.prisma.repository.spec.ts`:

```ts
describe('TransactionPrismaRepository.remove', () => {
  function setupRemove(count: number) {
    const prisma = { transaction: { deleteMany: jest.fn(async () => ({ count })) } };
    const repo = new TransactionPrismaRepository(prisma as never, { householdId: 'h1' } as never);
    return { repo, prisma };
  }

  it('devolve true quando apagou', async () => {
    await expect(setupRemove(1).repo.remove('t1')).resolves.toBe(true);
  });

  it('devolve false quando não havia o que apagar', async () => {
    await expect(setupRemove(0).repo.remove('zzz')).resolves.toBe(false);
  });

  it('escopa a exclusão ao household', async () => {
    const { repo, prisma } = setupRemove(1);
    await repo.remove('t1');
    expect(prisma.transaction.deleteMany.mock.calls[0][0].where).toMatchObject({
      householdId: 'h1', id: 't1',
    });
  });
});
```

- [ ] **Step 7: Gate e commit**

Run: `npx nx test api-financial && npx nx build api-financial`

```bash
git add apps/api-financial/src/modules/ledger/
git commit -m "fix(api-financial): answer 404 when deleting a missing transaction"
```

---

### Task 11: `PATCH` e `DELETE /fixed-expenses/:id`

**Files:**
- Modify: `apps/api-financial/src/modules/budgeting/fixed-expense/domain/fixed-expense.repository.ts`
- Create: `apps/api-financial/src/modules/budgeting/fixed-expense/application/update-fixed-expense.usecase.ts`
- Create: `apps/api-financial/src/modules/budgeting/fixed-expense/application/update-fixed-expense.usecase.spec.ts`
- Create: `apps/api-financial/src/modules/budgeting/fixed-expense/application/remove-fixed-expense.usecase.ts`
- Create: `apps/api-financial/src/modules/budgeting/fixed-expense/application/remove-fixed-expense.usecase.spec.ts`
- Modify: `apps/api-financial/src/modules/budgeting/fixed-expense/infrastructure/fixed-expense.prisma.repository.ts`
- Create: `apps/api-financial/src/modules/budgeting/fixed-expense/infrastructure/fixed-expense.prisma.repository.spec.ts`
- Create: `apps/api-financial/src/modules/budgeting/fixed-expense/interface/dto/update-fixed-expense.dto.ts`
- Modify: `apps/api-financial/src/modules/budgeting/fixed-expense/interface/fixed-expense.controller.ts`
- Modify: `apps/api-financial/src/modules/budgeting/budgeting.module.ts`

**Interfaces:**
- Consumes: `requireNonEmptyPatch` (Task 4).
- Produces: `UpdateFixedExpenseData`,
  `FixedExpenseRepository.update(id, data, year, month): Promise<FixedExpenseView | null>`,
  `FixedExpenseRepository.remove(id): Promise<boolean>`,
  `UpdateFixedExpenseUseCase.execute(id, data): Promise<FixedExpenseView>`,
  `RemoveFixedExpenseUseCase.execute(id): Promise<void>`.

> `FixedExpenseView` carrega `paidThisMonth`, que depende de ano/mês. O `update` recebe o mês
> corrente para conseguir devolver a view completa; sem isso o `PATCH` não teria o que
> responder.

- [ ] **Step 1: Escrever os testes dos use cases**

`update-fixed-expense.usecase.spec.ts`:

```ts
import { NotFoundException } from '@nestjs/common';
import { UpdateFixedExpenseUseCase } from './update-fixed-expense.usecase';

const view = { id: 'f1', label: 'Luz', value: 200, dueDay: 10,
  categorySlug: 'casa', holder: 'shared', paidThisMonth: false };

function setup(result: typeof view | null) {
  const repo = { update: jest.fn(async () => result) };
  return { uc: new UpdateFixedExpenseUseCase(repo as never), repo };
}

describe('UpdateFixedExpenseUseCase', () => {
  it('devolve o gasto fixo atualizado', async () => {
    const { uc } = setup(view);
    await expect(uc.execute('f1', { value: 200 })).resolves.toMatchObject({ id: 'f1' });
  });

  it('lança 404 quando não existe', async () => {
    const { uc } = setup(null);
    await expect(uc.execute('zzz', { value: 1 })).rejects.toThrow(NotFoundException);
  });
});
```

`remove-fixed-expense.usecase.spec.ts`:

```ts
import { NotFoundException } from '@nestjs/common';
import { RemoveFixedExpenseUseCase } from './remove-fixed-expense.usecase';

function setup(removed: boolean) {
  const repo = { remove: jest.fn(async () => removed) };
  return { uc: new RemoveFixedExpenseUseCase(repo as never), repo };
}

describe('RemoveFixedExpenseUseCase', () => {
  it('exclui o gasto fixo existente', async () => {
    const { uc, repo } = setup(true);
    await uc.execute('f1');
    expect(repo.remove).toHaveBeenCalledWith('f1');
  });

  it('lança 404 quando não existe', async () => {
    const { uc } = setup(false);
    await expect(uc.execute('zzz')).rejects.toThrow(NotFoundException);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx nx test api-financial --testPathPattern=fixed-expense.usecase`
Expected: FAIL — módulos inexistentes.

- [ ] **Step 3: Porta do repositório**

Em `fixed-expense.repository.ts`, acrescentar:

```ts
export interface UpdateFixedExpenseData {
  label?: string;
  value?: number;
  dueDay?: number;
  categorySlug?: string;
  holder?: string;
}
```

E ao `abstract class FixedExpenseRepository`:

```ts
  abstract update(
    id: string,
    data: UpdateFixedExpenseData,
    year: number,
    month: number,
  ): Promise<FixedExpenseView | null>;
  /** `false` quando o id não existe neste household. */
  abstract remove(id: string): Promise<boolean>;
```

- [ ] **Step 4: Use cases**

`update-fixed-expense.usecase.ts`:

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import {
  FixedExpenseRepository,
  UpdateFixedExpenseData,
} from '../domain/fixed-expense.repository';

@Injectable()
export class UpdateFixedExpenseUseCase {
  constructor(private readonly repo: FixedExpenseRepository) {}

  async execute(id: string, data: UpdateFixedExpenseData) {
    // paidThisMonth é relativo ao mês corrente; a view devolvida usa "hoje".
    const now = new Date();
    const updated = await this.repo.update(id, data, now.getFullYear(), now.getMonth() + 1);
    if (!updated) throw new NotFoundException(`Gasto fixo ${id} não encontrado`);
    return updated;
  }
}
```

`remove-fixed-expense.usecase.ts`:

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { FixedExpenseRepository } from '../domain/fixed-expense.repository';

@Injectable()
export class RemoveFixedExpenseUseCase {
  constructor(private readonly repo: FixedExpenseRepository) {}

  async execute(id: string): Promise<void> {
    const removed = await this.repo.remove(id);
    if (!removed) throw new NotFoundException(`Gasto fixo ${id} não encontrado`);
  }
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx nx test api-financial --testPathPattern=fixed-expense.usecase`
Expected: PASS, 4 testes.

- [ ] **Step 6: Teste do repositório Prisma**

`fixed-expense.prisma.repository.spec.ts`:

```ts
import { FixedExpensePrismaRepository } from './fixed-expense.prisma.repository';

function setup(found: { id: string } | null) {
  const updateMany = jest.fn(async () => ({ count: 1 }));
  const deleteFn = jest.fn(async () => undefined);
  const prisma = {
    fixedExpense: {
      findFirst: jest.fn(async () => found),
      update: jest.fn(async () => ({ id: 'f1' })),
      delete: deleteFn,
    },
    transaction: { updateMany, findMany: jest.fn(async () => []) },
    category: { findFirst: jest.fn(async () => ({ id: 'c2' })) },
    member: { findFirst: jest.fn(async () => ({ id: 'm2' })) },
    $transaction: jest.fn(async (fn: (tx: unknown) => unknown) =>
      typeof fn === 'function' ? fn(prisma) : fn,
    ),
  };
  const repo = new FixedExpensePrismaRepository(prisma as never, { householdId: 'h1' } as never);
  return { repo, prisma, updateMany, deleteFn };
}

describe('FixedExpensePrismaRepository.remove', () => {
  it('desvincula os lançamentos antes de excluir', async () => {
    const { repo, updateMany, deleteFn } = setup({ id: 'f1' });
    await repo.remove('f1');
    expect(updateMany).toHaveBeenCalledWith({
      where: { householdId: 'h1', fixedExpenseId: 'f1' },
      data: { fixedExpenseId: null },
    });
    expect(deleteFn).toHaveBeenCalled();
  });

  it('devolve false para gasto fixo de outro household', async () => {
    const { repo, deleteFn } = setup(null);
    await expect(repo.remove('f1')).resolves.toBe(false);
    expect(deleteFn).not.toHaveBeenCalled();
  });

  it('escopa a busca ao household', async () => {
    const { repo, prisma } = setup({ id: 'f1' });
    await repo.remove('f1');
    expect(prisma.fixedExpense.findFirst.mock.calls[0][0].where).toMatchObject({
      householdId: 'h1', id: 'f1',
    });
  });
});
```

- [ ] **Step 7: Implementar no repositório Prisma**

Em `fixed-expense.prisma.repository.ts`, acrescentar:

```ts
  async update(
    id: string,
    data: UpdateFixedExpenseData,
    year: number,
    month: number,
  ): Promise<FixedExpenseView | null> {
    const existing = await this.prisma.fixedExpense.findFirst({ where: this.scoped({ id }) });
    if (!existing) return null;

    let categoryId: string | undefined;
    if (data.categorySlug) {
      const category = await this.prisma.category.findFirst({
        where: this.scoped({ slug: data.categorySlug }),
      });
      if (!category) throw new BadRequestException(`Categoria ${data.categorySlug} não existe`);
      categoryId = category.id;
    }

    let memberId: string | null | undefined;
    if (data.holder !== undefined) {
      if (data.holder === 'shared') {
        memberId = null;
      } else {
        const member = await this.prisma.member.findFirst({
          where: this.scoped({ name: data.holder }),
        });
        if (!member) throw new BadRequestException(`Membro ${data.holder} não existe`);
        memberId = member.id;
      }
    }

    await this.prisma.fixedExpense.update({
      where: { id: existing.id },
      data: {
        label: data.label,
        value: data.value,
        dueDay: data.dueDay,
        categoryId,
        memberId,
      },
    });
    // Relê pela via de leitura: FixedExpenseView carrega paidThisMonth.
    const all = await this.findAllWithStatus(year, month);
    return all.find((f) => f.id === id) ?? null;
  }

  async remove(id: string): Promise<boolean> {
    const existing = await this.prisma.fixedExpense.findFirst({ where: this.scoped({ id }) });
    if (!existing) return false;
    await this.prisma.$transaction(async (tx) => {
      // FK opcional: desvincula o histórico em vez de apagá-lo. Os lançamentos
      // continuam existindo, só deixam de estar marcados como "fixo".
      await tx.transaction.updateMany({
        where: this.scoped({ fixedExpenseId: id }),
        data: { fixedExpenseId: null },
      });
      await tx.fixedExpense.delete({ where: { id: existing.id } });
    });
    return true;
  }
```

Importar `BadRequestException` de `@nestjs/common` e `UpdateFixedExpenseData` da porta.

- [ ] **Step 8: DTO**

`update-fixed-expense.dto.ts`:

```ts
import { IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateFixedExpenseDto {
  @IsOptional() @IsString() label?: string;
  @IsOptional() @IsNumber() @Min(0) value?: number;
  @IsOptional() @IsInt() @Min(1) @Max(31) dueDay?: number;
  @IsOptional() @IsString() categorySlug?: string;
  @IsOptional() @IsString() holder?: string;
}
```

- [ ] **Step 9: Controller**

Em `fixed-expense.controller.ts`, injetar os dois use cases e acrescentar:

```ts
  @Patch(':id')
  @Roles('admin', 'editor')
  update(@Param('id') id: string, @Body() dto: UpdateFixedExpenseDto) {
    return this.updateUc.execute(id, requireNonEmptyPatch(dto));
  }

  @Delete(':id')
  @Roles('admin', 'editor')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.removeUc.execute(id);
  }
```

Importar `Patch`, `Delete`, `Param`, `HttpCode` de `@nestjs/common`.

- [ ] **Step 10: Registrar no módulo**

Em `budgeting.module.ts`, acrescentar `UpdateFixedExpenseUseCase` e
`RemoveFixedExpenseUseCase` aos `providers`.

- [ ] **Step 11: Gate e commit**

Run: `npx nx test api-financial && npx nx build api-financial`

```bash
git add apps/api-financial/src/modules/budgeting/
git commit -m "feat(api-financial): add PATCH and DELETE /fixed-expenses/:id"
```

---

### Task 12: Fumaça de ponta a ponta e fechamento

Nada acima prova que os endpoints respondem de verdade atrás do guard do Keycloak — os testes
mockam o Prisma e nunca sobem o Nest.

**Files:**
- Modify: `docs/superpowers/specs/2026-07-11-api-front-migration-umbrella.md`

- [ ] **Step 1: Subir o stack**

```bash
docker-compose up -d
npx nx serve api-financial
```

- [ ] **Step 2: Obter um token**

```bash
TOKEN=$(curl -s -X POST \
  'http://localhost:8080/realms/caixa-familia/protocol/openid-connect/token' \
  -d 'client_id=ui-financial' -d 'grant_type=password' \
  -d 'username=mateus' -d 'password=mateus' | jq -r .access_token)
```

(Se o `client_id` divergir, conferir em `keycloak/realm-export.json`.)

- [ ] **Step 3: Exercitar cada endpoint**

```bash
H="Authorization: Bearer $TOKEN"
J="Content-Type: application/json"
API=http://localhost:3000/api

# Guarda o budget original para restaurar no Step 4 — este script escreve no banco de dev
ORIG=$(curl -s "$API/categories" -H "$H" | jq -r '.[] | select(.slug=="casa") | .budget')
echo "budget original de 'casa': $ORIG"

# 400 — corpo vazio
curl -s -o /dev/null -w '%{http_code} corpo-vazio\n' -X PATCH "$API/categories/casa" -H "$H" -H "$J" -d '{}'
# 404 — slug inexistente
curl -s -o /dev/null -w '%{http_code} slug-inexistente\n' -X PATCH "$API/categories/zzz" -H "$H" -H "$J" -d '{"budget":1}'
# 200 — edição válida
curl -s -o /dev/null -w '%{http_code} patch-categoria\n' -X PATCH "$API/categories/casa" -H "$H" -H "$J" -d '{"budget":777}'
# 409 — categoria em uso
curl -s -w '\n%{http_code} delete-em-uso\n' -X DELETE "$API/categories/casa" -H "$H"
# 400 — ordem incompleta (prova que a rota `order` não caiu em `:slug`)
curl -s -o /dev/null -w '%{http_code} order-incompleta\n' -X PATCH "$API/categories/order" -H "$H" -H "$J" -d '{"slugs":["casa"]}'
# 200 — marcar como conferido
TX=$(curl -s "$API/transactions?year=2026&month=5" -H "$H" | jq -r '.[0].id')
curl -s -o /dev/null -w '%{http_code} patch-transacao\n' -X PATCH "$API/transactions/$TX" -H "$H" -H "$J" -d '{"reviewed":true}'
# 404 — transação inexistente
curl -s -o /dev/null -w '%{http_code} delete-tx-inexistente\n' -X DELETE "$API/transactions/nao-existe" -H "$H"
```

Expected: `400 404 200 409 400 200 404`, nessa ordem.

- [ ] **Step 4: Restaurar o valor que o Step 3 alterou**

O Step 3 escreveu `budget: 777` em `casa`. Restaurar com o valor capturado em `$ORIG`:

```bash
curl -s -o /dev/null -w '%{http_code} restaurado\n' -X PATCH "$API/categories/casa" \
  -H "$H" -H "$J" -d "{\"budget\":$ORIG}"
curl -s "$API/categories" -H "$H" | jq '.[] | select(.slug=="casa") | {slug, budget, order}'
```

Expected: `200 restaurado`, e o `budget` de volta ao valor de `$ORIG`.

- [ ] **Step 5: Registrar no umbrella**

Em `2026-07-11-api-front-migration-umbrella.md`, §4: marcar que os endpoints de escrita foram
entregues, com ponteiro para
`docs/superpowers/specs/2026-08-06-api-write-endpoints-design.md`, e deixar registrado que
resta apenas o módulo de membros e a integração de pagamento.

- [ ] **Step 6: Gate final e commit**

```bash
npx nx test api-financial
npx nx build api-financial
git add docs/
git commit -m "docs: record the write-endpoints slice in the migration umbrella"
```

> `api-financial` **não tem target `lint`** (só `ui-financial` tem). O gate deste projeto é
> `test` + `build`.

---

## Ordem e dependências

```
Task 1 (migração) ─┬─> Task 2 (order no wire) ──> Task 8 (reordenar)
                   └─> Task 3 (reviewed no wire) ─> Task 9 (PATCH transação)

Task 4 (guarda de corpo vazio) ──> Tasks 5, 6, 9, 11

Task 5 (PATCH meta)          ─┐
Task 6 (PATCH categoria)     ─┤
Task 7 (DELETE categoria)    ─┼─> Task 12 (fumaça + fechamento)
Task 8 (PATCH ordem)         ─┤
Task 9 (PATCH transação)     ─┤
Task 10 (DELETE tx → 404)    ─┤
Task 11 (PATCH/DELETE fixo)  ─┘
```

Tasks 1 e 4 são bloqueantes. As Tasks 5, 7, 10 e 11 não dependem umas das outras e podem ser
feitas em qualquer ordem. A Task 8 exige a Task 6 no mesmo controller (a rota `order` precisa
ser declarada acima de `:slug`).
