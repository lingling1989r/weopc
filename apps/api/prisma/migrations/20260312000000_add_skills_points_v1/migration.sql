-- Skill Marketplace V1 Migration
-- Generated at: 2026-03-12

-- Add new PointsActionType values
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'SIGNUP_BONUS' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'PointsActionType')) THEN
    ALTER TYPE "PointsActionType" ADD VALUE 'SIGNUP_BONUS';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'INVITE_INVITER' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'PointsActionType')) THEN
    ALTER TYPE "PointsActionType" ADD VALUE 'INVITE_INVITER';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'INVITE_INVITEE' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'PointsActionType')) THEN
    ALTER TYPE "PointsActionType" ADD VALUE 'INVITE_INVITEE';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'SKILL_SUBMIT' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'PointsActionType')) THEN
    ALTER TYPE "PointsActionType" ADD VALUE 'SKILL_SUBMIT';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'SKILL_APPROVED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'PointsActionType')) THEN
    ALTER TYPE "PointsActionType" ADD VALUE 'SKILL_APPROVED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'SKILL_REDEEM' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'PointsActionType')) THEN
    ALTER TYPE "PointsActionType" ADD VALUE 'SKILL_REDEEM';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ADMIN_DEDUCT' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'PointsActionType')) THEN
    ALTER TYPE "PointsActionType" ADD VALUE 'ADMIN_DEDUCT';
  END IF;
END $$;

-- Add SkillReviewStatus enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'SkillReviewStatus'
  ) THEN
    CREATE TYPE "SkillReviewStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED');
  END IF;
END $$;

-- Add inviterUserId to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "inviterUserId" TEXT;

-- Add inviteeUserId to InvitationCode
ALTER TABLE "InvitationCode" ADD COLUMN IF NOT EXISTS "inviteeUserId" TEXT;

-- Add refType to UserPoints for idempotency
ALTER TABLE "UserPoints" ADD COLUMN IF NOT EXISTS "refType" TEXT;

-- Create Skill table
CREATE TABLE IF NOT EXISTS "Skill" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "content" TEXT,
    "category" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pricePoints" INTEGER NOT NULL DEFAULT 0,
    "reviewStatus" "SkillReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "reviewNote" TEXT,
    "reviewerContact" TEXT,
    "ownerUserId" TEXT NOT NULL,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create SkillRedemption table
CREATE TABLE IF NOT EXISTS "SkillRedemption" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "costPoints" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("userId", "skillId")
);

-- Add foreign keys
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_ownerUserId_fkey" 
    FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SkillRedemption" ADD CONSTRAINT "SkillRedemption_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SkillRedemption" ADD CONSTRAINT "SkillRedemption_skillId_fkey" 
    FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create indexes
CREATE INDEX IF NOT EXISTS "Skill_ownerUserId_idx" ON "Skill"("ownerUserId");
CREATE INDEX IF NOT EXISTS "Skill_reviewStatus_idx" ON "Skill"("reviewStatus");
CREATE INDEX IF NOT EXISTS "Skill_category_idx" ON "Skill"("category");
CREATE INDEX IF NOT EXISTS "SkillRedemption_userId_idx" ON "SkillRedemption"("userId");
CREATE INDEX IF NOT EXISTS "SkillRedemption_skillId_idx" ON "SkillRedemption"("skillId");
