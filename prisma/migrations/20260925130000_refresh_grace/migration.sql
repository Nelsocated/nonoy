-- AlterTable
ALTER TABLE "users" ADD COLUMN     "previousRefreshTokenHash" TEXT,
ADD COLUMN     "refreshRotatedAt" TIMESTAMP(3);
