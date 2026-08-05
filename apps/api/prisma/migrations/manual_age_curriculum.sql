-- Age-based curriculum fields for Parent & Child
-- Run: npm run db:push -w @brightpath/api   (or prisma migrate)

DO $$ BEGIN
  CREATE TYPE "AgeGroup" AS ENUM ('TODDLER_1_3', 'EARLY_4_7', 'UPPER_ELEM_8_10', 'MIDDLE_11_14');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "Parent"
  ADD COLUMN IF NOT EXISTS "dateOfBirth" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "calculatedAgeGroup" "AgeGroup",
  ADD COLUMN IF NOT EXISTS "unlockedSubjects" TEXT[] DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "Child"
  ADD COLUMN IF NOT EXISTS "dateOfBirth" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "calculatedAgeGroup" "AgeGroup" NOT NULL DEFAULT 'EARLY_4_7',
  ADD COLUMN IF NOT EXISTS "unlockedSubjects" TEXT[] DEFAULT ARRAY[]::TEXT[];
