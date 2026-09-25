-- CreateTable
CREATE TABLE "prices" (
    "id" TEXT NOT NULL,
    "pricePerKilo" DECIMAL(10,2) NOT NULL,
    "setById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "prices_createdAt_idx" ON "prices"("createdAt");

-- AddForeignKey
ALTER TABLE "prices" ADD CONSTRAINT "prices_setById_fkey" FOREIGN KEY ("setById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

