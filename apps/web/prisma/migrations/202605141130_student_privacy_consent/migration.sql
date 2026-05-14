-- Student privacy/media consent records with private signed PDF storage.
CREATE TYPE "ConsentSignerRole" AS ENUM ('PARENT_GUARDIAN');
CREATE TYPE "ConsentEmailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

CREATE TABLE "ConsentDocument" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleEs" TEXT NOT NULL,
    "bodyEn" TEXT NOT NULL,
    "bodyEs" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsentDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConsentSignature" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "signerRole" "ConsentSignerRole" NOT NULL DEFAULT 'PARENT_GUARDIAN',
    "signerName" TEXT NOT NULL,
    "signerRelationship" TEXT NOT NULL,
    "signerEmail" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "consentTextHash" TEXT NOT NULL,
    "pdfBytes" BYTEA NOT NULL,
    "pdfSha256" TEXT NOT NULL,
    "emailStatus" "ConsentEmailStatus" NOT NULL DEFAULT 'PENDING',
    "resendMessageId" TEXT,
    "emailError" TEXT,
    "emailSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsentSignature_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConsentDocument_version_key" ON "ConsentDocument"("version");
CREATE INDEX "ConsentDocument_active_effectiveAt_idx" ON "ConsentDocument"("active", "effectiveAt");

CREATE UNIQUE INDEX "ConsentSignature_userId_documentId_key" ON "ConsentSignature"("userId", "documentId");
CREATE INDEX "ConsentSignature_userId_signedAt_idx" ON "ConsentSignature"("userId", "signedAt");
CREATE INDEX "ConsentSignature_documentId_signedAt_idx" ON "ConsentSignature"("documentId", "signedAt");
CREATE INDEX "ConsentSignature_emailStatus_signedAt_idx" ON "ConsentSignature"("emailStatus", "signedAt");

ALTER TABLE "ConsentSignature" ADD CONSTRAINT "ConsentSignature_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConsentSignature" ADD CONSTRAINT "ConsentSignature_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ConsentDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
