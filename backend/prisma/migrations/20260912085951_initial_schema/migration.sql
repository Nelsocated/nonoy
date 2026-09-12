-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'WORKER', 'ADMIN');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'QR');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('SYNCED', 'CONFLICT');

-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('PICKUP_STARTED', 'SALE_RECORDED', 'RECOUNT_PERFORMED', 'TRIP_ENDED', 'EXPENSE_RECORDED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plantations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plantations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buyers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "buyers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trips" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "createdAtClient" TIMESTAMP(3) NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pickups" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "plantationId" TEXT NOT NULL,
    "chickenCount" INTEGER NOT NULL,
    "totalKilo" DECIMAL(10,2) NOT NULL,
    "createdAtClient" TIMESTAMP(3) NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pickups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "buyerId" TEXT,
    "chickenCount" INTEGER NOT NULL,
    "totalKilo" DECIMAL(10,2) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "createdAtClient" TIMESTAMP(3) NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'SYNCED',
    "conflictReason" TEXT,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recounts" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "countedChicken" INTEGER NOT NULL,
    "countedKilo" DECIMAL(10,2) NOT NULL,
    "expectedChicken" INTEGER NOT NULL,
    "expectedKilo" DECIMAL(10,2) NOT NULL,
    "discrepancyFlagged" BOOLEAN NOT NULL DEFAULT false,
    "createdAtClient" TIMESTAMP(3) NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "createdAtClient" TIMESTAMP(3) NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "tripId" TEXT,
    "actionType" "ActionType" NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAtClient" TIMESTAMP(3) NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "trips_clientId_key" ON "trips"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "pickups_clientId_key" ON "pickups"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "sales_clientId_key" ON "sales"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "recounts_clientId_key" ON "recounts"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "expenses_clientId_key" ON "expenses"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "activity_logs_clientId_key" ON "activity_logs"("clientId");

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickups" ADD CONSTRAINT "pickups_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickups" ADD CONSTRAINT "pickups_plantationId_fkey" FOREIGN KEY ("plantationId") REFERENCES "plantations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "buyers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recounts" ADD CONSTRAINT "recounts_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;
