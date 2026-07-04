import { PrismaClient, Role, PaymentMethod, InstallmentStatus, GoalType } from '@prisma/client';
import {
  MOCK_CARDS, MOCK_INCOMES, MOCK_CATEGORIES, MOCK_FIXED, MOCK_GOALS,
  MOCK_TRANSACTIONS, MOCK_HISTORY, MOCK_INCOME_HISTORY,
} from '../../../../../libs/shared-mocks/src/lib/shared-mocks';

const prisma = new PrismaClient();

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
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

  const fixedByLabel: Record<string, string> = {};
  for (const f of MOCK_FIXED) {
    const row = await prisma.fixedExpense.create({
      data: {
        householdId: hid, categoryId: catId[f.cat], memberId: holderToMemberId(f.holder, memberIds),
        label: f.label, value: f.value, dueDay: f.due,
      },
    });
    fixedByLabel[f.label] = row.id;
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
    const fixedExpenseId = t.recurring ? fixedByLabel[t.label] : undefined;
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
    // history[] vira contribuições mensais retroativas (Jun/25..Mai/26)
    let idx = 0;
    for (const amount of g.history) {
      const month = ((4 + idx) % 12) + 1;          // Jun/25..Mai/26
      const year = idx <= 7 ? 2025 : 2026;
      await prisma.goalContribution.create({
        data: { householdId: hid, goalId: goal.id, amount, date: new Date(year, month - 1, 22) },
      });
      idx++;
    }
  }

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
