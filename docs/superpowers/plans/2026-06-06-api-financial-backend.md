# API Financial Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir a API backend (`apps/api-financial`) que substitui os mocks do `ui-financial`, com NestJS + Prisma + PostgreSQL, arquitetura DDD, multi-tenancy e login via Keycloak.

**Architecture:** App Nx NestJS em camadas DDD (domain / application / infrastructure / interface) por bounded context. Multi-tenant por `householdId` em toda tabela, isolado por um `TenantContext` derivado do JWT do Keycloak. Prisma como ORM/adapter de persistência atrás de portas de repositório. Snapshots (`MonthlySummary`, `InvoiceHistory`) para agregações; fatura do ciclo aberto e `card.current` são derivados por query.

**Tech Stack:** NestJS, Prisma, PostgreSQL 16, Keycloak 26, Docker Compose, Nx 22, Jest, passport-jwt + jwks-rsa, class-validator, zod.

**Spec:** `docs/superpowers/specs/2026-06-06-api-financial-backend-design.md`

---

## File Structure

```
apps/api-financial/
├─ src/
│  ├─ main.ts                         # bootstrap Nest + ValidationPipe global
│  ├─ app/app.module.ts               # raiz: importa config, prisma, auth, módulos de domínio
│  ├─ shared-kernel/
│  │  ├─ money.vo.ts                  # Value Object Money (Decimal)
│  │  ├─ date-only.vo.ts              # Value Object DateOnly
│  │  ├─ billing-cycle.ts            # cálculo de ciclo de fatura (closing/due)
│  │  └─ entity.base.ts               # base Entity + Id
│  ├─ infrastructure/
│  │  ├─ config/config.module.ts      # env validado por zod
│  │  ├─ prisma/prisma.service.ts     # PrismaClient gerenciado pelo Nest
│  │  ├─ prisma/schema.prisma         # schema completo
│  │  ├─ prisma/seed.ts               # mocks → DB
│  │  └─ auth/
│  │     ├─ jwt.strategy.ts           # valida JWT via JWKS do Keycloak
│  │     ├─ jwt-auth.guard.ts         # guard global
│  │     ├─ roles.guard.ts            # checa role admin/editor
│  │     ├─ tenant-context.ts         # request-scoped { memberId, householdId, role }
│  │     └─ tenant-repository.base.ts # base de repo que injeta householdId
│  └─ modules/
│     ├─ catalog/   (Category, Card)
│     ├─ ledger/    (Transaction, Installment, Income)
│     ├─ budgeting/ (FixedExpense)
│     ├─ goals/     (Goal, GoalContribution)
│     └─ reporting/ (MonthlySummary, InvoiceHistory)
├─ jest.config.ts
├─ project.json
└─ tsconfig.*.json

docker-compose.yml                    # raiz: postgres, keycloak, keycloak-db
keycloak/realm-export.json            # realm caixa-familia
.env.example
```

Cada módulo de domínio segue o mesmo layout interno:
```
modules/<ctx>/<aggregate>/
├─ domain/<aggregate>.entity.ts
├─ domain/<aggregate>.repository.ts   # porta (interface)
├─ application/<use-case>.ts
├─ application/dto/*.ts
├─ infrastructure/<aggregate>.prisma.repository.ts
├─ infrastructure/<aggregate>.mapper.ts
├─ interface/<aggregate>.controller.ts
├─ interface/dto/*.ts                 # DTOs HTTP com class-validator
├─ <aggregate>.module.ts
└─ *.spec.ts
```

**Convenção TDD:** VOs e use-cases têm testes **unitários** (portas mockadas, rápidos). Repositórios e controllers têm testes de **integração** contra o Postgres do Docker (schema de teste isolado). Commits frequentes ao fim de cada task.

---

## Task 1: Scaffold do app NestJS

**Files:**
- Create: `apps/api-financial/**` (gerado pelo Nx)

- [X] **Step 1: Gerar o app Nest**

Run:
```bash
npx nx g @nx/nest:application apps/api-financial --unitTestRunner=jest --e2eTestRunner=none --strict
```
Expected: cria `apps/api-financial` com `main.ts`, `app/app.module.ts`, `project.json`, `jest.config.ts`.

- [X] **Step 2: Verificar build**

Run: `npx nx build api-financial`
Expected: `Successfully ran target build for project api-financial`.

- [ ] **Step 3: Configurar ValidationPipe e prefixo global**

Editar `apps/api-financial/src/main.ts` para conter:

```ts
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:4200', credentials: true });
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
  Logger.log(`🚀 api-financial em http://localhost:${port}/api`);
}
bootstrap();
```

- [ ] **Step 4: Verificar build novamente**

Run: `npx nx build api-financial`
Expected: build verde.

- [ ] **Step 5: Commit**

```bash
git add apps/api-financial
git commit -m "feat(api-financial): scaffold NestJS application"
```

---

## Task 2: Docker Compose (Postgres + Keycloak)

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.example`
- Create: `keycloak/realm-export.json`

- [ ] **Step 1: Criar `docker-compose.yml`**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: cf-postgres
    environment:
      POSTGRES_USER: cf
      POSTGRES_PASSWORD: cf
      POSTGRES_DB: caixa_familia
    ports:
      - '5432:5432'
    volumes:
      - cf-pg:/var/lib/postgresql/data

  keycloak-db:
    image: postgres:16-alpine
    container_name: cf-keycloak-db
    environment:
      POSTGRES_USER: keycloak
      POSTGRES_PASSWORD: keycloak
      POSTGRES_DB: keycloak
    volumes:
      - cf-kc-pg:/var/lib/postgresql/data

  keycloak:
    image: quay.io/keycloak/keycloak:26.0
    container_name: cf-keycloak
    command: ['start-dev', '--import-realm']
    environment:
      KC_BOOTSTRAP_ADMIN_USERNAME: admin
      KC_BOOTSTRAP_ADMIN_PASSWORD: admin
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://keycloak-db:5432/keycloak
      KC_DB_USERNAME: keycloak
      KC_DB_PASSWORD: keycloak
    ports:
      - '8080:8080'
    volumes:
      - ./keycloak:/opt/keycloak/data/import
    depends_on:
      - keycloak-db

volumes:
  cf-pg:
  cf-kc-pg:
```

- [ ] **Step 2: Criar `.env.example`**

```bash
PORT=3000
WEB_ORIGIN=http://localhost:4200
DATABASE_URL=postgresql://cf:cf@localhost:5432/caixa_familia?schema=public
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=caixa-familia
KEYCLOAK_CLIENT_ID=api-financial
```

- [ ] **Step 3: Criar `keycloak/realm-export.json`** (realm com 2 clients, 2 roles, 2 usuários)

```json
{
  "realm": "caixa-familia",
  "enabled": true,
  "roles": { "realm": [{ "name": "admin" }, { "name": "editor" }] },
  "clients": [
    {
      "clientId": "ui-financial",
      "publicClient": true,
      "standardFlowEnabled": true,
      "redirectUris": ["http://localhost:4200/*"],
      "webOrigins": ["http://localhost:4200"]
    },
    {
      "clientId": "api-financial",
      "bearerOnly": true
    }
  ],
  "users": [
    {
      "username": "mateus",
      "enabled": true,
      "email": "mateushas.advir@gmail.com",
      "firstName": "Mateus",
      "credentials": [{ "type": "password", "value": "mateus", "temporary": false }],
      "realmRoles": ["admin"]
    },
    {
      "username": "thais",
      "enabled": true,
      "firstName": "Thais",
      "credentials": [{ "type": "password", "value": "thais", "temporary": false }],
      "realmRoles": ["editor"]
    }
  ]
}
```

- [ ] **Step 4: Subir e verificar**

Run: `docker compose up -d`
Then: `docker compose ps`
Expected: `cf-postgres`, `cf-keycloak`, `cf-keycloak-db` em estado `running`. Keycloak acessível em `http://localhost:8080` (admin/admin) com realm `caixa-familia` importado.

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml .env.example keycloak/realm-export.json
git commit -m "feat(api-financial): docker compose with postgres and keycloak"
```

---

## Task 3: Módulo de configuração (env validado por zod)

**Files:**
- Create: `apps/api-financial/src/infrastructure/config/config.schema.ts`
- Create: `apps/api-financial/src/infrastructure/config/config.module.ts`
- Test: `apps/api-financial/src/infrastructure/config/config.schema.spec.ts`

- [ ] **Step 1: Instalar deps**

Run: `npm i @nestjs/config zod && npm i -D @types/node`
Expected: dependências adicionadas.

- [ ] **Step 2: Escrever teste que falha**

`config.schema.spec.ts`:
```ts
import { parseEnv } from './config.schema';

describe('parseEnv', () => {
  it('aceita env válido', () => {
    const cfg = parseEnv({
      DATABASE_URL: 'postgresql://x',
      KEYCLOAK_URL: 'http://localhost:8080',
      KEYCLOAK_REALM: 'caixa-familia',
      KEYCLOAK_CLIENT_ID: 'api-financial',
    });
    expect(cfg.KEYCLOAK_REALM).toBe('caixa-familia');
    expect(cfg.PORT).toBe(3000);
  });

  it('rejeita env sem DATABASE_URL', () => {
    expect(() => parseEnv({})).toThrow();
  });
});
```

- [ ] **Step 3: Rodar o teste e ver falhar**

Run: `npx nx test api-financial --testFile=config.schema.spec.ts`
Expected: FAIL (`parseEnv` não existe).

- [ ] **Step 4: Implementar `config.schema.ts`**

```ts
import { z } from 'zod';

export const configSchema = z.object({
  PORT: z.coerce.number().default(3000),
  WEB_ORIGIN: z.string().default('http://localhost:4200'),
  DATABASE_URL: z.string().min(1),
  KEYCLOAK_URL: z.string().url(),
  KEYCLOAK_REALM: z.string().min(1),
  KEYCLOAK_CLIENT_ID: z.string().min(1),
});

export type AppConfig = z.infer<typeof configSchema>;

export function parseEnv(env: Record<string, unknown>): AppConfig {
  return configSchema.parse(env);
}
```

- [ ] **Step 5: Implementar `config.module.ts`**

```ts
import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { parseEnv } from './config.schema';

@Global()
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, validate: parseEnv })],
})
export class AppConfigModule {}
```

- [ ] **Step 6: Rodar teste e ver passar**

Run: `npx nx test api-financial --testFile=config.schema.spec.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api-financial/src/infrastructure/config
git commit -m "feat(api-financial): zod-validated config module"
```

---

## Task 4: Prisma — setup e schema completo

**Files:**
- Create: `apps/api-financial/src/infrastructure/prisma/schema.prisma`
- Create: `apps/api-financial/src/infrastructure/prisma/prisma.service.ts`
- Modify: `package.json` (script `prisma`)

- [ ] **Step 1: Instalar Prisma**

Run: `npm i @prisma/client && npm i -D prisma`
Expected: deps adicionadas.

- [ ] **Step 2: Criar `schema.prisma`** (modelo completo do spec)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role { ADMIN EDITOR }
enum PaymentMethod { PIX CARD }
enum InstallmentStatus { PENDING PAID }
enum GoalType { SONHO EMERGENCIA }
enum InvoiceStatus { CLOSED PAID }

model Household {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
  members          Member[]
  categories       Category[]
  cards            Card[]
  incomes          Income[]
  fixedExpenses    FixedExpense[]
  transactions     Transaction[]
  installmentPlans InstallmentPlan[]
  installments     Installment[]
  goals            Goal[]
  goalContributions GoalContribution[]
  monthlySummaries MonthlySummary[]
  invoiceHistory   InvoiceHistory[]
}

model Member {
  id          String @id @default(cuid())
  householdId String
  household   Household @relation(fields: [householdId], references: [id])
  keycloakSub String @unique
  name        String
  role        Role   @default(EDITOR)
  color       String
  ownedCards    Card[]
  incomes       Income[]
  fixedExpenses FixedExpense[]
  transactions  Transaction[]
  @@index([householdId])
}

model Category {
  id          String @id @default(cuid())
  householdId String
  household   Household @relation(fields: [householdId], references: [id])
  slug        String
  label       String
  color       String
  budget      Decimal @db.Decimal(12, 2)
  fixedExpenses FixedExpense[]
  transactions  Transaction[]
  @@unique([householdId, slug])
  @@index([householdId])
}

model Card {
  id          String @id @default(cuid())
  householdId String
  household   Household @relation(fields: [householdId], references: [id])
  ownerMemberId String?
  owner       Member?  @relation(fields: [ownerMemberId], references: [id])
  name        String
  bank        String
  color       String
  closingDay  Int
  dueDay      Int
  creditLimit Decimal @db.Decimal(12, 2)
  last4       String
  transactions   Transaction[]
  invoiceHistory InvoiceHistory[]
  @@index([householdId])
}

model Income {
  id          String @id @default(cuid())
  householdId String
  household   Household @relation(fields: [householdId], references: [id])
  memberId    String?
  member      Member? @relation(fields: [memberId], references: [id])
  label       String
  value       Decimal @db.Decimal(12, 2)
  date        DateTime @db.Date
  recurring   Boolean  @default(false)
  @@index([householdId])
}

model FixedExpense {
  id          String @id @default(cuid())
  householdId String
  household   Household @relation(fields: [householdId], references: [id])
  categoryId  String
  category    Category @relation(fields: [categoryId], references: [id])
  memberId    String?
  member      Member? @relation(fields: [memberId], references: [id])
  label       String
  value       Decimal @db.Decimal(12, 2)
  dueDay      Int
  transactions Transaction[]
  @@index([householdId])
}

model InstallmentPlan {
  id          String @id @default(cuid())
  householdId String
  household   Household @relation(fields: [householdId], references: [id])
  totalCount  Int
  totalAmount Decimal @db.Decimal(12, 2)
  description String
  installments Installment[]
  @@index([householdId])
}

model Installment {
  id          String @id @default(cuid())
  householdId String
  household   Household @relation(fields: [householdId], references: [id])
  planId      String
  plan        InstallmentPlan @relation(fields: [planId], references: [id])
  number      Int
  dueDate     DateTime @db.Date
  amount      Decimal @db.Decimal(12, 2)
  status      InstallmentStatus @default(PENDING)
  transaction Transaction?
  @@unique([planId, number])
  @@index([householdId])
}

model Transaction {
  id          String @id @default(cuid())
  householdId String
  household   Household @relation(fields: [householdId], references: [id])
  date        DateTime @db.Date
  label       String
  value       Decimal @db.Decimal(12, 2)
  categoryId  String
  category    Category @relation(fields: [categoryId], references: [id])
  memberId    String?
  member      Member? @relation(fields: [memberId], references: [id])
  method      PaymentMethod
  cardId      String?
  card        Card? @relation(fields: [cardId], references: [id])
  note        String?
  recurring   Boolean @default(false)
  fixedExpenseId String?
  fixedExpense   FixedExpense? @relation(fields: [fixedExpenseId], references: [id])
  installmentId  String? @unique
  installment    Installment? @relation(fields: [installmentId], references: [id])
  goalContribution GoalContribution?
  createdAt   DateTime @default(now())
  @@index([householdId, date])
  @@index([householdId, cardId])
}

model Goal {
  id          String @id @default(cuid())
  householdId String
  household   Household @relation(fields: [householdId], references: [id])
  slug        String
  label       String
  target      Decimal @db.Decimal(12, 2)
  monthly     Decimal @db.Decimal(12, 2)
  color       String
  subtitle    String
  type        GoalType
  contributions GoalContribution[]
  @@unique([householdId, slug])
  @@index([householdId])
}

model GoalContribution {
  id          String @id @default(cuid())
  householdId String
  household   Household @relation(fields: [householdId], references: [id])
  goalId      String
  goal        Goal @relation(fields: [goalId], references: [id])
  amount      Decimal @db.Decimal(12, 2)
  date        DateTime @db.Date
  transactionId String? @unique
  transaction   Transaction? @relation(fields: [transactionId], references: [id])
  @@index([householdId])
}

model MonthlySummary {
  id           String @id @default(cuid())
  householdId  String
  household    Household @relation(fields: [householdId], references: [id])
  year         Int
  month        Int
  expenseTotal Decimal @db.Decimal(12, 2)
  incomeTotal  Decimal @db.Decimal(12, 2)
  perCategory  Json
  closed       Boolean @default(false)
  @@unique([householdId, year, month])
  @@index([householdId])
}

model InvoiceHistory {
  id          String @id @default(cuid())
  householdId String
  household   Household @relation(fields: [householdId], references: [id])
  cardId      String
  card        Card @relation(fields: [cardId], references: [id])
  year        Int
  month       Int
  closingDate DateTime @db.Date
  dueDate     DateTime @db.Date
  total       Decimal @db.Decimal(12, 2)
  perCategory Json
  status      InvoiceStatus @default(CLOSED)
  createdAt   DateTime @default(now())
  @@unique([householdId, cardId, year, month])
  @@index([householdId])
}
```

- [ ] **Step 3: Implementar `prisma.service.ts`**

```ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }
}
```

- [ ] **Step 4: Adicionar config do Prisma ao `package.json`**

Adicionar no `package.json` raiz:
```json
"prisma": {
  "schema": "apps/api-financial/src/infrastructure/prisma/schema.prisma",
  "seed": "ts-node apps/api-financial/src/infrastructure/prisma/seed.ts"
}
```

- [ ] **Step 5: Gerar client e validar schema**

Run:
```bash
npx prisma generate
npx prisma validate
```
Expected: `The schema is valid` e client gerado.

- [ ] **Step 6: Commit**

```bash
git add apps/api-financial/src/infrastructure/prisma package.json package-lock.json
git commit -m "feat(api-financial): prisma schema and service"
```

---

## Task 5: Migração inicial

**Files:**
- Create: `apps/api-financial/src/infrastructure/prisma/migrations/**` (gerado)

- [ ] **Step 1: Garantir Postgres no ar**

Run: `docker compose up -d postgres`
Expected: `cf-postgres` running.

- [ ] **Step 2: Criar a migração**

Run: `npx dotenv -e .env -- npx prisma migrate dev --name init`
(Se `dotenv-cli` não estiver instalado: `npm i -D dotenv-cli`.)
Expected: cria `migrations/<ts>_init/migration.sql` e aplica no banco; `Your database is now in sync with your schema`.

- [ ] **Step 3: Conferir tabelas**

Run: `npx prisma db pull --print`
Expected: lista todas as tabelas (Household, Member, Category, Card, ...).

- [ ] **Step 4: Commit**

```bash
git add apps/api-financial/src/infrastructure/prisma/migrations
git commit -m "feat(api-financial): initial database migration"
```

---

## Task 6: Seed (mocks → DB)

**Files:**
- Create: `apps/api-financial/src/infrastructure/prisma/seed.ts`

- [ ] **Step 1: Escrever `seed.ts`**

Traduz `libs/shared-mocks`. Cria 1 household, 2 members (slug→keycloakSub previsível `mateus`/`thais` casando com o realm), categorias, cartões, incomes, fixos, transações (com installments e vínculos), goals + contribuições, e os 12 `MonthlySummary`.

```ts
import { PrismaClient, Role, PaymentMethod, InstallmentStatus, GoalType } from '@prisma/client';
import {
  MOCK_CARDS, MOCK_INCOMES, MOCK_CATEGORIES, MOCK_FIXED, MOCK_GOALS,
  MOCK_TRANSACTIONS, MOCK_HISTORY, MOCK_INCOME_HISTORY,
} from '../../../../../libs/shared-mocks/src/lib/shared-mocks';

const prisma = new PrismaClient();

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
function parseYM(label: string): { year: number; month: number } {
  const [mon, yy] = label.split('/');
  return { year: 2000 + Number(yy), month: MONTHS.indexOf(mon) + 1 };
}
function holderToMemberId(holder: string, ids: Record<string, string>): string | null {
  if (holder === 'Mateus') return ids.mateus;
  if (holder === 'Thais') return ids.thais;
  return null; // shared
}

async function main() {
  await prisma.$transaction([
    prisma.invoiceHistory.deleteMany(), prisma.monthlySummary.deleteMany(),
    prisma.goalContribution.deleteMany(), prisma.goal.deleteMany(),
    prisma.transaction.deleteMany(), prisma.installment.deleteMany(),
    prisma.installmentPlan.deleteMany(), prisma.fixedExpense.deleteMany(),
    prisma.income.deleteMany(), prisma.card.deleteMany(),
    prisma.category.deleteMany(), prisma.member.deleteMany(), prisma.household.deleteMany(),
  ]);

  const household = await prisma.household.create({ data: { name: 'Bispo & Fontes' } });
  const hid = household.id;

  const mateus = await prisma.member.create({
    data: { householdId: hid, keycloakSub: 'mateus', name: 'Mateus', role: Role.ADMIN, color: '#1F4E79' },
  });
  const thais = await prisma.member.create({
    data: { householdId: hid, keycloakSub: 'thais', name: 'Thais', role: Role.EDITOR, color: '#7A1F3D' },
  });
  const memberIds = { mateus: mateus.id, thais: thais.id };

  const catId: Record<string, string> = {};
  for (const c of MOCK_CATEGORIES) {
    const row = await prisma.category.create({
      data: { householdId: hid, slug: c.id, label: c.label, color: c.color, budget: c.budget },
    });
    catId[c.id] = row.id;
  }

  const cardId: Record<string, string> = {};
  for (const c of MOCK_CARDS) {
    const row = await prisma.card.create({
      data: {
        householdId: hid, ownerMemberId: holderToMemberId(c.holder, memberIds),
        name: c.name, bank: c.bank, color: c.color, closingDay: c.closing,
        dueDay: c.due, creditLimit: c.limit, last4: c.last4,
      },
    });
    cardId[c.id] = row.id;
  }

  for (const i of MOCK_INCOMES) {
    await prisma.income.create({
      data: {
        householdId: hid, memberId: holderToMemberId(i.holder, memberIds),
        label: i.label, value: i.value, date: new Date(i.date), recurring: i.recurring,
      },
    });
  }

  const fixedBySlug: Record<string, string> = {};
  for (const f of MOCK_FIXED) {
    const row = await prisma.fixedExpense.create({
      data: {
        householdId: hid, categoryId: catId[f.cat], memberId: holderToMemberId(f.holder, memberIds),
        label: f.label, value: f.value, dueDay: f.due,
      },
    });
    fixedBySlug[f.label] = row.id;
  }

  for (const t of MOCK_TRANSACTIONS) {
    let installmentId: string | undefined;
    if (t.installments) {
      const plan = await prisma.installmentPlan.create({
        data: {
          householdId: hid, totalCount: t.installments.of,
          totalAmount: t.value * t.installments.of, description: t.label,
        },
      });
      const inst = await prisma.installment.create({
        data: {
          householdId: hid, planId: plan.id, number: t.installments.n,
          dueDate: new Date(t.date), amount: t.value, status: InstallmentStatus.PAID,
        },
      });
      installmentId = inst.id;
    }
    const fixedExpenseId = t.recurring ? fixedBySlug[t.label] : undefined;
    await prisma.transaction.create({
      data: {
        householdId: hid, date: new Date(t.date), label: t.label, value: t.value,
        categoryId: catId[t.cat], memberId: holderToMemberId(t.holder, memberIds),
        method: t.method === 'pix' ? PaymentMethod.PIX : PaymentMethod.CARD,
        cardId: t.method === 'pix' ? undefined : cardId[t.method],
        recurring: t.recurring ?? false, fixedExpenseId, installmentId,
      },
    });
  }

  for (const g of MOCK_GOALS) {
    const goal = await prisma.goal.create({
      data: {
        householdId: hid, slug: g.id, label: g.label, target: g.target, monthly: g.monthly,
        color: g.color, subtitle: g.subtitle,
        type: g.type === 'emergencia' ? GoalType.EMERGENCIA : GoalType.SONHO,
      },
    });
    // history[] vira contribuições mensais retroativas (12 meses até Mai/26)
    g.history.forEach((amount, idx) => {
      const month = ((4 + idx) % 12) + 1;          // Jun/25..Mai/26
      const year = idx <= 7 ? 2025 : 2026;
      void prisma.goalContribution.create({
        data: { householdId: hid, goalId: goal.id, amount, date: new Date(year, month - 1, 22) },
      });
    });
  }
  // aguarda contribuições (await em loop para garantir ordem)
  // (substituir o void acima por await em implementação final)

  for (const h of MOCK_HISTORY) {
    const { year, month } = parseYM(h.m);
    const income = MOCK_INCOME_HISTORY.find((x) => x.m === h.m)?.total ?? 0;
    await prisma.monthlySummary.create({
      data: {
        householdId: hid, year, month, expenseTotal: h.total, incomeTotal: income,
        perCategory: {}, closed: true,
      },
    });
  }
  console.log('Seed concluído.');
}

main().finally(() => prisma.$disconnect());
```

> Nota de implementação: trocar o `void prisma.goalContribution.create` por `await` (usar `for...of` em vez de `forEach`) para garantir persistência antes do disconnect.

- [ ] **Step 2: Rodar o seed**

Run: `npx dotenv -e .env -- npx prisma db seed`
Expected: `Seed concluído.` sem erros.

- [ ] **Step 3: Conferir contagem**

Run:
```bash
npx dotenv -e .env -- npx prisma studio
```
Expected (visual): 33 transactions, 7 cards, 11 categories, 2 goals, 12 monthly summaries.

- [ ] **Step 4: Commit**

```bash
git add apps/api-financial/src/infrastructure/prisma/seed.ts package.json
git commit -m "feat(api-financial): seed database from shared mocks"
```

---

## Task 7: Shared kernel (Value Objects)

**Files:**
- Create: `apps/api-financial/src/shared-kernel/money.vo.ts`
- Create: `apps/api-financial/src/shared-kernel/billing-cycle.ts`
- Test: `apps/api-financial/src/shared-kernel/money.vo.spec.ts`
- Test: `apps/api-financial/src/shared-kernel/billing-cycle.spec.ts`

- [ ] **Step 1: Teste de `Money` que falha**

`money.vo.spec.ts`:
```ts
import { Money } from './money.vo';

describe('Money', () => {
  it('soma sem erro de ponto flutuante', () => {
    expect(Money.of(0.1).add(Money.of(0.2)).toNumber()).toBe(0.3);
  });
  it('rejeita NaN', () => {
    expect(() => Money.of(NaN)).toThrow();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx nx test api-financial --testFile=money.vo.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar `money.vo.ts`**

```ts
export class Money {
  private constructor(private readonly cents: number) {}
  static of(value: number): Money {
    if (Number.isNaN(value)) throw new Error('Money inválido: NaN');
    return new Money(Math.round(value * 100));
  }
  add(other: Money): Money { return new Money(this.cents + other.cents); }
  subtract(other: Money): Money { return new Money(this.cents - other.cents); }
  toNumber(): number { return this.cents / 100; }
}
```

- [ ] **Step 4: Teste de `billingCycle` que falha**

`billing-cycle.spec.ts`:
```ts
import { billingCycleFor } from './billing-cycle';

describe('billingCycleFor', () => {
  it('antes do fechamento: ciclo do mês corrente', () => {
    const ref = new Date(2026, 4, 3); // 3 mai, closing dia 5
    const cycle = billingCycleFor(5, ref);
    expect(cycle.end.getDate()).toBe(5);
    expect(cycle.end.getMonth()).toBe(4);
  });
  it('depois do fechamento: ciclo vai para o próximo mês', () => {
    const ref = new Date(2026, 4, 10); // 10 mai, closing dia 5
    const cycle = billingCycleFor(5, ref);
    expect(cycle.end.getMonth()).toBe(5); // junho
  });
});
```

- [ ] **Step 5: Rodar e ver falhar**

Run: `npx nx test api-financial --testFile=billing-cycle.spec.ts`
Expected: FAIL.

- [ ] **Step 6: Implementar `billing-cycle.ts`**

```ts
export interface BillingCycle { start: Date; end: Date; }

export function billingCycleFor(closingDay: number, ref: Date = new Date()): BillingCycle {
  const y = ref.getFullYear();
  const m = ref.getMonth();
  let end = new Date(y, m, closingDay);
  if (ref.getDate() > closingDay) end = new Date(y, m + 1, closingDay);
  const start = new Date(end.getFullYear(), end.getMonth() - 1, closingDay + 1);
  return { start, end };
}
```

- [ ] **Step 7: Rodar testes e ver passar**

Run: `npx nx test api-financial --testFile=money.vo.spec.ts && npx nx test api-financial --testFile=billing-cycle.spec.ts`
Expected: PASS nos dois.

- [ ] **Step 8: Commit**

```bash
git add apps/api-financial/src/shared-kernel
git commit -m "feat(api-financial): shared-kernel money and billing-cycle value objects"
```

---

## Task 8: Auth — JWT strategy + guard (Keycloak)

**Files:**
- Create: `apps/api-financial/src/infrastructure/auth/jwt.strategy.ts`
- Create: `apps/api-financial/src/infrastructure/auth/jwt-auth.guard.ts`
- Create: `apps/api-financial/src/infrastructure/auth/roles.guard.ts`
- Create: `apps/api-financial/src/infrastructure/auth/roles.decorator.ts`
- Create: `apps/api-financial/src/infrastructure/auth/auth.module.ts`
- Test: `apps/api-financial/src/infrastructure/auth/roles.guard.spec.ts`

- [ ] **Step 1: Instalar deps**

Run: `npm i @nestjs/passport passport passport-jwt jwks-rsa @nestjs/jwt && npm i -D @types/passport-jwt`
Expected: deps adicionadas.

- [ ] **Step 2: Implementar `jwt.strategy.ts`** (valida assinatura via JWKS do realm)

```ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';

export interface JwtPayload {
  sub: string;
  preferred_username: string;
  name?: string;
  realm_access?: { roles: string[] };
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    const base = `${config.get('KEYCLOAK_URL')}/realms/${config.get('KEYCLOAK_REALM')}`;
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      algorithms: ['RS256'],
      issuer: base,
      secretOrKeyProvider: passportJwtSecret({
        cache: true, rateLimit: true, jwksRequestsPerMinute: 5,
        jwksUri: `${base}/protocol/openid-connect/certs`,
      }),
    });
  }
  validate(payload: JwtPayload): JwtPayload { return payload; }
}
```

- [ ] **Step 3: Implementar `jwt-auth.guard.ts` e `roles.decorator.ts`**

`jwt-auth.guard.ts`:
```ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

`roles.decorator.ts`:
```ts
import { SetMetadata } from '@nestjs/common';
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

- [ ] **Step 4: Teste de `roles.guard` que falha**

`roles.guard.spec.ts`:
```ts
import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';

function ctx(roles: string[]): ExecutionContext {
  return {
    getHandler: () => ({}), getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user: { realm_access: { roles } } }) }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('permite quando role exigido está presente', () => {
    const reflector = { getAllAndOverride: () => ['admin'] } as unknown as Reflector;
    expect(new RolesGuard(reflector).canActivate(ctx(['admin']))).toBe(true);
  });
  it('bloqueia quando role exigido falta', () => {
    const reflector = { getAllAndOverride: () => ['admin'] } as unknown as Reflector;
    expect(new RolesGuard(reflector).canActivate(ctx(['editor']))).toBe(false);
  });
  it('permite quando nenhum role é exigido', () => {
    const reflector = { getAllAndOverride: () => undefined } as unknown as Reflector;
    expect(new RolesGuard(reflector).canActivate(ctx([]))).toBe(true);
  });
});
```

- [ ] **Step 5: Rodar e ver falhar**

Run: `npx nx test api-financial --testFile=roles.guard.spec.ts`
Expected: FAIL.

- [ ] **Step 6: Implementar `roles.guard.ts`**

```ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(), context.getClass(),
    ]);
    if (!required || required.length === 0) return true;
    const { user } = context.switchToHttp().getRequest();
    const roles: string[] = user?.realm_access?.roles ?? [];
    return required.some((r) => roles.includes(r));
  }
}
```

- [ ] **Step 7: Implementar `auth.module.ts`** (registra strategy + guards globais)

```ts
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { APP_GUARD } from '@nestjs/core';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  providers: [
    JwtStrategy,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule {}
```

- [ ] **Step 8: Rodar testes e ver passar**

Run: `npx nx test api-financial --testFile=roles.guard.spec.ts`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add apps/api-financial/src/infrastructure/auth
git commit -m "feat(api-financial): keycloak jwt auth and roles guards"
```

---

## Task 9: TenantContext + Member JIT provisioning

**Files:**
- Create: `apps/api-financial/src/infrastructure/auth/tenant-context.ts`
- Create: `apps/api-financial/src/infrastructure/auth/tenant.interceptor.ts`
- Create: `apps/api-financial/src/infrastructure/auth/tenant-repository.base.ts`
- Test: `apps/api-financial/src/infrastructure/auth/tenant.interceptor.spec.ts`

- [ ] **Step 1: Implementar `tenant-context.ts`** (request-scoped)

```ts
import { Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.REQUEST })
export class TenantContext {
  memberId!: string;
  householdId!: string;
  role!: string;
  set(v: { memberId: string; householdId: string; role: string }) { Object.assign(this, v); }
}
```

- [ ] **Step 2: Teste do interceptor (JIT provisioning) que falha**

`tenant.interceptor.spec.ts`:
```ts
import { resolveMember } from './tenant.interceptor';

describe('resolveMember', () => {
  const payload = { sub: 'kc-123', preferred_username: 'mateus', name: 'Mateus', realm_access: { roles: ['admin'] } };

  it('retorna member existente', async () => {
    const prisma = { member: { findUnique: async () => ({ id: 'm1', householdId: 'h1', role: 'ADMIN' }) } };
    const res = await resolveMember(prisma as any, payload as any);
    expect(res).toEqual({ memberId: 'm1', householdId: 'h1', role: 'admin' });
  });

  it('provisiona member novo no primeiro login', async () => {
    const created = { id: 'm2', householdId: 'h2', role: 'EDITOR' };
    const prisma = {
      member: { findUnique: async () => null, create: async () => created },
      household: { create: async () => ({ id: 'h2' }) },
    };
    const res = await resolveMember(prisma as any, { ...payload, realm_access: { roles: ['editor'] } } as any);
    expect(res.householdId).toBe('h2');
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx nx test api-financial --testFile=tenant.interceptor.spec.ts`
Expected: FAIL.

- [ ] **Step 4: Implementar `tenant.interceptor.ts`**

```ts
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from './tenant-context';
import type { JwtPayload } from './jwt.strategy';

export async function resolveMember(prisma: PrismaService, payload: JwtPayload) {
  const existing = await prisma.member.findUnique({ where: { keycloakSub: payload.sub } });
  if (existing) {
    return { memberId: existing.id, householdId: existing.householdId, role: existing.role.toLowerCase() };
  }
  const household = await prisma.household.create({ data: { name: `${payload.name ?? payload.preferred_username} household` } });
  const isAdmin = payload.realm_access?.roles?.includes('admin');
  const member = await prisma.member.create({
    data: {
      householdId: household.id, keycloakSub: payload.sub,
      name: payload.name ?? payload.preferred_username,
      role: isAdmin ? 'ADMIN' : 'EDITOR', color: '#475569',
    },
  });
  return { memberId: member.id, householdId: member.householdId, role: member.role.toLowerCase() };
}

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService, private tenant: TenantContext) {}
  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const req = context.switchToHttp().getRequest();
    this.tenant.set(await resolveMember(this.prisma, req.user));
    return next.handle();
  }
}
```

> Nota: members do household principal já existem (seed com `keycloakSub` = `mateus`/`thais`). Em produção o `sub` real do Keycloak difere do username; ajustar o seed para o `sub` real ou mapear por `preferred_username` numa migração futura. Para o POC, basta que os 2 usuários do realm existam como members.

- [ ] **Step 5: Implementar `tenant-repository.base.ts`** (helper que injeta householdId)

```ts
import { TenantContext } from './tenant-context';
import { PrismaService } from '../prisma/prisma.service';

export abstract class TenantRepository {
  constructor(protected readonly prisma: PrismaService, protected readonly tenant: TenantContext) {}
  protected get householdId(): string { return this.tenant.householdId; }
  protected scoped<T extends object>(where?: T) {
    return { ...(where ?? {}), householdId: this.householdId } as T & { householdId: string };
  }
}
```

- [ ] **Step 6: Rodar testes e ver passar**

Run: `npx nx test api-financial --testFile=tenant.interceptor.spec.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api-financial/src/infrastructure/auth
git commit -m "feat(api-financial): tenant context with member JIT provisioning"
```

---

## Task 10: Wire-up do AppModule

**Files:**
- Modify: `apps/api-financial/src/app/app.module.ts`

- [ ] **Step 1: Montar o AppModule**

```ts
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppConfigModule } from '../infrastructure/config/config.module';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { AuthModule } from '../infrastructure/auth/auth.module';
import { TenantContext } from '../infrastructure/auth/tenant-context';
import { TenantInterceptor } from '../infrastructure/auth/tenant.interceptor';
import { CatalogModule } from '../modules/catalog/catalog.module';
import { LedgerModule } from '../modules/ledger/ledger.module';
import { BudgetingModule } from '../modules/budgeting/budgeting.module';
import { GoalsModule } from '../modules/goals/goals.module';
import { ReportingModule } from '../modules/reporting/reporting.module';

@Module({
  imports: [AppConfigModule, AuthModule, CatalogModule, LedgerModule, BudgetingModule, GoalsModule, ReportingModule],
  providers: [
    PrismaService,
    TenantContext,
    { provide: APP_INTERCEPTOR, useClass: TenantInterceptor },
  ],
  exports: [PrismaService, TenantContext],
})
export class AppModule {}
```

> Os imports dos módulos de domínio só compilam após as Tasks 11–16. Implemente-os antes de rodar o build desta task, ou comente os imports ainda não existentes e descomente conforme avança.

- [ ] **Step 2: Commit (após módulos existirem)**

```bash
git add apps/api-financial/src/app/app.module.ts
git commit -m "feat(api-financial): wire root module with tenant interceptor"
```

---

## Task 11: Módulo Catalog — Categories (REFERÊNCIA completa)

Este é o **módulo de referência**: implementa todas as 4 camadas DDD. Os módulos seguintes seguem exatamente este padrão.

**Files:**
- Create: `apps/api-financial/src/modules/catalog/category/domain/category.entity.ts`
- Create: `apps/api-financial/src/modules/catalog/category/domain/category.repository.ts`
- Create: `apps/api-financial/src/modules/catalog/category/application/list-categories.usecase.ts`
- Create: `apps/api-financial/src/modules/catalog/category/application/create-category.usecase.ts`
- Create: `apps/api-financial/src/modules/catalog/category/infrastructure/category.mapper.ts`
- Create: `apps/api-financial/src/modules/catalog/category/infrastructure/category.prisma.repository.ts`
- Create: `apps/api-financial/src/modules/catalog/category/interface/category.controller.ts`
- Create: `apps/api-financial/src/modules/catalog/category/interface/dto/create-category.dto.ts`
- Create: `apps/api-financial/src/modules/catalog/catalog.module.ts`
- Test: `apps/api-financial/src/modules/catalog/category/application/create-category.usecase.spec.ts`

- [ ] **Step 1: Domínio — entidade e porta**

`category.entity.ts`:
```ts
export interface CategoryProps {
  id: string; slug: string; label: string; color: string; budget: number;
}
export class Category {
  constructor(private readonly props: CategoryProps) {
    if (props.budget < 0) throw new Error('budget não pode ser negativo');
  }
  get id() { return this.props.id; }
  toJSON(): CategoryProps { return { ...this.props }; }
}
```

`category.repository.ts`:
```ts
import { Category } from './category.entity';

export interface CreateCategoryData { slug: string; label: string; color: string; budget: number; }

export abstract class CategoryRepository {
  abstract findAll(): Promise<Category[]>;
  abstract create(data: CreateCategoryData): Promise<Category>;
}
```

- [ ] **Step 2: Teste do use-case que falha**

`create-category.usecase.spec.ts`:
```ts
import { CreateCategoryUseCase } from './create-category.usecase';
import { Category } from '../domain/category.entity';

describe('CreateCategoryUseCase', () => {
  it('cria categoria via repositório', async () => {
    const repo = {
      create: jest.fn(async (d) => new Category({ id: 'c1', ...d })),
      findAll: jest.fn(),
    };
    const uc = new CreateCategoryUseCase(repo as any);
    const res = await uc.execute({ slug: 'mercado', label: 'Mercado', color: '#000', budget: 100 });
    expect(repo.create).toHaveBeenCalled();
    expect(res.toJSON().slug).toBe('mercado');
  });

  it('propaga erro de budget negativo', async () => {
    const repo = { create: jest.fn(async (d) => new Category({ id: 'c1', ...d })), findAll: jest.fn() };
    const uc = new CreateCategoryUseCase(repo as any);
    await expect(uc.execute({ slug: 's', label: 'L', color: '#000', budget: -1 })).rejects.toThrow();
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx nx test api-financial --testFile=create-category.usecase.spec.ts`
Expected: FAIL.

- [ ] **Step 4: Application — use-cases**

`list-categories.usecase.ts`:
```ts
import { Injectable } from '@nestjs/common';
import { CategoryRepository } from '../domain/category.repository';

@Injectable()
export class ListCategoriesUseCase {
  constructor(private readonly repo: CategoryRepository) {}
  execute() { return this.repo.findAll(); }
}
```

`create-category.usecase.ts`:
```ts
import { Injectable } from '@nestjs/common';
import { CategoryRepository, CreateCategoryData } from '../domain/category.repository';

@Injectable()
export class CreateCategoryUseCase {
  constructor(private readonly repo: CategoryRepository) {}
  execute(data: CreateCategoryData) { return this.repo.create(data); }
}
```

- [ ] **Step 5: Infrastructure — mapper e repo Prisma**

`category.mapper.ts`:
```ts
import { Category as PrismaCategory } from '@prisma/client';
import { Category } from '../domain/category.entity';

export const toDomain = (r: PrismaCategory): Category =>
  new Category({ id: r.id, slug: r.slug, label: r.label, color: r.color, budget: Number(r.budget) });
```

`category.prisma.repository.ts`:
```ts
import { Injectable } from '@nestjs/common';
import { TenantRepository } from '../../../../infrastructure/auth/tenant-repository.base';
import { CategoryRepository, CreateCategoryData } from '../domain/category.repository';
import { toDomain } from './category.mapper';

@Injectable()
export class CategoryPrismaRepository extends TenantRepository implements CategoryRepository {
  async findAll() {
    const rows = await this.prisma.category.findMany({ where: this.scoped(), orderBy: { label: 'asc' } });
    return rows.map(toDomain);
  }
  async create(data: CreateCategoryData) {
    const row = await this.prisma.category.create({ data: { ...data, householdId: this.householdId } });
    return toDomain(row);
  }
}
```

- [ ] **Step 6: Interface — DTO e controller**

`dto/create-category.dto.ts`:
```ts
import { IsHexColor, IsNumber, IsString, Min } from 'class-validator';
export class CreateCategoryDto {
  @IsString() slug!: string;
  @IsString() label!: string;
  @IsHexColor() color!: string;
  @IsNumber() @Min(0) budget!: number;
}
```

`category.controller.ts`:
```ts
import { Body, Controller, Get, Post, UseInterceptors } from '@nestjs/common';
import { TenantInterceptor } from '../../../../infrastructure/auth/tenant.interceptor';
import { Roles } from '../../../../infrastructure/auth/roles.decorator';
import { ListCategoriesUseCase } from '../application/list-categories.usecase';
import { CreateCategoryUseCase } from '../application/create-category.usecase';
import { CreateCategoryDto } from './dto/create-category.dto';

@Controller('categories')
@UseInterceptors(TenantInterceptor)
export class CategoryController {
  constructor(
    private readonly list: ListCategoriesUseCase,
    private readonly createUc: CreateCategoryUseCase,
  ) {}

  @Get()
  async findAll() { return (await this.list.execute()).map((c) => c.toJSON()); }

  @Post()
  @Roles('admin', 'editor')
  async create(@Body() dto: CreateCategoryDto) { return (await this.createUc.execute(dto)).toJSON(); }
}
```

- [ ] **Step 7: Módulo**

`catalog.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { TenantContext } from '../../infrastructure/auth/tenant-context';
import { CategoryController } from './category/interface/category.controller';
import { ListCategoriesUseCase } from './category/application/list-categories.usecase';
import { CreateCategoryUseCase } from './category/application/create-category.usecase';
import { CategoryRepository } from './category/domain/category.repository';
import { CategoryPrismaRepository } from './category/infrastructure/category.prisma.repository';

@Module({
  controllers: [CategoryController],
  providers: [
    PrismaService, TenantContext,
    ListCategoriesUseCase, CreateCategoryUseCase,
    { provide: CategoryRepository, useClass: CategoryPrismaRepository },
  ],
})
export class CatalogModule {}
```

- [ ] **Step 8: Rodar teste e ver passar**

Run: `npx nx test api-financial --testFile=create-category.usecase.spec.ts`
Expected: PASS.

- [ ] **Step 9: Build**

Run: `npx nx build api-financial`
Expected: build verde (descomente `CatalogModule` no AppModule).

- [ ] **Step 10: Commit**

```bash
git add apps/api-financial/src/modules/catalog apps/api-financial/src/app/app.module.ts
git commit -m "feat(api-financial): catalog categories module (DDD reference)"
```

---

## Task 12: Catalog — Cards (+ fatura derivada)

Segue o padrão da Task 11. Card adiciona a query de **fatura do ciclo aberto** (derivada) usando `billingCycleFor`.

**Files:** mesma estrutura em `modules/catalog/card/**` + endpoint de fatura.

Entidade `Card` (props): `id, name, bank, color, closingDay, dueDay, creditLimit, last4, ownerMemberId, current` (current calculado, não persistido).

- [ ] **Step 1: Porta `CardRepository`**

```ts
import { Card } from './card.entity';
export abstract class CardRepository {
  abstract findAll(): Promise<Card[]>;
  abstract openInvoice(cardId: string): Promise<{ total: number; items: InvoiceItem[] }>;
}
export interface InvoiceItem { id: string; date: string; label: string; value: number; categorySlug: string; }
```

- [ ] **Step 2: Teste do use-case `GetOpenInvoiceUseCase` que falha**

```ts
import { GetOpenInvoiceUseCase } from './get-open-invoice.usecase';
describe('GetOpenInvoiceUseCase', () => {
  it('retorna total e itens do repositório', async () => {
    const repo = { openInvoice: jest.fn(async () => ({ total: 100, items: [] })), findAll: jest.fn() };
    const res = await new GetOpenInvoiceUseCase(repo as any).execute('nu-t');
    expect(res.total).toBe(100);
  });
});
```

Run: `npx nx test api-financial --testFile=get-open-invoice.usecase.spec.ts` → FAIL.

- [ ] **Step 3: Implementar use-cases** `ListCardsUseCase` e `GetOpenInvoiceUseCase` (delegam ao repo, padrão da Task 11).

- [ ] **Step 4: Repo Prisma com `current` derivado e `openInvoice`**

```ts
async findAll() {
  const cards = await this.prisma.card.findMany({ where: this.scoped() });
  return Promise.all(cards.map(async (c) => {
    const { start, end } = billingCycleFor(c.closingDay);
    const agg = await this.prisma.transaction.aggregate({
      _sum: { value: true },
      where: { householdId: this.householdId, cardId: c.id, date: { gt: start, lte: end } },
    });
    return toDomain(c, Number(agg._sum.value ?? 0));
  }));
}
async openInvoice(cardId: string) {
  const card = await this.prisma.card.findFirstOrThrow({ where: this.scoped({ id: cardId }) });
  const { start, end } = billingCycleFor(card.closingDay);
  const items = await this.prisma.transaction.findMany({
    where: { householdId: this.householdId, cardId, date: { gt: start, lte: end } },
    include: { category: true }, orderBy: { date: 'desc' },
  });
  const total = items.reduce((s, t) => s + Number(t.value), 0);
  return { total, items: items.map((t) => ({ id: t.id, date: t.date.toISOString().slice(0,10), label: t.label, value: Number(t.value), categorySlug: t.category.slug })) };
}
```

- [ ] **Step 5: Controller** `GET /cards`, `GET /cards/:id/invoice`. Build verde.

- [ ] **Step 6: Commit**

```bash
git add apps/api-financial/src/modules/catalog/card
git commit -m "feat(api-financial): cards module with derived open invoice"
```

---

## Task 13: Ledger — Transactions (+ installments)

Segue o padrão. Maior módulo: filtros e criação com installment opcional.

**Files:** `modules/ledger/transaction/**`.

Entidade `Transaction` props: `id, date, label, value, categorySlug, memberId|null, method('PIX'|'CARD'), cardId|null, note?, recurring, fixedExpenseId?, installments:{n,of}|null` (o shape de saída espelha `libs/shared-types` para o frontend).

- [ ] **Step 1: Porta**

```ts
export interface TxFilter { year?: number; month?: number; holder?: string; categorySlug?: string; method?: string; }
export abstract class TransactionRepository {
  abstract findAll(filter: TxFilter): Promise<TransactionView[]>;
  abstract create(data: CreateTransactionData): Promise<TransactionView>;
  abstract remove(id: string): Promise<void>;
}
```
(`TransactionView` e `CreateTransactionData` definidos no mesmo arquivo, espelhando os campos acima.)

- [ ] **Step 2: Teste do use-case `ListTransactionsUseCase` que falha** (mock repo retornando 1 item; assert filtro repassado). Run → FAIL.

- [ ] **Step 3: Use-cases** `ListTransactionsUseCase`, `CreateTransactionUseCase`, `RemoveTransactionUseCase`.

- [ ] **Step 4: Repo Prisma**
- `findAll`: monta `where` scoped com filtros (`date` por ano/mês via range, `memberId` por holder, `category.slug`, `method`); inclui `installment.plan` e `category`; mapeia para o shape `{ n: installment.number, of: plan.totalCount }`.
- `create`: dentro de `prisma.$transaction`, se vier installments, cria `InstallmentPlan` + a `Installment` da parcela e liga; resolve `categoryId` por slug; grava transaction scoped.

- [ ] **Step 5: Controller** `GET /transactions` (query DTO com `@IsOptional` em year/month/holder/cat/method), `POST /transactions`, `DELETE /transactions/:id`. Build verde.

- [ ] **Step 6: Teste de integração** `transaction.e2e.spec.ts`: com DB seedado, `GET /transactions?year=2026&month=5` retorna 33 itens. Run → PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api-financial/src/modules/ledger/transaction
git commit -m "feat(api-financial): transactions module with installments"
```

---

## Task 14: Ledger — Incomes

Padrão da Task 11, entidade simples.

**Files:** `modules/ledger/income/**`.

Props: `id, label, memberId|null, value, date, recurring`.

- [ ] **Step 1: Porta** `IncomeRepository { findAll(): Promise<Income[]>; create(data): Promise<Income>; }`.
- [ ] **Step 2: Teste do `CreateIncomeUseCase`** (mock repo). Run → FAIL.
- [ ] **Step 3: Use-cases** `ListIncomesUseCase`, `CreateIncomeUseCase`.
- [ ] **Step 4: Repo Prisma** scoped (`findMany`/`create`).
- [ ] **Step 5: Controller** `GET/POST /incomes` (DTO: `@IsString label`, `@IsNumber value`, `@IsDateString date`, `@IsBoolean recurring`, `@IsOptional memberId`). Build verde.
- [ ] **Step 6: Commit**

```bash
git add apps/api-financial/src/modules/ledger/income
git commit -m "feat(api-financial): incomes module"
```

---

## Task 15: Budgeting — FixedExpenses (+ status pago)

Padrão da Task 11 + query que cruza com transactions via `fixedExpenseId` (decisão #3).

**Files:** `modules/budgeting/fixed-expense/**`.

Props: `id, label, value, dueDay, categorySlug, memberId|null, paidThisMonth:boolean` (derivado).

- [ ] **Step 1: Porta** `FixedExpenseRepository { findAllWithStatus(year, month): Promise<FixedExpenseView[]>; create(data): Promise<FixedExpenseView>; }`.
- [ ] **Step 2: Teste do use-case `ListFixedExpensesUseCase`** (mock repo retorna 1 pago + 1 pendente). Run → FAIL.
- [ ] **Step 3: Use-cases** `ListFixedExpensesUseCase`, `CreateFixedExpenseUseCase`.
- [ ] **Step 4: Repo Prisma** — `findAllWithStatus`: busca fixos scoped; para cada um, `paidThisMonth = await prisma.transaction.count({ where: { householdId, fixedExpenseId: f.id, date: {range do mês} } }) > 0`.
- [ ] **Step 5: Controller** `GET /fixed-expenses?year&month`, `POST /fixed-expenses`. Build verde.
- [ ] **Step 6: Commit**

```bash
git add apps/api-financial/src/modules/budgeting
git commit -m "feat(api-financial): fixed expenses module with paid-status linking"
```

---

## Task 16: Goals + GoalContributions

Padrão da Task 11. `balance` e `history` derivados das contribuições (decisão #4).

**Files:** `modules/goals/**`.

Goal view props: `id, slug, label, target, monthly, color, subtitle, type, balance(derivado), history:number[](derivado, 12 meses)`.

- [ ] **Step 1: Porta** `GoalRepository { findAll(): Promise<GoalView[]>; addContribution(goalId, data): Promise<void>; }`.
- [ ] **Step 2: Teste do `AddContributionUseCase`** (mock repo; assert chamada). Run → FAIL.
- [ ] **Step 3: Use-cases** `ListGoalsUseCase`, `AddContributionUseCase`.
- [ ] **Step 4: Repo Prisma** — `findAll`: busca goals com `contributions`; `balance = sum(amount)`; `history` = soma por mês dos últimos 12 meses. `addContribution`: cria `GoalContribution` scoped.
- [ ] **Step 5: Controller** `GET /goals`, `POST /goals/:id/contributions` (DTO: `@IsNumber amount`, `@IsDateString date`). Build verde.
- [ ] **Step 6: Commit**

```bash
git add apps/api-financial/src/modules/goals
git commit -m "feat(api-financial): goals module with derived balance and contributions"
```

---

## Task 17: Reporting — MonthlySummary + close-month

Padrão da Task 11. Leitura dos snapshots + use-case de fechamento (decisão de snapshot).

**Files:** `modules/reporting/monthly-summary/**`.

- [ ] **Step 1: Porta** `MonthlySummaryRepository { findAll(): Promise<MonthlySummaryView[]>; closeMonth(year, month): Promise<MonthlySummaryView>; }`.
- [ ] **Step 2: Teste do `CloseMonthUseCase`** (mock repo; assert agrega e grava). Run → FAIL.
- [ ] **Step 3: Use-cases** `ListMonthlySummariesUseCase`, `CloseMonthUseCase`.
- [ ] **Step 4: Repo Prisma** — `findAll`: snapshots scoped ordenados por year/month. `closeMonth`: agrega `transaction`/`income` do mês, monta `perCategory`, faz `upsert` no `MonthlySummary` (`closed: true`).
- [ ] **Step 5: Controller** `GET /reports/monthly`, `POST /reports/monthly/close` (`@Roles('admin')`, body year/month). Build verde.
- [ ] **Step 6: Commit**

```bash
git add apps/api-financial/src/modules/reporting/monthly-summary
git commit -m "feat(api-financial): monthly summary reporting with close-month"
```

---

## Task 18: Reporting — InvoiceHistory + close-invoice

Padrão da Task 11. Snapshot de fatura fechada (decisão #2 híbrida).

**Files:** `modules/reporting/invoice-history/**`.

- [ ] **Step 1: Porta** `InvoiceHistoryRepository { findByCard(cardId): Promise<InvoiceHistoryView[]>; closeInvoice(cardId, year, month): Promise<InvoiceHistoryView>; }`.
- [ ] **Step 2: Teste do `CloseInvoiceUseCase`** (mock repo; assert consolida ciclo e grava). Run → FAIL.
- [ ] **Step 3: Use-cases** `ListCardInvoicesUseCase`, `CloseInvoiceUseCase`.
- [ ] **Step 4: Repo Prisma** — `closeInvoice`: usa `billingCycleFor(card.closingDay)` para o mês alvo, agrega transactions `CARD` do ciclo, monta `perCategory` e `total`, calcula `closingDate`/`dueDate`, faz `upsert` em `InvoiceHistory`. `findByCard`: snapshots scoped do cartão.
- [ ] **Step 5: Controller** `GET /cards/:id/invoices`, `POST /cards/:id/invoices/close` (`@Roles('admin')`). Build verde.
- [ ] **Step 6: Commit**

```bash
git add apps/api-financial/src/modules/reporting/invoice-history
git commit -m "feat(api-financial): invoice history snapshots with close-invoice"
```

---

## Task 19: Verificação end-to-end (smoke)

**Files:**
- Create: `apps/api-financial/src/app/app.e2e.spec.ts`

- [ ] **Step 1: Helper de token** — gerar JWT real do Keycloak via password grant:

```ts
async function getToken(user = 'mateus', pass = 'mateus'): Promise<string> {
  const body = new URLSearchParams({
    grant_type: 'password', client_id: 'ui-financial', username: user, password: pass,
  });
  const res = await fetch('http://localhost:8080/realms/caixa-familia/protocol/openid-connect/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
  });
  return (await res.json()).access_token;
}
```

- [ ] **Step 2: Teste e2e**

```ts
it('GET /api/transactions retorna 33 lançamentos autenticado', async () => {
  const token = await getToken();
  const res = await fetch('http://localhost:3000/api/transactions?year=2026&month=5', {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.status).toBe(200);
  expect((await res.json()).length).toBe(33);
});

it('rejeita sem token', async () => {
  const res = await fetch('http://localhost:3000/api/transactions');
  expect(res.status).toBe(401);
});
```

- [ ] **Step 3: Subir tudo e rodar**

Run:
```bash
docker compose up -d
npx dotenv -e .env -- npx prisma migrate deploy
npx dotenv -e .env -- npx prisma db seed
npx nx serve api-financial &
npx nx test api-financial --testFile=app.e2e.spec.ts
```
Expected: ambos os testes PASS.

> Nota: o seed cria members com `keycloakSub` = `mateus`/`thais`. Garanta que o `sub` do token bata — se o Keycloak emitir `sub` UUID, ajuste o `resolveMember` para casar por `preferred_username` no POC, ou atualize os members com o `sub` real após o primeiro login.

- [ ] **Step 4: Commit**

```bash
git add apps/api-financial/src/app/app.e2e.spec.ts
git commit -m "test(api-financial): end-to-end smoke tests"
```

---

## Definition of Done

- [ ] `docker compose up` sobe Postgres + Keycloak; realm `caixa-familia` importado.
- [ ] `prisma migrate` + `prisma db seed` populam o household com os mocks (33 transações, 7 cartões, 11 categorias, 2 metas, 12 summaries).
- [ ] `npx nx build api-financial` verde; `npx nx test api-financial` verde (unit + e2e).
- [ ] Todos os endpoints exigem JWT do Keycloak e isolam por `householdId`.
- [ ] Fatura do ciclo aberto derivada; `InvoiceHistory`/`MonthlySummary` materializáveis via use-case.
- [ ] Nenhum endpoint aceita `householdId` do cliente.
- [ ] `card.current`, fatura aberta e `daysUntilClosing` derivados (não persistidos).

## Notas / riscos

- **Mapeamento `sub` Keycloak ↔ Member:** o ponto mais frágil. O seed usa `mateus`/`thais` como `keycloakSub`; o `sub` real é UUID. Resolver no POC casando por `preferred_username` ou atualizando o member no 1º login (ver nota da Task 9/19).
- **Testes de integração** exigem Docker no ar; mantê-los separados dos unitários (que rodam sem DB).
- **`perCategory` jsonb** nos snapshots: formato `{ [categorySlug]: number }` — manter consistente entre `closeMonth` e `closeInvoice`.
- **Decimal do Prisma** retorna objeto `Decimal`; sempre `Number(x)` nos mappers para bater com o shape do frontend.
