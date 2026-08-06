-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "reviewed" BOOLEAN NOT NULL DEFAULT false;

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
