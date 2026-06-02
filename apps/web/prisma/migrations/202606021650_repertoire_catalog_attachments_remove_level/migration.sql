-- Add reusable catalog sheet attachments and remove obsolete song/repertoire level fields.
CREATE TABLE "RepertoireCatalogAttachment" (
    "id" TEXT NOT NULL,
    "catalogItemId" TEXT NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "type" "RepertoireAttachmentType" NOT NULL DEFAULT 'SHEET_MUSIC',
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepertoireCatalogAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RepertoireCatalogAttachment_catalogItemId_createdAt_idx" ON "RepertoireCatalogAttachment"("catalogItemId", "createdAt");
CREATE INDEX "RepertoireCatalogAttachment_uploadedByUserId_createdAt_idx" ON "RepertoireCatalogAttachment"("uploadedByUserId", "createdAt");

ALTER TABLE "RepertoireCatalogAttachment" ADD CONSTRAINT "RepertoireCatalogAttachment_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "RepertoireCatalogItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RepertoireCatalogAttachment" ADD CONSTRAINT "RepertoireCatalogAttachment_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RepertoireCatalogItem" DROP COLUMN "level";
ALTER TABLE "RepertoireItem" DROP COLUMN "level";
