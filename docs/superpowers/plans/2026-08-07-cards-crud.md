# Cadastro de cartões (Fatia 1 de 3) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir cadastrar, editar, arquivar e excluir cartões pelo site, para que produção deixe de depender de `INSERT` na mão.

**Architecture:** `CardController` ganha `POST`, `PATCH`, `DELETE` e `PATCH /:id/archive`, no molde exato que `CategoryController` recebeu na fatia anterior — use case por operação, repositório Prisma escopado por household, DTO com `class-validator`. `Card` ganha `archivedAt` no schema e `archived: boolean` no tipo compartilhado. Na UI, um terceiro drawer de edição em Configurações, mais `activeCards` no `CatalogStore` para separar quem aparece nos seletores de quem só existe no histórico.

**Tech Stack:** NestJS + Prisma + Postgres no backend; Angular 20 standalone + signals (zoneless), Reactive Forms, Jest, Nx no front.

**Spec:** `docs/superpowers/specs/2026-08-07-cards-crud-design.md`

## Global Constraints

- **Branch:** `feat/upgrading-the-system`. Commits diretos, sem PR.
- **`libs/shared-types` atravessa os dois apps.** Mexer em `Card` quebra o type-check de
  `api-financial`, porque `seed.ts` importa `libs/shared-mocks`. Ao tocar no tipo, rodar
  **também** `npx nx build api-financial`. Isso custou uma task não prevista na fatia passada.
- **Padrão da fachada da UI:** todo método de escrita em `CatalogStore` faz
  `subscribe({ next: () => this.load(), error: () => this.failure.report(msg, this.cardsError) })`.
  O `DELETE` é a única exceção: o 409 dele não vira toast, vira o segundo modal.
- **`AppDataService` é fachada.** Métodos novos entram como delegação de uma linha para o
  `CatalogStore`. Não pôr lógica lá.
- **Salvar só habilita com `form.dirty`** — evita o 400 de corpo vazio do backend.
- **Ordem de rota no Nest:** `@Patch(':id/archive')` **antes** de `@Patch(':id')`, pela mesma
  razão que `@Patch('order')` veio antes de `@Patch(':slug')` em categoria.
- **Gate por task:** `npx nx test <projeto>` e `npx nx build <projeto>`. No fechamento, `lint`
  nos dois mais `npx tsc -p apps/ui-financial/tsconfig.spec.json --noEmit`.
- Todo texto de UI em **pt-BR**.

### Convenções verificadas no código

- `Card.id` é um **cuid**, não slug — diferente de `Category` e `Goal`, cujo `id` de domínio é o
  slug. As rotas de cartão usam `:id`.
- `Transaction.method` no domínio da UI é `'pix'` **ou** o `cardId`.
- `holder` não é coluna: deriva de `ownerMemberId → Member.name`, e `'shared'` grava `null`.
  O `TransactionPrismaRepository` já faz essa resolução por nome — copiar de lá.
- `card.view.ts` já traduz `closingDay/dueDay/creditLimit` para `closing/due/limit`.
- A migration anterior chama-se `20260806204431_add_order_and_reviewed`.

---

## Fatia A — Backend

### Task 1: `archivedAt` do banco até o tipo compartilhado

**Files:**
- Modify: `apps/api-financial/src/infrastructure/prisma/schema.prisma`
- Create: `apps/api-financial/src/infrastructure/prisma/migrations/<timestamp>_add_card_archived_at/migration.sql` (gerada)
- Modify: `libs/shared-types/src/lib/finance.types.ts`
- Modify: `libs/shared-mocks/src/lib/finance.mocks.ts`
- Modify: `apps/api-financial/src/infrastructure/prisma/seed.ts`
- Modify: `apps/api-financial/src/modules/catalog/card/domain/card.entity.ts`
- Modify: `apps/api-financial/src/modules/catalog/card/infrastructure/card.mapper.ts`
- Modify: `apps/api-financial/src/modules/catalog/card/infrastructure/card.mapper.spec.ts`
- Modify: `apps/api-financial/src/modules/catalog/card/interface/card.view.ts`

**Interfaces:**
- Produces: `Card.archived: boolean` no domínio compartilhado; `CardProps.archived`. Todas as
  tasks seguintes dependem.

- [ ] **Step 1: Escrever o teste que falha**

Em `card.mapper.spec.ts`, acrescentar:

```ts
describe('toDomain — archived', () => {
  it('traduz archivedAt nulo para archived false', () => {
    const row = { ...ROW, archivedAt: null };
    expect(toDomain(row, 0).toJSON().archived).toBe(false);
  });

  it('traduz archivedAt preenchido para archived true', () => {
    const row = { ...ROW, archivedAt: new Date('2026-08-07') };
    expect(toDomain(row, 0).toJSON().archived).toBe(true);
  });
});
```

> Ler o topo do arquivo para o nome real da fixture de linha do Prisma e reusá-la em vez de
> criar outra. Se não houver, criar uma `const ROW` com todos os campos de `Card` do Prisma.

E, no mesmo arquivo, o caminho até o wire — é isso que o spec pede quando diz que
`GET /cards` devolve `archived` em todos:

```ts
import { toCardView } from '../interface/card.view';

describe('toCardView — archived', () => {
  it('carrega archived até o wire', () => {
    const props = toDomain({ ...ROW, archivedAt: new Date('2026-08-07') }, 0).toJSON();
    expect(toCardView(props).archived).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx nx test api-financial --testPathPattern=card.mapper`
Expected: FAIL — `archived` não existe em `CardProps`.

- [ ] **Step 3: Coluna no schema**

Em `schema.prisma`, dentro de `model Card`, depois de `last4`:

```prisma
  archivedAt  DateTime?
```

- [ ] **Step 4: Gerar a migration**

Run: `npx prisma migrate dev --name add_card_archived_at`

Expected: cria a pasta de migration e regenera o client. Se o banco não estiver de pé, subir
com `docker compose up -d` antes.

- [ ] **Step 5: Campo no tipo compartilhado**

Em `libs/shared-types/src/lib/finance.types.ts`, em `interface Card`, depois de `last4`:

```ts
  archived: boolean;
```

- [ ] **Step 6: Mocks e seed**

Em `libs/shared-mocks`, acrescentar `archived: false` aos **seis** cartões de `MOCK_CARDS`.

Em `seed.ts`, o `prisma.card.create` não precisa gravar nada: `archivedAt` é opcional e nasce
`null`. Conferir que o type-check passa — é aqui que a fatia anterior quebrou.

- [ ] **Step 7: Entidade, mapper e view**

Em `card.entity.ts`, em `CardProps`, depois de `holder`:

```ts
  archived: boolean;
```

Em `card.mapper.ts`, no objeto passado ao `new Card(...)`:

```ts
    archived: r.archivedAt !== null,
```

Em `card.view.ts`, acrescentar `archived` a `CardViewInput` e ao retorno de `toCardView`:

```ts
  archived: c.archived,
```

- [ ] **Step 8: Rodar e ver passar**

Run: `npx nx test api-financial --testPathPattern=card`
Expected: PASS.

- [ ] **Step 9: Gate e commit**

```bash
npx nx test api-financial && npx nx build api-financial && npx nx build ui-financial
```

O `build ui-financial` entra aqui de propósito: `Card` é tipo compartilhado.

```bash
git add apps/api-financial/src/infrastructure/prisma/ libs/shared-types/ libs/shared-mocks/ apps/api-financial/src/modules/catalog/card/
git commit -m "feat(api-financial): add the card archived flag"
```

---

### Task 2: `POST /cards`

**Files:**
- Create: `apps/api-financial/src/modules/catalog/card/interface/dto/create-card.dto.ts`
- Create: `apps/api-financial/src/modules/catalog/card/application/create-card.usecase.ts`
- Create: `apps/api-financial/src/modules/catalog/card/application/create-card.usecase.spec.ts`
- Modify: `apps/api-financial/src/modules/catalog/card/domain/card.repository.ts`
- Modify: `apps/api-financial/src/modules/catalog/card/infrastructure/card.prisma.repository.ts`
- Modify: `apps/api-financial/src/modules/catalog/card/infrastructure/card.prisma.repository.spec.ts`
- Modify: `apps/api-financial/src/modules/catalog/card/interface/card.controller.ts`
- Modify: `apps/api-financial/src/modules/catalog/catalog.module.ts`

**Interfaces:**
- Consumes: `Card.archived` (Task 1).
- Produces: `CreateCardData`, `CardRepository.create(data)`, `CreateCardUseCase`. Tasks 3 a 5
  estendem o mesmo repositório.

- [ ] **Step 1: Escrever os testes que falham**

`create-card.usecase.spec.ts`:

```ts
import { CreateCardUseCase } from './create-card.usecase';

describe('CreateCardUseCase', () => {
  it('delega para o repositório e devolve o cartão criado', async () => {
    const card = { id: 'c1' };
    const repo = { create: jest.fn().mockResolvedValue(card) };
    const uc = new CreateCardUseCase(repo as never);
    const data = {
      name: 'Nubank', bank: 'Nubank', color: '#820AD1', closingDay: 5,
      dueDay: 12, creditLimit: 4500, last4: '4421', holder: 'Thais',
    };
    await expect(uc.execute(data)).resolves.toBe(card);
    expect(repo.create).toHaveBeenCalledWith(data);
  });
});
```

Em `card.prisma.repository.spec.ts`, acrescentar:

```ts
describe('CardPrismaRepository.create', () => {
  it('resolve o titular para ownerMemberId pelo nome', async () => {
    const prisma = buildPrisma();
    prisma.member.findFirst.mockResolvedValue({ id: 'm-thais' });
    prisma.card.create.mockResolvedValue({ ...ROW, ownerMemberId: 'm-thais' });
    const repo = new CardPrismaRepository(prisma as never, TENANT as never);

    await repo.create({
      name: 'Nubank', bank: 'Nubank', color: '#820AD1', closingDay: 5,
      dueDay: 12, creditLimit: 4500, last4: '4421', holder: 'Thais',
    });

    expect(prisma.card.create.mock.calls[0][0].data.ownerMemberId).toBe('m-thais');
  });

  it('grava ownerMemberId nulo quando o titular é shared', async () => {
    const prisma = buildPrisma();
    prisma.card.create.mockResolvedValue({ ...ROW, ownerMemberId: null });
    const repo = new CardPrismaRepository(prisma as never, TENANT as never);

    await repo.create({
      name: 'Conta conjunta', bank: 'Inter', color: '#FF7A00', closingDay: 1,
      dueDay: 8, creditLimit: 1000, last4: '0001', holder: 'shared',
    });

    expect(prisma.card.create.mock.calls[0][0].data.ownerMemberId).toBeNull();
    expect(prisma.member.findFirst).not.toHaveBeenCalled();
  });

  it('nasce com fatura zero — não há lançamento ainda', async () => {
    const prisma = buildPrisma();
    prisma.card.create.mockResolvedValue({ ...ROW, ownerMemberId: null });
    const repo = new CardPrismaRepository(prisma as never, TENANT as never);
    const card = await repo.create({
      name: 'Inter', bank: 'Inter', color: '#FF7A00', closingDay: 1,
      dueDay: 8, creditLimit: 1000, last4: '0001', holder: 'shared',
    });
    expect(card.toJSON().current).toBe(0);
  });
});
```

> Ler o topo de `card.prisma.repository.spec.ts` para os nomes reais do helper de mock do
> Prisma, da fixture de linha e do tenant. Reusar; não criar paralelos.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx nx test api-financial --testPathPattern=card`
Expected: FAIL — `create` não existe.

- [ ] **Step 3: Contrato no domínio**

Em `card.repository.ts`, antes de `export abstract class CardRepository`:

```ts
export interface CreateCardData {
  name: string;
  bank: string;
  color: string;
  closingDay: number;
  dueDay: number;
  creditLimit: number;
  last4: string;
  holder: string;
}
```

E dentro da classe abstrata:

```ts
  abstract create(data: CreateCardData): Promise<Card>;
```

- [ ] **Step 4: Repositório**

Em `card.prisma.repository.ts`, importar `CreateCardData` e acrescentar:

```ts
  /**
   * `holder` não é coluna: vira `ownerMemberId` por nome, como o repositório de
   * transação já faz. 'shared' é ausência de dono, não um membro chamado shared.
   */
  private async memberIdFor(holder: string): Promise<string | null> {
    if (holder === 'shared') return null;
    const member = await this.prisma.member.findFirst({
      where: { householdId: this.householdId, name: holder },
    });
    return member?.id ?? null;
  }

  async create(data: CreateCardData) {
    const ownerMemberId = await this.memberIdFor(data.holder);
    const row = await this.prisma.card.create({
      data: {
        householdId: this.householdId,
        ownerMemberId,
        name: data.name,
        bank: data.bank,
        color: data.color,
        closingDay: data.closingDay,
        dueDay: data.dueDay,
        creditLimit: data.creditLimit,
        last4: data.last4,
      },
      include: { owner: true },
    });
    // Cartão novo não tem lançamento, então a fatura do ciclo é zero.
    return toDomain(row, 0);
  }
```

- [ ] **Step 5: Use case**

`create-card.usecase.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { CardRepository, CreateCardData } from '../domain/card.repository';

@Injectable()
export class CreateCardUseCase {
  constructor(private readonly repo: CardRepository) {}

  execute(data: CreateCardData) {
    return this.repo.create(data);
  }
}
```

- [ ] **Step 6: DTO**

`create-card.dto.ts`:

```ts
import { IsHexColor, IsIn, IsInt, IsNumber, IsString, Matches, Max, Min } from 'class-validator';

export class CreateCardDto {
  @IsString() name!: string;
  @IsString() bank!: string;
  @IsHexColor() color!: string;
  @IsInt() @Min(1) @Max(31) closingDay!: number;
  @IsInt() @Min(1) @Max(31) dueDay!: number;
  @IsNumber() @Min(0) creditLimit!: number;
  // Quatro dígitos, não "quatro caracteres": '12a4' não é final de cartão.
  @Matches(/^\d{4}$/, { message: 'last4 deve ter exatamente 4 dígitos' }) last4!: string;
  @IsIn(['Mateus', 'Thais', 'shared']) holder!: string;
}
```

- [ ] **Step 7: Controller e módulo**

Em `card.controller.ts`, importar `Body`, `Post`, `Roles`, `CreateCardUseCase`, `CreateCardDto`
e `toCardView`, injetar o use case no construtor e acrescentar:

```ts
  @Post()
  @Roles('admin', 'editor')
  async create(@Body() dto: CreateCardDto) {
    return toCardView((await this.createUc.execute(dto)).toJSON());
  }
```

Em `catalog.module.ts`, acrescentar `CreateCardUseCase` aos `providers`.

- [ ] **Step 8: Rodar e ver passar**

Run: `npx nx test api-financial --testPathPattern=card`
Expected: PASS.

- [ ] **Step 9: Gate e commit**

```bash
npx nx test api-financial && npx nx build api-financial
git add apps/api-financial/src/modules/catalog/
git commit -m "feat(api-financial): add POST /cards"
```

---

### Task 3: `PATCH /cards/:id`

**Files:**
- Create: `apps/api-financial/src/modules/catalog/card/interface/dto/update-card.dto.ts`
- Create: `apps/api-financial/src/modules/catalog/card/application/update-card.usecase.ts`
- Create: `apps/api-financial/src/modules/catalog/card/application/update-card.usecase.spec.ts`
- Modify: `apps/api-financial/src/modules/catalog/card/domain/card.repository.ts`
- Modify: `apps/api-financial/src/modules/catalog/card/infrastructure/card.prisma.repository.ts`
- Modify: `apps/api-financial/src/modules/catalog/card/infrastructure/card.prisma.repository.spec.ts`
- Modify: `apps/api-financial/src/modules/catalog/card/interface/card.controller.ts`
- Modify: `apps/api-financial/src/modules/catalog/catalog.module.ts`

**Interfaces:**
- Consumes: `memberIdFor` (Task 2).
- Produces: `UpdateCardData`, `CardRepository.update(id, data)`, `UpdateCardUseCase`.

- [ ] **Step 1: Escrever os testes que falham**

`update-card.usecase.spec.ts`:

```ts
import { NotFoundException } from '@nestjs/common';
import { UpdateCardUseCase } from './update-card.usecase';

describe('UpdateCardUseCase', () => {
  it('devolve o cartão atualizado', async () => {
    const card = { id: 'c1' };
    const repo = { update: jest.fn().mockResolvedValue(card) };
    const uc = new UpdateCardUseCase(repo as never);
    await expect(uc.execute('c1', { creditLimit: 6000 })).resolves.toBe(card);
  });

  it('404 quando o cartão não existe', async () => {
    const repo = { update: jest.fn().mockResolvedValue(null) };
    const uc = new UpdateCardUseCase(repo as never);
    await expect(uc.execute('sumiu', { creditLimit: 1 })).rejects.toBeInstanceOf(NotFoundException);
  });
});
```

Em `card.prisma.repository.spec.ts`:

```ts
describe('CardPrismaRepository.update', () => {
  it('devolve null quando o cartão não é do household', async () => {
    const prisma = buildPrisma();
    prisma.card.findFirst.mockResolvedValue(null);
    const repo = new CardPrismaRepository(prisma as never, TENANT as never);
    await expect(repo.update('de-outro', { creditLimit: 1 })).resolves.toBeNull();
    expect(prisma.card.update).not.toHaveBeenCalled();
  });

  it('só traduz holder para ownerMemberId quando holder veio no corpo', async () => {
    const prisma = buildPrisma();
    prisma.card.findFirst.mockResolvedValue(ROW);
    prisma.card.update.mockResolvedValue(ROW);
    const repo = new CardPrismaRepository(prisma as never, TENANT as never);

    await repo.update('c1', { creditLimit: 6000 });

    expect(prisma.member.findFirst).not.toHaveBeenCalled();
    expect(prisma.card.update.mock.calls[0][0].data).not.toHaveProperty('ownerMemberId');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx nx test api-financial --testPathPattern=card`
Expected: FAIL — `update` não existe.

- [ ] **Step 3: Contrato no domínio**

Em `card.repository.ts`:

```ts
export interface UpdateCardData {
  name?: string;
  bank?: string;
  color?: string;
  closingDay?: number;
  dueDay?: number;
  creditLimit?: number;
  last4?: string;
  holder?: string;
}
```

E na classe abstrata:

```ts
  abstract update(id: string, data: UpdateCardData): Promise<Card | null>;
```

- [ ] **Step 4: Repositório**

```ts
  async update(id: string, data: UpdateCardData) {
    const existing = await this.prisma.card.findFirst({ where: this.scoped({ id }) });
    if (!existing) return null;
    // `ownerMemberId` só entra no update se `holder` veio no corpo: um PATCH que
    // não fala de titular não pode zerar o dono do cartão.
    const owner =
      data.holder === undefined ? {} : { ownerMemberId: await this.memberIdFor(data.holder) };
    const row = await this.prisma.card.update({
      where: { id: existing.id },
      data: {
        name: data.name,
        bank: data.bank,
        color: data.color,
        closingDay: data.closingDay,
        dueDay: data.dueDay,
        creditLimit: data.creditLimit,
        last4: data.last4,
        ...owner,
      },
      include: { owner: true },
    });
    const { start, end } = billingCycleFor(row.closingDay);
    const agg = await this.prisma.transaction.aggregate({
      _sum: { value: true },
      where: { householdId: this.householdId, cardId: row.id, date: { gt: start, lte: end } },
    });
    return toDomain(row, Number(agg._sum.value ?? 0));
  }
```

> `billingCycleFor` já está importado no arquivo, usado por `openInvoice`. O recálculo da
> fatura é necessário porque mudar `closingDay` muda o ciclo.

- [ ] **Step 5: Use case**

`update-card.usecase.ts`:

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { CardRepository, UpdateCardData } from '../domain/card.repository';

@Injectable()
export class UpdateCardUseCase {
  constructor(private readonly repo: CardRepository) {}

  async execute(id: string, data: UpdateCardData) {
    const updated = await this.repo.update(id, data);
    if (!updated) throw new NotFoundException(`Cartão ${id} não encontrado`);
    return updated;
  }
}
```

- [ ] **Step 6: DTO**

`update-card.dto.ts`:

```ts
import {
  IsHexColor, IsIn, IsInt, IsNumber, IsOptional, IsString, Matches, Max, Min,
} from 'class-validator';

export class UpdateCardDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() bank?: string;
  @IsOptional() @IsHexColor() color?: string;
  @IsOptional() @IsInt() @Min(1) @Max(31) closingDay?: number;
  @IsOptional() @IsInt() @Min(1) @Max(31) dueDay?: number;
  @IsOptional() @IsNumber() @Min(0) creditLimit?: number;
  @IsOptional() @Matches(/^\d{4}$/, { message: 'last4 deve ter exatamente 4 dígitos' }) last4?: string;
  @IsOptional() @IsIn(['Mateus', 'Thais', 'shared']) holder?: string;
}
```

- [ ] **Step 7: Controller e módulo**

Importar `Patch`, `Param`, `requireNonEmptyPatch`, `UpdateCardUseCase` e `UpdateCardDto`,
injetar o use case, e acrescentar **depois** do `@Post()`:

```ts
  @Patch(':id')
  @Roles('admin', 'editor')
  async update(@Param('id') id: string, @Body() dto: UpdateCardDto) {
    return toCardView((await this.updateUc.execute(id, requireNonEmptyPatch(dto))).toJSON());
  }
```

Acrescentar `UpdateCardUseCase` aos `providers` do módulo.

- [ ] **Step 8: Rodar e ver passar**

Run: `npx nx test api-financial --testPathPattern=card`
Expected: PASS.

- [ ] **Step 9: Gate e commit**

```bash
npx nx test api-financial && npx nx build api-financial
git add apps/api-financial/src/modules/catalog/
git commit -m "feat(api-financial): add PATCH /cards/:id"
```

---

### Task 4: `DELETE /cards/:id` com 409

**Files:**
- Create: `apps/api-financial/src/modules/catalog/card/application/remove-card.usecase.ts`
- Create: `apps/api-financial/src/modules/catalog/card/application/remove-card.usecase.spec.ts`
- Modify: `apps/api-financial/src/modules/catalog/card/domain/card.repository.ts`
- Modify: `apps/api-financial/src/modules/catalog/card/infrastructure/card.prisma.repository.ts`
- Modify: `apps/api-financial/src/modules/catalog/card/infrastructure/card.prisma.repository.spec.ts`
- Modify: `apps/api-financial/src/modules/catalog/card/interface/card.controller.ts`
- Modify: `apps/api-financial/src/modules/catalog/catalog.module.ts`

**Interfaces:**
- Produces: `CardUsage { transactions, invoices }`, `CardRepository.countUsage(id)` e
  `.remove(id)`, `RemoveCardUseCase`. A UI depende do formato do corpo do 409.

- [ ] **Step 1: Escrever os testes que falham**

`remove-card.usecase.spec.ts`:

```ts
import { ConflictException, NotFoundException } from '@nestjs/common';
import { RemoveCardUseCase } from './remove-card.usecase';

const build = (usage: unknown) => {
  const repo = { countUsage: jest.fn().mockResolvedValue(usage), remove: jest.fn() };
  return { repo, uc: new RemoveCardUseCase(repo as never) };
};

describe('RemoveCardUseCase', () => {
  it('404 quando o cartão não existe', async () => {
    const { uc } = build(null);
    await expect(uc.execute('sumiu')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('exclui o cartão zerado', async () => {
    const { uc, repo } = build({ transactions: 0, invoices: 0 });
    await uc.execute('c1');
    expect(repo.remove).toHaveBeenCalledWith('c1');
  });

  it('409 com as contagens quando há lançamento', async () => {
    const { uc, repo } = build({ transactions: 47, invoices: 0 });
    await expect(uc.execute('c1')).rejects.toMatchObject({
      response: { message: 'Cartão em uso', transactions: 47, invoices: 0 },
    });
    expect(repo.remove).not.toHaveBeenCalled();
  });

  it('409 também quando só há fatura fechada', async () => {
    const { uc, repo } = build({ transactions: 0, invoices: 8 });
    await expect(uc.execute('c1')).rejects.toBeInstanceOf(ConflictException);
    expect(repo.remove).not.toHaveBeenCalled();
  });
});
```

> O último caso é o que passa despercebido se só se testar lançamento. `InvoiceHistory.cardId`
> é FK obrigatória: apagar o cartão apagaria fatura fechada.

Em `card.prisma.repository.spec.ts`:

```ts
describe('CardPrismaRepository.countUsage', () => {
  it('devolve null quando o cartão não é do household', async () => {
    const prisma = buildPrisma();
    prisma.card.findFirst.mockResolvedValue(null);
    const repo = new CardPrismaRepository(prisma as never, TENANT as never);
    await expect(repo.countUsage('de-outro')).resolves.toBeNull();
  });

  it('conta lançamentos e faturas do cartão', async () => {
    const prisma = buildPrisma();
    prisma.card.findFirst.mockResolvedValue(ROW);
    prisma.transaction.count.mockResolvedValue(47);
    prisma.invoiceHistory.count.mockResolvedValue(8);
    const repo = new CardPrismaRepository(prisma as never, TENANT as never);
    await expect(repo.countUsage('c1')).resolves.toEqual({ transactions: 47, invoices: 8 });
  });
});
```

> Conferir se o helper de mock do Prisma já expõe `invoiceHistory.count`. Se não, acrescentar
> ao helper — não criar um mock paralelo no arquivo.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx nx test api-financial --testPathPattern=card`
Expected: FAIL — `countUsage` não existe.

- [ ] **Step 3: Contrato no domínio**

```ts
export interface CardUsage {
  transactions: number;
  invoices: number;
}
```

E na classe abstrata:

```ts
  abstract countUsage(id: string): Promise<CardUsage | null>;
  abstract remove(id: string): Promise<boolean>;
```

- [ ] **Step 4: Repositório**

```ts
  async countUsage(id: string): Promise<CardUsage | null> {
    const existing = await this.prisma.card.findFirst({ where: this.scoped({ id }) });
    if (!existing) return null;
    const [transactions, invoices] = await Promise.all([
      this.prisma.transaction.count({ where: this.scoped({ cardId: existing.id }) }),
      this.prisma.invoiceHistory.count({ where: this.scoped({ cardId: existing.id }) }),
    ]);
    return { transactions, invoices };
  }

  async remove(id: string): Promise<boolean> {
    const existing = await this.prisma.card.findFirst({ where: this.scoped({ id }) });
    if (!existing) return false;
    await this.prisma.card.delete({ where: { id: existing.id } });
    return true;
  }
```

- [ ] **Step 5: Use case**

`remove-card.usecase.ts`:

```ts
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CardRepository } from '../domain/card.repository';

@Injectable()
export class RemoveCardUseCase {
  constructor(private readonly repo: CardRepository) {}

  async execute(id: string): Promise<void> {
    const usage = await this.repo.countUsage(id);
    if (!usage) throw new NotFoundException(`Cartão ${id} não encontrado`);
    if (usage.transactions > 0 || usage.invoices > 0) {
      // InvoiceHistory.cardId é FK obrigatória e Transaction.cardId, embora
      // anulável, não pode ser zerado: um gasto no crédito passaria a parecer
      // Pix. A UI usa estas contagens para oferecer arquivar.
      throw new ConflictException({
        message: 'Cartão em uso',
        transactions: usage.transactions,
        invoices: usage.invoices,
      });
    }
    await this.repo.remove(id);
  }
}
```

- [ ] **Step 6: Controller e módulo**

Importar `Delete` e `HttpCode`, injetar `RemoveCardUseCase`, e acrescentar:

```ts
  @Delete(':id')
  @Roles('admin', 'editor')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.removeUc.execute(id);
  }
```

Acrescentar `RemoveCardUseCase` aos `providers`.

- [ ] **Step 7: Rodar e ver passar**

Run: `npx nx test api-financial --testPathPattern=card`
Expected: PASS.

- [ ] **Step 8: Gate e commit**

```bash
npx nx test api-financial && npx nx build api-financial
git add apps/api-financial/src/modules/catalog/
git commit -m "feat(api-financial): add DELETE /cards/:id with the in-use conflict"
```

---

### Task 5: `PATCH /cards/:id/archive`

**Files:**
- Create: `apps/api-financial/src/modules/catalog/card/interface/dto/archive-card.dto.ts`
- Create: `apps/api-financial/src/modules/catalog/card/application/archive-card.usecase.ts`
- Create: `apps/api-financial/src/modules/catalog/card/application/archive-card.usecase.spec.ts`
- Modify: `apps/api-financial/src/modules/catalog/card/domain/card.repository.ts`
- Modify: `apps/api-financial/src/modules/catalog/card/infrastructure/card.prisma.repository.ts`
- Modify: `apps/api-financial/src/modules/catalog/card/infrastructure/card.prisma.repository.spec.ts`
- Modify: `apps/api-financial/src/modules/catalog/card/interface/card.controller.ts`
- Modify: `apps/api-financial/src/modules/catalog/catalog.module.ts`

**Interfaces:**
- Produces: `CardRepository.setArchived(id, archived)`, `ArchiveCardUseCase`.

- [ ] **Step 1: Escrever os testes que falham**

`archive-card.usecase.spec.ts`:

```ts
import { NotFoundException } from '@nestjs/common';
import { ArchiveCardUseCase } from './archive-card.usecase';

describe('ArchiveCardUseCase', () => {
  it('arquiva e devolve o cartão', async () => {
    const card = { id: 'c1' };
    const repo = { setArchived: jest.fn().mockResolvedValue(card) };
    const uc = new ArchiveCardUseCase(repo as never);
    await expect(uc.execute('c1', true)).resolves.toBe(card);
    expect(repo.setArchived).toHaveBeenCalledWith('c1', true);
  });

  it('desarquiva quando archived é false', async () => {
    const repo = { setArchived: jest.fn().mockResolvedValue({ id: 'c1' }) };
    const uc = new ArchiveCardUseCase(repo as never);
    await uc.execute('c1', false);
    expect(repo.setArchived).toHaveBeenCalledWith('c1', false);
  });

  it('404 quando o cartão não existe', async () => {
    const repo = { setArchived: jest.fn().mockResolvedValue(null) };
    const uc = new ArchiveCardUseCase(repo as never);
    await expect(uc.execute('sumiu', true)).rejects.toBeInstanceOf(NotFoundException);
  });
});
```

Em `card.prisma.repository.spec.ts`:

```ts
describe('CardPrismaRepository.setArchived', () => {
  it('grava a data ao arquivar', async () => {
    const prisma = buildPrisma();
    prisma.card.findFirst.mockResolvedValue(ROW);
    prisma.card.update.mockResolvedValue({ ...ROW, archivedAt: new Date() });
    const repo = new CardPrismaRepository(prisma as never, TENANT as never);
    await repo.setArchived('c1', true);
    expect(prisma.card.update.mock.calls[0][0].data.archivedAt).toBeInstanceOf(Date);
  });

  it('limpa a data ao desarquivar', async () => {
    const prisma = buildPrisma();
    prisma.card.findFirst.mockResolvedValue(ROW);
    prisma.card.update.mockResolvedValue({ ...ROW, archivedAt: null });
    const repo = new CardPrismaRepository(prisma as never, TENANT as never);
    await repo.setArchived('c1', false);
    expect(prisma.card.update.mock.calls[0][0].data.archivedAt).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx nx test api-financial --testPathPattern=card`
Expected: FAIL — `setArchived` não existe.

- [ ] **Step 3: Contrato e repositório**

Na classe abstrata de `card.repository.ts`:

```ts
  abstract setArchived(id: string, archived: boolean): Promise<Card | null>;
```

Em `card.prisma.repository.ts`:

```ts
  async setArchived(id: string, archived: boolean) {
    const existing = await this.prisma.card.findFirst({ where: this.scoped({ id }) });
    if (!existing) return null;
    const row = await this.prisma.card.update({
      where: { id: existing.id },
      data: { archivedAt: archived ? new Date() : null },
      include: { owner: true },
    });
    // Cartão arquivado não recebe lançamento novo, mas o ciclo corrente pode ter
    // compras anteriores ao arquivamento — o total continua sendo o real.
    const { start, end } = billingCycleFor(row.closingDay);
    const agg = await this.prisma.transaction.aggregate({
      _sum: { value: true },
      where: { householdId: this.householdId, cardId: row.id, date: { gt: start, lte: end } },
    });
    return toDomain(row, Number(agg._sum.value ?? 0));
  }
```

- [ ] **Step 4: Use case**

`archive-card.usecase.ts`:

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { CardRepository } from '../domain/card.repository';

@Injectable()
export class ArchiveCardUseCase {
  constructor(private readonly repo: CardRepository) {}

  async execute(id: string, archived: boolean) {
    const card = await this.repo.setArchived(id, archived);
    if (!card) throw new NotFoundException(`Cartão ${id} não encontrado`);
    return card;
  }
}
```

- [ ] **Step 5: DTO**

`archive-card.dto.ts`:

```ts
import { IsBoolean } from 'class-validator';

export class ArchiveCardDto {
  @IsBoolean() archived!: boolean;
}
```

- [ ] **Step 6: Controller e módulo**

**Antes** do `@Patch(':id')` — senão o Nest casa `archive` como id:

```ts
  // Precisa vir ANTES de @Patch(':id'), senão o Nest casa 'archive' como id.
  @Patch(':id/archive')
  @Roles('admin', 'editor')
  async archive(@Param('id') id: string, @Body() dto: ArchiveCardDto) {
    return toCardView((await this.archiveUc.execute(id, dto.archived)).toJSON());
  }
```

Acrescentar `ArchiveCardUseCase` aos `providers`.

- [ ] **Step 7: Rodar e ver passar**

Run: `npx nx test api-financial --testPathPattern=card`
Expected: PASS.

- [ ] **Step 8: Gate e commit**

```bash
npx nx test api-financial && npx nx lint api-financial && npx nx build api-financial
git add apps/api-financial/src/modules/catalog/
git commit -m "feat(api-financial): add PATCH /cards/:id/archive"
```

---

## Fatia B — Camada de dados da UI

### Task 6: Wire, mapper, serviço e tradutor do 409

**Files:**
- Modify: `apps/ui-financial/src/app/core/api/wire.types.ts`
- Modify: `apps/ui-financial/src/app/core/api/catalog-api.service.ts`
- Modify: `apps/ui-financial/src/app/core/api/catalog-api.service.spec.ts`
- Create: `apps/ui-financial/src/app/core/api/card.mapper.ts`
- Create: `apps/ui-financial/src/app/core/api/card.mapper.spec.ts`
- Create: `apps/ui-financial/src/app/core/api/card-conflict.ts`
- Create: `apps/ui-financial/src/app/core/api/card-conflict.spec.ts`

**Interfaces:**
- Consumes: `Card.archived` (Task 1).
- Produces: `NewCard`, `CreateCardWire`, `UpdateCardWire`, `cardToCreateWire`,
  `cardToUpdateWire`, `cardConflictMessage(err)`,
  `CatalogApiService.createCard/updateCard/removeCard/archiveCard`. Tasks 7 a 11 dependem.

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar a `catalog-api.service.spec.ts`:

```ts
it('POSTs a new card', () => {
  const body = {
    name: 'Inter', bank: 'Inter', color: '#FF7A00', closingDay: 1,
    dueDay: 8, creditLimit: 1000, last4: '0001', holder: 'shared',
  };
  service.createCard(body).subscribe();
  const req = httpMock.expectOne(`${environment.apiBaseUrl}/cards`);
  expect(req.request.method).toBe('POST');
  expect(req.request.body).toEqual(body);
  req.flush({});
});

it('PATCHes a card', () => {
  service.updateCard('c1', { creditLimit: 6000 }).subscribe();
  const req = httpMock.expectOne(`${environment.apiBaseUrl}/cards/c1`);
  expect(req.request.method).toBe('PATCH');
  expect(req.request.body).toEqual({ creditLimit: 6000 });
  req.flush({});
});

it('DELETEs a card', () => {
  service.removeCard('c1').subscribe();
  const req = httpMock.expectOne(`${environment.apiBaseUrl}/cards/c1`);
  expect(req.request.method).toBe('DELETE');
  req.flush({});
});

it('PATCHes the archive flag on its own route', () => {
  service.archiveCard('c1', true).subscribe();
  const req = httpMock.expectOne(`${environment.apiBaseUrl}/cards/c1/archive`);
  expect(req.request.method).toBe('PATCH');
  expect(req.request.body).toEqual({ archived: true });
  req.flush({});
});
```

`card.mapper.spec.ts`:

```ts
import { cardToCreateWire, cardToUpdateWire } from './card.mapper';
import type { Card } from '@caixa-familia/shared-types';

const CARD: Card = {
  id: 'c1', name: 'Nubank', holder: 'Thais', bank: 'Nubank', color: '#820AD1',
  closing: 5, due: 12, current: 1895, limit: 4500, last4: '4421', archived: false,
};

describe('cardToCreateWire', () => {
  it('traduz closing/due/limit para os nomes do wire', () => {
    const { id: _id, current: _current, archived: _archived, ...novo } = CARD;
    expect(cardToCreateWire(novo)).toEqual({
      name: 'Nubank', bank: 'Nubank', color: '#820AD1',
      closingDay: 5, dueDay: 12, creditLimit: 4500,
      last4: '4421', holder: 'Thais',
    });
  });
});

describe('cardToUpdateWire', () => {
  it('manda os oito campos editáveis', () => {
    expect(cardToUpdateWire(CARD)).toEqual({
      name: 'Nubank', bank: 'Nubank', color: '#820AD1',
      closingDay: 5, dueDay: 12, creditLimit: 4500,
      last4: '4421', holder: 'Thais',
    });
  });

  it('não manda id, current nem archived — nenhum é editável', () => {
    const wire = cardToUpdateWire(CARD);
    expect(wire).not.toHaveProperty('id');
    expect(wire).not.toHaveProperty('current');
    expect(wire).not.toHaveProperty('archived');
  });
});
```

`card-conflict.spec.ts`:

```ts
import { HttpErrorResponse } from '@angular/common/http';
import { cardConflictMessage } from './card-conflict';

const conflict = (transactions: number, invoices: number) =>
  new HttpErrorResponse({
    status: 409,
    error: { message: 'Cartão em uso', transactions, invoices },
  });

describe('cardConflictMessage', () => {
  it('usa as contagens que a API devolve', () => {
    expect(cardConflictMessage(conflict(47, 8))).toBe(
      'Não dá para excluir: 47 lançamentos e 8 faturas usam este cartão.',
    );
  });

  it('fala no singular quando é um só', () => {
    expect(cardConflictMessage(conflict(1, 1))).toBe(
      'Não dá para excluir: 1 lançamento e 1 fatura usam este cartão.',
    );
  });

  it('omite a parte que está zerada', () => {
    expect(cardConflictMessage(conflict(3, 0))).toBe(
      'Não dá para excluir: 3 lançamentos usam este cartão.',
    );
    expect(cardConflictMessage(conflict(0, 2))).toBe(
      'Não dá para excluir: 2 faturas usam este cartão.',
    );
  });

  it('cai numa mensagem genérica se não for 409', () => {
    expect(cardConflictMessage(new HttpErrorResponse({ status: 500 }))).toBe(
      'Falha ao excluir cartão',
    );
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx nx test ui-financial --testPathPattern="catalog-api|card.mapper|card-conflict"`
Expected: FAIL — módulos e métodos inexistentes.

- [ ] **Step 3: Wire types**

Em `wire.types.ts`, depois de `UpdateCategoryWire`:

```ts
export interface CreateCardWire {
  name: string;
  bank: string;
  color: string;
  closingDay: number;
  dueDay: number;
  creditLimit: number;
  last4: string;
  holder: string;
}

export interface UpdateCardWire {
  name?: string;
  bank?: string;
  color?: string;
  closingDay?: number;
  dueDay?: number;
  creditLimit?: number;
  last4?: string;
  holder?: string;
}
```

- [ ] **Step 4: Mapper**

`card.mapper.ts`:

```ts
import type { Card } from '@caixa-familia/shared-types';
import type { CreateCardWire, UpdateCardWire } from './wire.types';

/** Cartão ainda sem identidade: `id`, `current` e `archived` vêm do servidor. */
export type NewCard = Omit<Card, 'id' | 'current' | 'archived'>;

/**
 * A leitura não tem mapper: `card.view.ts` da API já devolve o formato de
 * domínio. Só a escrita precisa traduzir closing/due/limit para os nomes que o
 * DTO espera.
 */
export function cardToCreateWire(c: NewCard): CreateCardWire {
  return {
    name: c.name,
    bank: c.bank,
    color: c.color,
    closingDay: c.closing,
    dueDay: c.due,
    creditLimit: c.limit,
    last4: c.last4,
    holder: c.holder,
  };
}

export function cardToUpdateWire(c: Card): UpdateCardWire {
  return cardToCreateWire(c);
}
```

- [ ] **Step 5: Tradutor do 409**

`card-conflict.ts`:

```ts
import { HttpErrorResponse } from '@angular/common/http';

const plural = (n: number, um: string, muitos: string) => `${n} ${n === 1 ? um : muitos}`;

/**
 * O backend devolve as contagens no corpo do 409 justamente para a UI poder
 * explicar e oferecer arquivar. Um "Falha ao excluir" genérico jogaria fora a
 * informação que torna o próximo passo óbvio.
 */
export function cardConflictMessage(err: HttpErrorResponse): string {
  const body = err.error as { transactions?: number; invoices?: number } | null;
  if (err.status !== 409 || !body) return 'Falha ao excluir cartão';
  const partes: string[] = [];
  if (body.transactions) partes.push(plural(body.transactions, 'lançamento', 'lançamentos'));
  if (body.invoices) partes.push(plural(body.invoices, 'fatura', 'faturas'));
  if (partes.length === 0) return 'Falha ao excluir cartão';
  return `Não dá para excluir: ${partes.join(' e ')} usam este cartão.`;
}
```

- [ ] **Step 6: Serviço**

Em `catalog-api.service.ts`, importar `CreateCardWire` e `UpdateCardWire` e acrescentar:

```ts
  createCard(body: CreateCardWire): Observable<Card> {
    return this.http.post<Card>(`${this.base}/cards`, body);
  }

  updateCard(id: string, body: UpdateCardWire): Observable<Card> {
    return this.http.patch<Card>(`${this.base}/cards/${id}`, body);
  }

  removeCard(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/cards/${id}`);
  }

  archiveCard(id: string, archived: boolean): Observable<Card> {
    return this.http.patch<Card>(`${this.base}/cards/${id}/archive`, { archived });
  }
```

- [ ] **Step 7: Rodar e ver passar**

Run: `npx nx test ui-financial --testPathPattern="catalog-api|card.mapper|card-conflict"`
Expected: PASS.

- [ ] **Step 8: Gate e commit**

```bash
npx nx test ui-financial && npx nx build ui-financial
git add apps/ui-financial/src/app/core/api/
git commit -m "feat(ui-financial): add the card write data layer"
```

---

### Task 7: `CatalogStore` e fachada

**Files:**
- Modify: `apps/ui-financial/src/app/core/state/catalog.store.ts`
- Create: `apps/ui-financial/src/app/core/state/catalog.store.spec.ts`
- Modify: `apps/ui-financial/src/app/layout/app-data.service.ts`

**Interfaces:**
- Consumes: Task 6 inteira.
- Produces: `CatalogStore.activeCards`, `.createCard(c)`, `.updateCard(c)`, `.removeCard(id)`,
  `.archiveCard(id, archived)`, `.cardRemovalConflict`, `.clearCardRemovalConflict()`; e os
  mesmos nomes em `AppDataService`. Tasks 8 a 11 dependem.

- [ ] **Step 1: Escrever os testes que falham**

`catalog.store.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CatalogStore } from './catalog.store';
import { ToastService } from '../../ui/toast/toast.service';
import { environment } from '../../../environments/environment';
import type { Card } from '@caixa-familia/shared-types';

const CARD = (over: Partial<Card> = {}): Card => ({
  id: 'c1', name: 'Nubank', holder: 'Thais', bank: 'Nubank', color: '#820AD1',
  closing: 5, due: 12, current: 0, limit: 4500, last4: '4421', archived: false,
  ...over,
});

function build() {
  const toast = { show: jest.fn() };
  TestBed.configureTestingModule({
    providers: [
      CatalogStore,
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: ToastService, useValue: toast },
    ],
  });
  return {
    store: TestBed.inject(CatalogStore),
    http: TestBed.inject(HttpTestingController),
    toast,
  };
}

afterEach(() => TestBed.resetTestingModule());

describe('CatalogStore — activeCards', () => {
  it('esconde arquivados sem tirá-los de cards()', () => {
    const { store, http } = build();
    store.load();
    http.expectOne(`${environment.apiBaseUrl}/categories`).flush([]);
    http.expectOne(`${environment.apiBaseUrl}/cards`).flush([
      CARD(),
      CARD({ id: 'c2', archived: true }),
    ]);
    expect(store.cards().length).toBe(2);
    expect(store.activeCards().map((c) => c.id)).toEqual(['c1']);
  });

  it('cardBy continua resolvendo um cartão arquivado', () => {
    const { store, http } = build();
    store.load();
    http.expectOne(`${environment.apiBaseUrl}/categories`).flush([]);
    http.expectOne(`${environment.apiBaseUrl}/cards`).flush([CARD({ archived: true })]);
    expect(store.cardBy()['c1'].bank).toBe('Nubank');
  });
});

describe('CatalogStore — remoção de cartão', () => {
  it('guarda a mensagem do 409 em vez de virar toast', () => {
    const { store, http, toast } = build();
    store.removeCard('c1');
    http.expectOne(`${environment.apiBaseUrl}/cards/c1`).flush(
      { message: 'Cartão em uso', transactions: 47, invoices: 8 },
      { status: 409, statusText: 'Conflict' },
    );
    expect(store.cardRemovalConflict()).toBe(
      'Não dá para excluir: 47 lançamentos e 8 faturas usam este cartão.',
    );
    expect(toast.show).not.toHaveBeenCalled();
  });

  it('mostra toast em erro que não é 409', () => {
    const { store, http, toast } = build();
    store.removeCard('c1');
    http.expectOne(`${environment.apiBaseUrl}/cards/c1`).flush(
      {}, { status: 500, statusText: 'Server Error' },
    );
    expect(store.cardRemovalConflict()).toBeNull();
    expect(toast.show).toHaveBeenCalled();
  });

  it('limpa o conflito anterior ao tentar de novo', () => {
    const { store, http } = build();
    store.removeCard('c1');
    http.expectOne(`${environment.apiBaseUrl}/cards/c1`).flush(
      { message: 'Cartão em uso', transactions: 1, invoices: 0 },
      { status: 409, statusText: 'Conflict' },
    );
    store.removeCard('c2');
    expect(store.cardRemovalConflict()).toBeNull();
    http.expectOne(`${environment.apiBaseUrl}/cards/c2`).flush(null);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx nx test ui-financial --testPathPattern=catalog.store`
Expected: FAIL — `activeCards` e `removeCard` não existem.

- [ ] **Step 3: Store**

Em `catalog.store.ts`, importar `cardToCreateWire`, `cardToUpdateWire`, `type NewCard` de
`../api/card.mapper` e `cardConflictMessage` de `../api/card-conflict`, e acrescentar:

```ts
  /** Cartão arquivado sai dos seletores, mas continua em `cards` e no `cardBy`. */
  readonly activeCards = computed(() => this.cards().filter((c) => !c.archived));

  /**
   * Mensagem do 409 do DELETE. Não vira toast: a tela usa isto para abrir o
   * modal que oferece arquivar, transformando o erro em caminho de saída.
   */
  readonly cardRemovalConflict = signal<string | null>(null);

  createCard(c: NewCard): void {
    this.api.createCard(cardToCreateWire(c)).subscribe({
      next: () => this.load(),
      error: () => this.failure.report('Falha ao criar cartão', this.cardsError),
    });
  }

  updateCard(c: Card): void {
    this.api.updateCard(c.id, cardToUpdateWire(c)).subscribe({
      next: () => this.load(),
      error: () => this.failure.report('Falha ao salvar cartão', this.cardsError),
    });
  }

  removeCard(id: string): void {
    this.cardRemovalConflict.set(null);
    this.api.removeCard(id).subscribe({
      next: () => this.load(),
      error: (err) => {
        if (err.status === 409) this.cardRemovalConflict.set(cardConflictMessage(err));
        else this.failure.report('Falha ao excluir cartão', this.cardsError);
      },
    });
  }

  archiveCard(id: string, archived: boolean): void {
    this.api.archiveCard(id, archived).subscribe({
      next: () => this.load(),
      error: () =>
        this.failure.report(
          archived ? 'Falha ao arquivar cartão' : 'Falha ao desarquivar cartão',
          this.cardsError,
        ),
    });
  }

  clearCardRemovalConflict(): void {
    this.cardRemovalConflict.set(null);
  }
```

- [ ] **Step 4: Fachada**

Em `app-data.service.ts`, na seção `Catálogo`, acrescentar:

```ts
  readonly activeCards = this.catalog.activeCards;
  readonly cardRemovalConflict = this.catalog.cardRemovalConflict;

  createCard(c: NewCard): void {
    this.catalog.createCard(c);
  }
  updateCard(c: Card): void {
    this.catalog.updateCard(c);
  }
  removeCard(id: string): void {
    this.catalog.removeCard(id);
  }
  archiveCard(id: string, archived: boolean): void {
    this.catalog.archiveCard(id, archived);
  }
  clearCardRemovalConflict(): void {
    this.catalog.clearCardRemovalConflict();
  }
```

Importar `Card` de `@caixa-familia/shared-types` (já há um import de tipos de lá — acrescentar
ao existente) e `NewCard` de `../core/api/card.mapper`.

- [ ] **Step 5: Rodar e ver passar**

Run: `npx nx test ui-financial --testPathPattern=catalog.store`
Expected: PASS.

- [ ] **Step 6: Gate e commit**

```bash
npx nx test ui-financial && npx nx build ui-financial
git add apps/ui-financial/src/app/core/state/ apps/ui-financial/src/app/layout/app-data.service.ts
git commit -m "feat(ui-financial): add card writes to the catalog store"
```

---

## Fatia C — UI

### Task 8: `card-edit-drawer`

**Files:**
- Create: `apps/ui-financial/src/app/features/settings/card-edit-drawer.component.ts` / `.html` / `.scss`
- Create: `apps/ui-financial/src/app/features/settings/card-edit-drawer.component.spec.ts`

**Interfaces:**
- Consumes: `AppDataService.createCard/updateCard` (Task 7).
- Produces: `<cf-card-edit-drawer [card]="…" (closed)="…" />`, com `card` opcional — ausente
  significa criação. Task 9 usa.

- [ ] **Step 1: Escrever o teste que falha**

`card-edit-drawer.component.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { CardEditDrawerComponent } from './card-edit-drawer.component';
import { AppDataService } from '../../layout/app-data.service';
import type { Card } from '@caixa-familia/shared-types';

const CARD: Card = {
  id: 'c1', name: 'Nubank', holder: 'Thais', bank: 'Nubank', color: '#820AD1',
  closing: 5, due: 12, current: 1895, limit: 4500, last4: '4421', archived: false,
};

function build(card: Card | null) {
  const data = { createCard: jest.fn(), updateCard: jest.fn() };
  TestBed.configureTestingModule({
    imports: [CardEditDrawerComponent],
    providers: [{ provide: AppDataService, useValue: data }],
  });
  const fixture = TestBed.createComponent(CardEditDrawerComponent);
  fixture.componentRef.setInput('card', card);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement, data, c: fixture.componentInstance };
}

afterEach(() => TestBed.resetTestingModule());

describe('CardEditDrawerComponent — edição', () => {
  it('preenche o formulário a partir do cartão', () => {
    expect(build(CARD).c.form.getRawValue()).toMatchObject({
      name: 'Nubank', bank: 'Nubank', last4: '4421',
      closing: 5, due: 12, limit: 4500, holder: 'Thais',
    });
  });

  it('mantém Salvar desabilitado enquanto nada mudou', () => {
    expect(build(CARD).el.querySelector('.save-btn').disabled).toBe(true);
  });

  it('salva preservando o id e chama updateCard', () => {
    const { c, data } = build(CARD);
    c.form.controls.limit.setValue(6000);
    c.form.markAsDirty();
    c.save();
    expect(data.updateCard).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'c1', limit: 6000 }),
    );
    expect(data.createCard).not.toHaveBeenCalled();
  });
});

describe('CardEditDrawerComponent — criação', () => {
  it('abre vazio quando não há cartão', () => {
    expect(build(null).c.form.getRawValue().name).toBe('');
  });

  it('chama createCard sem id', () => {
    const { c, data } = build(null);
    c.form.setValue({
      name: 'Inter', bank: 'Inter', color: '#FF7A00', last4: '0001',
      limit: 1000, closing: 1, due: 8, holder: 'shared',
    });
    c.form.markAsDirty();
    c.save();
    expect(data.createCard).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Inter', holder: 'shared' }),
    );
    expect(data.createCard.mock.calls[0][0]).not.toHaveProperty('id');
    expect(data.updateCard).not.toHaveBeenCalled();
  });

  it('não salva com últimos 4 inválidos', () => {
    const { c, data } = build(null);
    c.form.setValue({
      name: 'Inter', bank: 'Inter', color: '#FF7A00', last4: '12a',
      limit: 1000, closing: 1, due: 8, holder: 'shared',
    });
    c.form.markAsDirty();
    c.save();
    expect(data.createCard).not.toHaveBeenCalled();
  });

  it('emite closed ao salvar', () => {
    const { c } = build(CARD);
    const seen: void[] = [];
    c.closed.subscribe(() => seen.push(undefined));
    c.form.markAsDirty();
    c.save();
    expect(seen.length).toBe(1);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx nx test ui-financial --testPathPattern=card-edit-drawer`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Componente**

`card-edit-drawer.component.ts`:

```ts
import { Component, computed, effect, inject, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Card, Holder } from '@caixa-familia/shared-types';
import { AppDataService } from '../../layout/app-data.service';
import { IconComponent } from '../../ui/icon/icon.component';

const VAZIO = {
  name: '',
  bank: '',
  color: '#1F4E79',
  last4: '',
  limit: 0,
  closing: 1,
  due: 8,
  holder: 'shared' as Holder,
};

@Component({
  selector: 'cf-card-edit-drawer',
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent],
  templateUrl: './card-edit-drawer.component.html',
  styleUrl: './card-edit-drawer.component.scss',
})
export class CardEditDrawerComponent {
  private data = inject(AppDataService);

  /** Ausente significa criação. */
  readonly card = input<Card | null>(null);
  readonly closed = output<void>();

  protected isEditing = computed(() => this.card() !== null);

  form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    bank: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    color: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    // Quatro dígitos, não quatro caracteres — espelha o @Matches do DTO.
    last4: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d{4}$/)],
    }),
    limit: new FormControl(0, { nonNullable: true, validators: [Validators.min(0)] }),
    closing: new FormControl(1, {
      nonNullable: true,
      validators: [Validators.min(1), Validators.max(31)],
    }),
    due: new FormControl(1, {
      nonNullable: true,
      validators: [Validators.min(1), Validators.max(31)],
    }),
    holder: new FormControl<Holder>('shared', { nonNullable: true }),
  });

  constructor() {
    effect(() => {
      const c = this.card();
      this.form.setValue(
        c
          ? {
              name: c.name, bank: c.bank, color: c.color, last4: c.last4,
              limit: c.limit, closing: c.closing, due: c.due, holder: c.holder,
            }
          : { ...VAZIO },
      );
      this.form.markAsPristine();
    });
  }

  save() {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const existing = this.card();
    // No modo edição o id, a fatura do ciclo e o arquivamento vêm do original:
    // nenhum dos três é editável neste formulário.
    if (existing) this.data.updateCard({ ...existing, ...v });
    else this.data.createCard(v);
    this.closed.emit();
  }
}
```

- [ ] **Step 4: Template**

`card-edit-drawer.component.html`:

```html
<div class="backdrop" role="button" tabindex="0" aria-label="Fechar"
  (click)="closed.emit()" (keydown.enter)="closed.emit()" (keydown.space)="closed.emit()"></div>

<aside class="panel" [formGroup]="form">
  <header class="drawer-head">
    <span class="head-title">{{ isEditing() ? 'Editar cartão' : 'Novo cartão' }}</span>
    <button type="button" class="close-btn" (click)="closed.emit()" aria-label="Fechar">
      <cf-icon name="x" [size]="14" />
    </button>
  </header>

  <div class="drawer-body">
    <label class="label" for="card-name">Nome</label>
    <input id="card-name" class="text-input" formControlName="name" placeholder="Ex.: Nubank" />

    <label class="label mt" for="card-bank">Banco</label>
    <input id="card-bank" class="text-input" formControlName="bank" />

    <label class="label mt" for="card-color">Cor</label>
    <input id="card-color" class="text-input" formControlName="color" placeholder="#820AD1" />

    <label class="label mt" for="card-last4">Últimos 4 dígitos</label>
    <input id="card-last4" class="text-input" formControlName="last4" inputmode="numeric"
      maxlength="4" placeholder="4421" />

    <label class="label mt" for="card-limit">Limite</label>
    <input id="card-limit" class="text-input" type="number" formControlName="limit" />

    <label class="label mt" for="card-closing">Fecha no dia</label>
    <input id="card-closing" class="text-input" type="number" min="1" max="31"
      formControlName="closing" />

    <label class="label mt" for="card-due">Vence no dia</label>
    <input id="card-due" class="text-input" type="number" min="1" max="31"
      formControlName="due" />

    <label class="label mt" for="card-holder">Titular</label>
    <select id="card-holder" class="text-input" formControlName="holder">
      <option value="shared">Compartilhado</option>
      <option value="Mateus">Mateus</option>
      <option value="Thais">Thais</option>
    </select>
  </div>

  <footer class="drawer-foot">
    <span class="foot-hint">{{ isEditing() ? '···' + form.controls.last4.value : 'novo' }}</span>
    <button type="button" class="save-btn" [disabled]="form.invalid || form.pristine" (click)="save()">
      Salvar
    </button>
  </footer>
</aside>
```

- [ ] **Step 5: Estilo**

`card-edit-drawer.component.scss`:

```scss
// Anatomia comum aos drawers de edição: styles/_edit-drawer.scss.
@use 'edit-drawer';
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npx nx test ui-financial --testPathPattern=card-edit-drawer`
Expected: PASS.

- [ ] **Step 7: Gate e commit**

```bash
npx nx test ui-financial && npx nx build ui-financial
git add apps/ui-financial/src/app/features/settings/
git commit -m "feat(ui-financial): add the card edit drawer"
```

---

### Task 9: Cadastrar e editar em Configurações

**Files:**
- Modify: `apps/ui-financial/src/app/features/settings/settings.component.ts` / `.html`
- Modify: `apps/ui-financial/src/app/features/settings/settings.component.spec.ts`

**Interfaces:**
- Consumes: `<cf-card-edit-drawer>` (Task 8).
- Produces: `startNewCard()`, `startEditCard(c)`, `closeCardDrawer()`, `creatingCard`,
  `editingCard` no `SettingsComponent`. Tasks 10 e 11 estendem a mesma seção.

- [ ] **Step 1: Ampliar o mock e escrever o teste que falha**

`buildSettings()` já existe no arquivo desde a fatia de categorias. Acrescentar ao mock de
`AppDataService` dele — as Tasks 10 e 11 vão usar os mesmos:

```ts
    cards: signal([] as Card[]),
    activeCards: signal([] as Card[]),
    cardRemovalConflict: signal<string | null>(null),
    createCard: jest.fn(),
    updateCard: jest.fn(),
    removeCard: jest.fn(),
    archiveCard: jest.fn(),
    clearCardRemovalConflict: jest.fn(),
```

E acrescentar ao arquivo:

```ts
describe('SettingsComponent — cartões', () => {
  it('abre o drawer vazio para criar', () => {
    const { component } = buildSettings();
    component.startNewCard();
    expect(component.creatingCard()).toBe(true);
    expect(component.editingCard()).toBeNull();
  });

  it('abre o drawer preenchido para editar', () => {
    const { component } = buildSettings();
    const card = { id: 'c1' } as never;
    component.startEditCard(card);
    expect(component.editingCard()).toBe(card);
    expect(component.creatingCard()).toBe(false);
  });

  it('fecha os dois modos de uma vez', () => {
    const { component } = buildSettings();
    component.startNewCard();
    component.closeCardDrawer();
    expect(component.creatingCard()).toBe(false);
    expect(component.editingCard()).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx nx test ui-financial --testPathPattern=settings.component`
Expected: FAIL — `startNewCard` não existe.

- [ ] **Step 3: Componente**

Em `settings.component.ts`, importar `CardEditDrawerComponent` e pôr nos `imports` do
`@Component`, e acrescentar:

```ts
  readonly editingCard = signal<Card | null>(null);
  readonly creatingCard = signal(false);

  startNewCard(): void {
    this.editingCard.set(null);
    this.creatingCard.set(true);
  }

  startEditCard(c: Card): void {
    this.creatingCard.set(false);
    this.editingCard.set(c);
  }

  closeCardDrawer(): void {
    this.creatingCard.set(false);
    this.editingCard.set(null);
  }
```

- [ ] **Step 4: Template**

Em `settings.component.html`, no `@case ('cards')`, dentro de `.card-head` e depois do
`.card-head-text`:

```html
            <div class="card-head-actions">
              <button
                class="btn-primary"
                type="button"
                [disabled]="!auth.canWrite()"
                (click)="startNewCard()"
              >
                + Novo cartão
              </button>
            </div>
```

Na tabela de cartões, no `<thead>`, ao final da linha:

```html
                  <th style="width:84px"></th>
```

E a célula na linha, depois da de limite:

```html
                    <td class="gear-cell">
                      <button type="button" class="icon-btn" (click)="startEditCard(c)"
                        [disabled]="!auth.canWrite()" aria-label="Editar cartão">
                        <cf-icon name="settings" [size]="11" />
                      </button>
                    </td>
```

No ramo mobile, dentro de `.stc-meta` do cartão:

```html
                  <button type="button" class="stc-tag" (click)="startEditCard(c)"
                    [disabled]="!auth.canWrite()">
                    Editar
                  </button>
```

E ao final do template, junto dos outros drawers:

```html
@if (creatingCard() || editingCard()) {
  <cf-card-edit-drawer [card]="editingCard()" (closed)="closeCardDrawer()" />
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx nx test ui-financial --testPathPattern=settings.component`
Expected: PASS.

- [ ] **Step 6: Gate e commit**

```bash
npx nx test ui-financial && npx nx build ui-financial
git add apps/ui-financial/src/app/features/settings/
git commit -m "feat(ui-financial): create and edit cards from settings"
```

---

### Task 10: Excluir em dois passos, com oferta de arquivar

**Files:**
- Modify: `apps/ui-financial/src/app/features/settings/settings.component.ts` / `.html`
- Modify: `apps/ui-financial/src/app/features/settings/settings.component.spec.ts`

**Interfaces:**
- Consumes: `AppDataService.removeCard`, `.archiveCard`, `.cardRemovalConflict`,
  `.clearCardRemovalConflict` (Task 7); `cf-confirm-modal`.
- Produces: nada.

- [ ] **Step 1: Escrever o teste que falha**

```ts
describe('SettingsComponent — excluir cartão', () => {
  it('pede confirmação antes de excluir', () => {
    const { component, data } = buildSettings();
    component.askRemoveCard('c1');
    expect(component.confirmingCardRemoval()).toBe('c1');
    expect(data.removeCard).not.toHaveBeenCalled();
  });

  it('exclui ao confirmar', () => {
    const { component, data } = buildSettings();
    component.askRemoveCard('c1');
    component.confirmRemoveCard();
    expect(data.removeCard).toHaveBeenCalledWith('c1');
    expect(component.confirmingCardRemoval()).toBeNull();
  });

  it('guarda o cartão para poder arquivar se vier 409', () => {
    const { component } = buildSettings();
    component.askRemoveCard('c1');
    component.confirmRemoveCard();
    expect(component.pendingCardId()).toBe('c1');
  });

  it('arquiva o cartão do conflito e limpa o estado', () => {
    const { component, data } = buildSettings();
    component.askRemoveCard('c1');
    component.confirmRemoveCard();
    component.archivePendingCard();
    expect(data.archiveCard).toHaveBeenCalledWith('c1', true);
    expect(component.pendingCardId()).toBeNull();
    expect(data.clearCardRemovalConflict).toHaveBeenCalled();
  });

  it('desiste do conflito sem arquivar', () => {
    const { component, data } = buildSettings();
    component.askRemoveCard('c1');
    component.confirmRemoveCard();
    component.dismissCardConflict();
    expect(data.archiveCard).not.toHaveBeenCalled();
    expect(component.pendingCardId()).toBeNull();
  });

  it('não exclui ao cancelar', () => {
    const { component, data } = buildSettings();
    component.askRemoveCard('c1');
    component.cancelRemoveCard();
    expect(data.removeCard).not.toHaveBeenCalled();
    expect(component.confirmingCardRemoval()).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx nx test ui-financial --testPathPattern=settings.component`
Expected: FAIL — `askRemoveCard` não existe.

- [ ] **Step 3: Componente**

```ts
  readonly confirmingCardRemoval = signal<string | null>(null);

  /**
   * Sobrevive ao DELETE porque o 409 chega depois: é ele que diz qual cartão
   * arquivar quando a exclusão não pôde acontecer.
   */
  readonly pendingCardId = signal<string | null>(null);

  askRemoveCard(id: string): void {
    this.confirmingCardRemoval.set(id);
  }

  confirmRemoveCard(): void {
    const id = this.confirmingCardRemoval();
    this.confirmingCardRemoval.set(null);
    if (!id) return;
    this.pendingCardId.set(id);
    this.data.removeCard(id);
  }

  cancelRemoveCard(): void {
    this.confirmingCardRemoval.set(null);
  }

  archivePendingCard(): void {
    const id = this.pendingCardId();
    if (id) this.data.archiveCard(id, true);
    this.dismissCardConflict();
  }

  dismissCardConflict(): void {
    this.pendingCardId.set(null);
    this.data.clearCardRemovalConflict();
  }
```

- [ ] **Step 4: Template**

Botão de excluir junto do de editar, na célula `.gear-cell` da tabela:

```html
                      <button type="button" class="icon-btn btn-neg" (click)="askRemoveCard(c.id)"
                        [disabled]="!auth.canWrite()" aria-label="Excluir cartão">
                        <cf-icon name="x" [size]="11" />
                      </button>
```

E no card mobile:

```html
                  <button type="button" class="stc-tag neg" (click)="askRemoveCard(c.id)"
                    [disabled]="!auth.canWrite()">
                    Excluir
                  </button>
```

Os dois modais, ao final do template:

```html
@if (confirmingCardRemoval()) {
  <cf-confirm-modal
    title="Excluir cartão?"
    description="Só é possível excluir cartões sem lançamentos e sem faturas fechadas."
    confirmLabel="Excluir"
    [danger]="true"
    (confirmed)="confirmRemoveCard()"
    (cancelled)="cancelRemoveCard()"
  />
}

@if (data.cardRemovalConflict(); as motivo) {
  <cf-confirm-modal
    title="Arquivar em vez de excluir?"
    [description]="motivo + ' Arquivar tira o cartão dos seletores e mantém o histórico.'"
    confirmLabel="Arquivar"
    (confirmed)="archivePendingCard()"
    (cancelled)="dismissCardConflict()"
  />
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx nx test ui-financial --testPathPattern=settings.component`
Expected: PASS.

- [ ] **Step 6: Gate e commit**

```bash
npx nx test ui-financial && npx nx build ui-financial
git add apps/ui-financial/src/app/features/settings/
git commit -m "feat(ui-financial): offer archiving when a card cannot be deleted"
```

---

### Task 11: Arquivados fora dos seletores

**Files:**
- Modify: `apps/ui-financial/src/app/features/expense-drawer/expense-drawer.component.html`
- Modify: `apps/ui-financial/src/app/features/expense-drawer/expense-drawer.component.spec.ts`
- Modify: `apps/ui-financial/src/app/features/cards/cards.component.ts` / `.html`
- Modify: `apps/ui-financial/src/app/features/cards/cards.component.spec.ts`
- Modify: `apps/ui-financial/src/app/features/settings/settings.component.html`
- Modify: `apps/ui-financial/src/app/features/settings/settings.component.spec.ts`

**Interfaces:**
- Consumes: `AppDataService.activeCards`, `.archiveCard` (Task 7).
- Produces: nada.

- [ ] **Step 1: Escrever os testes que falham**

Em `expense-drawer.component.spec.ts`, acrescentar `activeCards: signal([])` ao
`mockDataService()` existente e criar:

```ts
const ATIVO = {
  id: 'c1', name: 'Nubank', holder: 'Thais' as const, bank: 'Nubank', color: '#820AD1',
  closing: 5, due: 12, current: 0, limit: 4500, last4: '4421', archived: false,
};
const ARQUIVADO = {
  id: 'c2', name: 'Itaú', holder: 'Mateus' as const, bank: 'Itaú', color: '#EC7000',
  closing: 8, due: 15, current: 0, limit: 3800, last4: '3367', archived: true,
};

describe('ExpenseDrawerComponent — cartão arquivado', () => {
  it('não oferece cartão arquivado como método', () => {
    const data = {
      ...mockDataService(),
      cards: signal([ATIVO, ARQUIVADO]),
      activeCards: signal([ATIVO]),
    };
    TestBed.configureTestingModule({
      imports: [ExpenseDrawerComponent],
      providers: [{ provide: AppDataService, useValue: data }],
    });
    const fixture = TestBed.createComponent(ExpenseDrawerComponent);
    fixture.detectChanges();
    const texto = fixture.nativeElement.textContent;
    expect(texto).toContain('Nubank');
    expect(texto).not.toContain('Itaú');
  });
});
```

Em `cards.component.spec.ts`, o helper existente chama-se `build(byCard)` e recebe só o mapa de
histórico; a lista de cartões vem da const `CARDS` do topo do arquivo, com dois cartões
(`nu-t` limite 4500 e `it-m` limite 5200) e um cast `as Card[]`. Estender a assinatura em vez
de criar um helper paralelo:

```ts
function build(
  byCard: Record<string, InvoiceHistoryEntry[]>,
  cards: Card[] = CARDS,
  activeCards: Card[] = cards,
) {
```

e no objeto `data` do mock, acrescentar as duas chaves:

```ts
    cards: signal(cards),
    activeCards: signal(activeCards),
```

trocando a chave `cards` que já existe lá. Depois acrescentar o teste:

```ts
describe('CardsComponent — arquivados', () => {
  it('soma só o limite dos cartões ativos', () => {
    const arquivado = { ...CARDS[1], archived: true };
    const { component } = build({}, [CARDS[0], arquivado], [CARDS[0]]);
    expect(component.totalLimit()).toBe(4500);
  });
});
```

> Conferir o que `build` devolve hoje. Se devolver só o elemento e não `{ component }`,
> usar a forma que o arquivo já usa em vez de mudar o retorno.

Em `settings.component.spec.ts`:

```ts
it('marca o cartão arquivado na tabela', () => {
  const { fixture, data } = buildSettings();
  data.cards.set([{ ...ATIVO, archived: true }]);
  (fixture.componentInstance as never as { activeSection: { set(s: string): void } })
    .activeSection.set('cards');
  fixture.detectChanges();
  expect(fixture.nativeElement.textContent).toContain('Arquivado');
});
```

> `ATIVO` precisa existir no arquivo de settings também — declarar a fixture local, no topo,
> junto das que já existem.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx nx test ui-financial --testPathPattern="expense-drawer|cards.component|settings.component"`
Expected: FAIL.

- [ ] **Step 3: Trocar a fonte no seletor de método**

Em `expense-drawer.component.html`, no `@for` do bloco de método de pagamento:

```html
      @for (c of data.activeCards(); track c.id) {
```

- [ ] **Step 4: Trocar a fonte na tela de cartões**

Em `cards.component.ts`, trocar **as sete** ocorrências de `this.data.cards()` por
`this.data.activeCards()`. Em `cards.component.html`, a única ocorrência de `data.cards()`
também. A tela mostra fatura e limite de cartão em uso; arquivado não pertence ali.

- [ ] **Step 5: Pílula e desarquivar em Configurações**

Na tabela de cartões de `settings.component.html`, dentro do `.name-stack` da célula de banco:

```html
                        @if (c.archived) {
                          <span class="pill">Arquivado</span>
                        }
```

E na `.gear-cell`, trocando o botão de excluir quando o cartão está arquivado:

```html
                      @if (c.archived) {
                        <button type="button" class="icon-btn" (click)="data.archiveCard(c.id, false)"
                          [disabled]="!auth.canWrite()" aria-label="Desarquivar cartão">
                          <cf-icon name="repeat" [size]="11" />
                        </button>
                      } @else {
                        <button type="button" class="icon-btn btn-neg" (click)="askRemoveCard(c.id)"
                          [disabled]="!auth.canWrite()" aria-label="Excluir cartão">
                          <cf-icon name="x" [size]="11" />
                        </button>
                      }
```

O mesmo par no ramo mobile, com `.stc-tag` no lugar de `.icon-btn` e os rótulos
*Desarquivar* / *Excluir*.

- [ ] **Step 6: Rodar e ver passar**

Run: `npx nx test ui-financial`
Expected: PASS.

- [ ] **Step 7: Gate e commit**

```bash
npx nx test ui-financial && npx nx lint ui-financial && npx nx build ui-financial
git add apps/ui-financial/src/app/features/
git commit -m "feat(ui-financial): keep archived cards out of the pickers"
```

---

## Fatia D — Fechamento

### Task 12: Verificação e registro

**Files:**
- Modify: `docs/superpowers/specs/2026-07-11-api-front-migration-umbrella.md`
- Modify: `docs/superpowers/plans/2026-08-07-cards-crud.md`

- [ ] **Step 1: Gate completo**

```bash
npx nx test api-financial && npx nx lint api-financial && npx nx build api-financial
npx nx test ui-financial && npx nx lint ui-financial && npx nx build ui-financial
npx tsc -p apps/ui-financial/tsconfig.spec.json --noEmit
```

No `tsc`, ignorar o ruído de `TS2307`/`TS2571` (artefato de rodar fora do preset) e olhar
`TS2345`/`TS2741`/`TS2322`, que são reais.

- [ ] **Step 2: Subir o stack**

```bash
docker compose up -d
npx nx serve api-financial
npx nx serve ui-financial
```

> Ao terminar, `docker compose stop` e encerrar as árvores de `node`: parar o `npx` deixa
> `nx.js`, `run-executor` e o servidor órfãos nas portas 3000 e 4200.

- [ ] **Step 3: Percorrer os fluxos no Chrome**

Em **375px e 1280px**:

1. Configurações → Cartões → **+ Novo cartão** → preencher → salvar → aparece na lista.
2. O cartão novo aparece no seletor de método do drawer de novo gasto.
3. **Editar** o cartão → mudar limite → salvar → a lista reflete.
4. **Excluir** o cartão recém-criado, ainda zerado → some da lista.
5. **Excluir** um cartão com histórico → segundo modal com a contagem real → **Arquivar**.
6. O arquivado some do seletor de método e da tela `/cards`, e continua em Configurações com a
   pílula.
7. Um lançamento antigo daquele cartão continua mostrando banco e final na lista de transações.
8. **Desarquivar** → volta ao seletor.

Conferir em 375px que `scrollWidth == clientWidth` nas oito rotas. Se a janela do Chrome não
redimensionar por estar maximizada, usar um `iframe` de 375px na mesma origem — a media query
vale para o viewport do iframe.

- [ ] **Step 4: Registrar**

No umbrella, marcar o cadastro de cartão como entregue, com a contagem de testes dos dois
projetos, e registrar que as Fatias 2 e 3 continuam pendentes, apontando para o spec.

Neste plano, preencher a tabela de estado da execução com o commit de cada task e registrar
qualquer desvio — a fatia anterior mostrou que desvio não registrado é o que custa caro na
sessão seguinte.

- [ ] **Step 5: Commit**

```bash
git add docs/
git commit -m "docs: record the card CRUD slice"
```

---

## Ordem e dependências

```
Task 1 (archived no tipo compartilhado)
   │
   ├─> Task 2 (POST) ─> Task 3 (PATCH)
   ├─> Task 4 (DELETE + 409)
   └─> Task 5 (archive)
            │
            └─> Task 6 (wire/mapper/serviço) ─> Task 7 (store + fachada)
                                                    │
                                                    ├─> Task 8 ─> Task 9 ─> Task 10
                                                    └─> Task 11
                                                            │
                                                        Task 12 fecha
```

A Task 1 é bloqueante para tudo: é ela que põe `archived` no tipo compartilhado. As Tasks 2 a 5
tocam os mesmos quatro arquivos do módulo `card`, então são sequenciais, não paralelas. A Task
11 depende só da Task 7 e pode vir antes da 8 se for conveniente.

## Estado da execução

| Task | Commit | Estado |
|---|---|---|
| 1 a 12 | — | pendente |
