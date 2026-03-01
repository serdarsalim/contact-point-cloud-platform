-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPERADMIN', 'ADMIN');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'ADMIN';

-- Backfill: any user who previously held org-level SUPERADMIN becomes global SUPERADMIN
UPDATE "User"
SET "role" = 'SUPERADMIN'
WHERE "id" IN (
  SELECT DISTINCT "userId"
  FROM "OrganizationMember"
  WHERE "role" = 'SUPERADMIN'
);

-- Remove legacy org-level SUPERADMIN memberships
DELETE FROM "OrganizationMember"
WHERE "role" = 'SUPERADMIN';
