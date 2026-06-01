-- Align AdminImpersonationSession.updatedAt with the Prisma schema.
ALTER TABLE "AdminImpersonationSession" ALTER COLUMN "updatedAt" DROP DEFAULT;
