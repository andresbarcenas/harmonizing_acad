-- Add audited admin-to-teacher impersonation sessions for production troubleshooting.
DO $$
BEGIN
  CREATE TYPE "AdminImpersonationStatus" AS ENUM ('ACTIVE', 'ENDED', 'EXPIRED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "AdminImpersonationSession" (
  "id" TEXT NOT NULL,
  "adminUserId" TEXT NOT NULL,
  "targetUserId" TEXT NOT NULL,
  "targetRole" "Role" NOT NULL,
  "reason" TEXT NOT NULL,
  "status" "AdminImpersonationStatus" NOT NULL DEFAULT 'ACTIVE',
  "tokenHash" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "endedAt" TIMESTAMP(3),
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AdminImpersonationSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AdminImpersonationSession_tokenHash_key" ON "AdminImpersonationSession"("tokenHash");
CREATE INDEX IF NOT EXISTS "AdminImpersonationSession_adminUserId_startedAt_idx" ON "AdminImpersonationSession"("adminUserId", "startedAt");
CREATE INDEX IF NOT EXISTS "AdminImpersonationSession_targetUserId_startedAt_idx" ON "AdminImpersonationSession"("targetUserId", "startedAt");
CREATE INDEX IF NOT EXISTS "AdminImpersonationSession_status_expiresAt_idx" ON "AdminImpersonationSession"("status", "expiresAt");

DO $$
BEGIN
  ALTER TABLE "AdminImpersonationSession"
    ADD CONSTRAINT "AdminImpersonationSession_adminUserId_fkey"
    FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "AdminImpersonationSession"
    ADD CONSTRAINT "AdminImpersonationSession_targetUserId_fkey"
    FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
