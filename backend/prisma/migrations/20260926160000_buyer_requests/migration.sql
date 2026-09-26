-- CreateEnum
CREATE TYPE "BuyerRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'MERGED', 'REJECTED');

-- AlterTable
ALTER TABLE "sales" ADD COLUMN "buyerRequestId" TEXT;

-- CreateTable
CREATE TABLE "buyer_requests" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "requestedById" TEXT NOT NULL,
    "createdAtClient" TIMESTAMP(3) NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "BuyerRequestStatus" NOT NULL DEFAULT 'PENDING',
    "buyerId" TEXT,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "buyer_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "buyer_requests_status_idx" ON "buyer_requests"("status");

-- CreateIndex
CREATE INDEX "buyer_requests_requestedById_idx" ON "buyer_requests"("requestedById");

-- CreateIndex
CREATE INDEX "sales_buyerRequestId_idx" ON "sales"("buyerRequestId");

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_buyerRequestId_fkey" FOREIGN KEY ("buyerRequestId") REFERENCES "buyer_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buyer_requests" ADD CONSTRAINT "buyer_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buyer_requests" ADD CONSTRAINT "buyer_requests_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "buyers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buyer_requests" ADD CONSTRAINT "buyer_requests_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
