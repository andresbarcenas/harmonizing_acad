-- Anchor new recurring classes to student-local time while preserving existing series.
CREATE TYPE "RecurringTimezoneMode" AS ENUM ('STUDENT_TIME', 'TEACHER_TIME', 'CUSTOM_TIMEZONE');

ALTER TABLE "RecurringClassSeries" ADD COLUMN "timezoneMode" "RecurringTimezoneMode";

-- Existing generated sessions are already stored in UTC and must not be shifted.
-- Mark existing series with the previous teacher-time behavior for audit clarity.
UPDATE "RecurringClassSeries" SET "timezoneMode" = 'TEACHER_TIME';

ALTER TABLE "RecurringClassSeries" ALTER COLUMN "timezoneMode" SET DEFAULT 'STUDENT_TIME';
ALTER TABLE "RecurringClassSeries" ALTER COLUMN "timezoneMode" SET NOT NULL;
