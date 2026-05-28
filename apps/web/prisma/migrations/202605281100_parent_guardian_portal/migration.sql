-- Parent/guardian portal support.
-- Existing student consent signatures are backfilled to the covered StudentProfile.

ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'PARENT';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'PARENT';

CREATE TABLE IF NOT EXISTS "ParentGuardianProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "phone" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ParentGuardianProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ParentGuardianProfile_userId_key" ON "ParentGuardianProfile"("userId");
CREATE INDEX IF NOT EXISTS "ParentGuardianProfile_createdAt_idx" ON "ParentGuardianProfile"("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ParentGuardianProfile_userId_fkey'
  ) THEN
    ALTER TABLE "ParentGuardianProfile"
      ADD CONSTRAINT "ParentGuardianProfile_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ParentStudentLink" (
  "id" TEXT NOT NULL,
  "parentId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "relationship" TEXT NOT NULL,
  "primaryContact" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ParentStudentLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ParentStudentLink_parentId_studentId_key" ON "ParentStudentLink"("parentId", "studentId");
CREATE INDEX IF NOT EXISTS "ParentStudentLink_studentId_idx" ON "ParentStudentLink"("studentId");
CREATE INDEX IF NOT EXISTS "ParentStudentLink_parentId_idx" ON "ParentStudentLink"("parentId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ParentStudentLink_parentId_fkey'
  ) THEN
    ALTER TABLE "ParentStudentLink"
      ADD CONSTRAINT "ParentStudentLink_parentId_fkey"
      FOREIGN KEY ("parentId") REFERENCES "ParentGuardianProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ParentStudentLink_studentId_fkey'
  ) THEN
    ALTER TABLE "ParentStudentLink"
      ADD CONSTRAINT "ParentStudentLink_studentId_fkey"
      FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "ConsentSignature" ADD COLUMN IF NOT EXISTS "studentId" TEXT;

UPDATE "ConsentSignature" AS cs
SET "studentId" = sp."id"
FROM "User" AS u
JOIN "StudentProfile" AS sp ON sp."userId" = u."id"
WHERE cs."userId" = u."id"
  AND cs."studentId" IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "ConsentSignature" WHERE "studentId" IS NULL) THEN
    RAISE EXCEPTION 'Cannot migrate ConsentSignature.studentId: some signatures are not linked to a student user.';
  END IF;
END $$;

ALTER TABLE "ConsentSignature" ALTER COLUMN "studentId" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ConsentSignature_studentId_fkey'
  ) THEN
    ALTER TABLE "ConsentSignature"
      ADD CONSTRAINT "ConsentSignature_studentId_fkey"
      FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DROP INDEX IF EXISTS "ConsentSignature_userId_documentId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "ConsentSignature_studentId_documentId_key" ON "ConsentSignature"("studentId", "documentId");
CREATE INDEX IF NOT EXISTS "ConsentSignature_studentId_signedAt_idx" ON "ConsentSignature"("studentId", "signedAt");
