-- Add lightweight class start tracking without changing the class status lifecycle.
ALTER TABLE "ClassSession" ADD COLUMN "startedAt" TIMESTAMP(3);
ALTER TABLE "ClassSession" ADD COLUMN "startedByUserId" TEXT;

CREATE INDEX "ClassSession_startedAt_idx" ON "ClassSession"("startedAt");
