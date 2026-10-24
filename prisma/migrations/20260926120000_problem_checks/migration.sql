-- AlterTable
ALTER TABLE "recounts" ADD COLUMN     "checkNote" TEXT,
ADD COLUMN     "checkedAt" TIMESTAMP(3),
ADD COLUMN     "checkedById" TEXT;

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "checkNote" TEXT,
ADD COLUMN     "checkedAt" TIMESTAMP(3),
ADD COLUMN     "checkedById" TEXT;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_checkedById_fkey" FOREIGN KEY ("checkedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recounts" ADD CONSTRAINT "recounts_checkedById_fkey" FOREIGN KEY ("checkedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
