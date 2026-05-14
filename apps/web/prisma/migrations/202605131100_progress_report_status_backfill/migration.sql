-- Backfill legacy report lifecycle states after PUBLISHED has been committed as an enum value.
UPDATE "ProgressReport"
SET
  "status" = 'PUBLISHED',
  "publishedAt" = COALESCE("publishedAt", "updatedAt", "createdAt", CURRENT_TIMESTAMP),
  "gradeLetter" = COALESCE("gradeLetter", "finalGrade"),
  "studentVisibleSummary" = COALESCE("studentVisibleSummary", "teacherSummary")
WHERE "status" IN ('GENERATED', 'FINALIZED');
