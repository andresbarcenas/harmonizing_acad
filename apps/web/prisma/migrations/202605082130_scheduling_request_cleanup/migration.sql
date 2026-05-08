-- Alter ClassSession default so standalone/manual sessions are single by default.
ALTER TABLE "ClassSession" ALTER COLUMN "type" SET DEFAULT 'SINGLE';

-- Add explicit review metadata for one-off class requests.
ALTER TABLE "ClassRequest"
  ADD COLUMN "internalNote" TEXT,
  ADD COLUMN "rejectionReason" TEXT;
