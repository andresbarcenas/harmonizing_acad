-- Add login activity auditing for successful and failed sign-in attempts.
DO $$
BEGIN
  CREATE TYPE "UserLoginActivityStatus" AS ENUM ('SUCCESS', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "UserLoginAuthMethod" AS ENUM ('CREDENTIALS', 'MAGIC_LINK');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "UserLoginDeviceType" AS ENUM ('DESKTOP', 'MOBILE', 'TABLET', 'BOT', 'UNKNOWN');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "UserLoginActivity" (
  "id" TEXT NOT NULL,
  "status" "UserLoginActivityStatus" NOT NULL,
  "authMethod" "UserLoginAuthMethod" NOT NULL,
  "userId" TEXT,
  "emailAttempted" TEXT NOT NULL,
  "roleSnapshot" "Role",
  "failureReason" TEXT,
  "ipAddress" TEXT,
  "countryCode" TEXT,
  "userAgent" TEXT,
  "deviceType" "UserLoginDeviceType" NOT NULL DEFAULT 'UNKNOWN',
  "browserName" TEXT,
  "browserVersion" TEXT,
  "osName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserLoginActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "UserLoginActivity_createdAt_idx" ON "UserLoginActivity"("createdAt");
CREATE INDEX IF NOT EXISTS "UserLoginActivity_userId_createdAt_idx" ON "UserLoginActivity"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "UserLoginActivity_emailAttempted_createdAt_idx" ON "UserLoginActivity"("emailAttempted", "createdAt");
CREATE INDEX IF NOT EXISTS "UserLoginActivity_status_createdAt_idx" ON "UserLoginActivity"("status", "createdAt");

DO $$
BEGIN
  ALTER TABLE "UserLoginActivity"
    ADD CONSTRAINT "UserLoginActivity_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
