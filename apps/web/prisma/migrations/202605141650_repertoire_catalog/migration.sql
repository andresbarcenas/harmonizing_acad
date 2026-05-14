-- Shared academy repertoire catalog and student assignment traceability.
CREATE TABLE "RepertoireCatalogItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "composerOrArtist" TEXT,
    "instrument" TEXT NOT NULL,
    "level" TEXT,
    "defaultFocusSection" TEXT,
    "defaultCurrentTempo" INTEGER,
    "defaultTargetTempo" INTEGER,
    "defaultTeacherNotes" TEXT,
    "defaultStudentVisibleNotes" TEXT,
    "tags" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepertoireCatalogItem_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "RepertoireItem" ADD COLUMN "catalogItemId" TEXT;

CREATE INDEX "RepertoireCatalogItem_instrument_active_title_idx" ON "RepertoireCatalogItem"("instrument", "active", "title");
CREATE INDEX "RepertoireCatalogItem_createdByUserId_createdAt_idx" ON "RepertoireCatalogItem"("createdByUserId", "createdAt");
CREATE INDEX "RepertoireItem_studentId_catalogItemId_idx" ON "RepertoireItem"("studentId", "catalogItemId");

ALTER TABLE "RepertoireCatalogItem" ADD CONSTRAINT "RepertoireCatalogItem_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RepertoireItem" ADD CONSTRAINT "RepertoireItem_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "RepertoireCatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
