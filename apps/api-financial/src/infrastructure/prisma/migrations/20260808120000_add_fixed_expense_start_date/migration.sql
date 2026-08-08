-- AlterTable
-- Entra nulo para o backfill e só depois vira NOT NULL: a coluna não tem default
-- e a tabela pode já ter linhas.
ALTER TABLE "FixedExpense" ADD COLUMN "startDate" DATE;

-- Os fixos que já existem sempre foram devidos em todo mês. Uma data bem antiga
-- preserva exatamente esse comportamento em vez de esconder contas de meses que
-- o casal já usava.
UPDATE "FixedExpense" SET "startDate" = DATE '2000-01-01' WHERE "startDate" IS NULL;

ALTER TABLE "FixedExpense" ALTER COLUMN "startDate" SET NOT NULL;
