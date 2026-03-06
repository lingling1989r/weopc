/*
  Warnings:

  - You are about to drop the column `source` on the `Link` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "UserLevel" AS ENUM ('NORMAL', 'OFFICIAL', 'GOLD', 'KING');

-- AlterTable
ALTER TABLE "Link" DROP COLUMN "source";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avgRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "certifiedBy" TEXT,
ADD COLUMN     "level" "UserLevel" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "levelExpiresAt" TIMESTAMP(3),
ADD COLUMN     "officialCertifiedAt" TIMESTAMP(3),
ADD COLUMN     "reviewCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "User_level_idx" ON "User"("level");

-- CreateIndex
CREATE INDEX "User_avgRating_idx" ON "User"("avgRating");

-- CreateIndex
CREATE INDEX "User_reviewCount_idx" ON "User"("reviewCount");
