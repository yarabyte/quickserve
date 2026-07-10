-- AlterTable
ALTER TABLE "Order" ADD COLUMN "orderNumber" TEXT;

-- Backfill existing rows (if any)
UPDATE "Order" SET "orderNumber" = 'LEGACY-' || substr("id", 1, 8) WHERE "orderNumber" IS NULL;

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "orderNumber" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateTable
CREATE TABLE "SheetOutbox" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SheetOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SheetOutbox_processedAt_nextAttemptAt_idx" ON "SheetOutbox"("processedAt", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "SheetOutbox_restaurantId_idx" ON "SheetOutbox"("restaurantId");
