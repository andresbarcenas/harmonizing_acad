-- CreateTable
CREATE TABLE "ClassSessionAttachment" (
    "id" TEXT NOT NULL,
    "classSessionId" TEXT NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassSessionAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClassSessionAttachment_classSessionId_createdAt_idx" ON "ClassSessionAttachment"("classSessionId", "createdAt");

-- CreateIndex
CREATE INDEX "ClassSessionAttachment_uploadedByUserId_createdAt_idx" ON "ClassSessionAttachment"("uploadedByUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "ClassSessionAttachment" ADD CONSTRAINT "ClassSessionAttachment_classSessionId_fkey" FOREIGN KEY ("classSessionId") REFERENCES "ClassSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSessionAttachment" ADD CONSTRAINT "ClassSessionAttachment_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
