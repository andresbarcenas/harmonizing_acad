-- Publish controls for family-visible piano exam results.
ALTER TABLE "StudentExamAssessment" ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3);
ALTER TABLE "StudentExamAssessment" ADD COLUMN IF NOT EXISTS "publishedByUserId" TEXT;

CREATE INDEX IF NOT EXISTS "StudentExamAssessment_publishedAt_idx" ON "StudentExamAssessment"("publishedAt");
CREATE INDEX IF NOT EXISTS "StudentExamAssessment_publishedByUserId_idx" ON "StudentExamAssessment"("publishedByUserId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StudentExamAssessment_publishedByUserId_fkey') THEN
    ALTER TABLE "StudentExamAssessment"
      ADD CONSTRAINT "StudentExamAssessment_publishedByUserId_fkey"
      FOREIGN KEY ("publishedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
