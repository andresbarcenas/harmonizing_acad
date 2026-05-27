-- CreateEnum
CREATE TYPE "AppAnnouncementType" AS ENUM ('GENERAL', 'FEATURE', 'BILLING', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "AppAnnouncementStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "AppAnnouncement" (
    "id" TEXT NOT NULL,
    "type" "AppAnnouncementType" NOT NULL DEFAULT 'GENERAL',
    "status" "AppAnnouncementStatus" NOT NULL DEFAULT 'DRAFT',
    "targetRoles" "Role"[] NOT NULL,
    "titleEn" TEXT NOT NULL,
    "bodyEn" TEXT NOT NULL,
    "titleEs" TEXT NOT NULL,
    "bodyEs" TEXT NOT NULL,
    "ctaLabelEn" TEXT,
    "ctaLabelEs" TEXT,
    "ctaUrl" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppAnnouncement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppAnnouncementDismissal" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dismissedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppAnnouncementDismissal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AppAnnouncement_status_startsAt_endsAt_idx" ON "AppAnnouncement"("status", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "AppAnnouncement_type_idx" ON "AppAnnouncement"("type");

-- CreateIndex
CREATE INDEX "AppAnnouncement_createdAt_idx" ON "AppAnnouncement"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AppAnnouncementDismissal_announcementId_userId_key" ON "AppAnnouncementDismissal"("announcementId", "userId");

-- CreateIndex
CREATE INDEX "AppAnnouncementDismissal_userId_dismissedAt_idx" ON "AppAnnouncementDismissal"("userId", "dismissedAt");

-- AddForeignKey
ALTER TABLE "AppAnnouncement" ADD CONSTRAINT "AppAnnouncement_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppAnnouncement" ADD CONSTRAINT "AppAnnouncement_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppAnnouncementDismissal" ADD CONSTRAINT "AppAnnouncementDismissal_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "AppAnnouncement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppAnnouncementDismissal" ADD CONSTRAINT "AppAnnouncementDismissal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
