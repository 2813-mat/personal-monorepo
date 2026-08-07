-- AlterTable
ALTER TABLE "Income" ADD COLUMN     "recurringIncomeId" TEXT;

-- CreateTable
CREATE TABLE "RecurringIncome" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "memberId" TEXT,
    "label" TEXT NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "day" INTEGER NOT NULL,
    "startDate" DATE NOT NULL,
    "materializedThrough" DATE,

    CONSTRAINT "RecurringIncome_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecurringIncome_householdId_idx" ON "RecurringIncome"("householdId");

-- CreateIndex
CREATE UNIQUE INDEX "Income_recurringIncomeId_date_key" ON "Income"("recurringIncomeId", "date");

-- AddForeignKey
ALTER TABLE "Income" ADD CONSTRAINT "Income_recurringIncomeId_fkey" FOREIGN KEY ("recurringIncomeId") REFERENCES "RecurringIncome"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringIncome" ADD CONSTRAINT "RecurringIncome_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringIncome" ADD CONSTRAINT "RecurringIncome_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

