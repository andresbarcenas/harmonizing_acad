-- Add day-only teacher blackout dates for availability and scheduling validation.
CREATE TABLE "TeacherBlackoutDate" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "localDate" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherBlackoutDate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TeacherBlackoutDate_teacherId_localDate_key" ON "TeacherBlackoutDate"("teacherId", "localDate");
CREATE INDEX "TeacherBlackoutDate_teacherId_localDate_idx" ON "TeacherBlackoutDate"("teacherId", "localDate");

ALTER TABLE "TeacherBlackoutDate" ADD CONSTRAINT "TeacherBlackoutDate_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
