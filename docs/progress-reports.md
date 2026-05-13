# Monthly Progress Reports and Grades

Harmonizing reports are deterministic snapshots generated from data already captured in the academy workflow. No AI is used in this version.

## Data Sources

A report reads the selected student, optional teacher, and date range, then aggregates:

- Class sessions: scheduled, completed, absent/no-show, cancelled, recurring, and single classes.
- Lesson notes: completed notes, missing notes, lesson ratings, preparedness, focus, and effort.
- Skill ratings: lesson skill ratings plus video feedback skill ratings.
- Repertoire: songs/pieces worked on, completed items, mastery percent, and current focus.
- Practice: practice logs, total minutes, assignments, completed assignments, and overdue assignments.
- Videos: submissions, reviewed videos, pending videos, and recent feedback highlights.

## Report Generation

Teachers and admins generate reports through `POST /api/progress/reports`.

- New reports are saved as `DRAFT`.
- Reports are keyed by `studentId + teacherId-or-academy + startDate + endDate` to prevent accidental duplicates.
- A duplicate generation returns `409` with `existingReportId`.
- `regenerate=true` recalculates metrics while preserving manually edited narrative fields unless replacements are provided.
- Existing legacy `GENERATED` and `FINALIZED` reports are treated as published historical reports.

## Grade Rubric

Default rubric version: `default-v1`.

- Attendance: `15%`
- Practice consistency: `20%`
- Assignment completion: `20%`
- Skill improvement/current level: `25%`
- Repertoire progress: `10%`
- Effort/focus: `10%`

Grade scale:

- `A+`: 97-100
- `A`: 93-96
- `A-`: 90-92
- `B+`: 87-89
- `B`: 83-86
- `B-`: 80-82
- `C+`: 77-79
- `C`: 73-76
- `C-`: 70-72
- `D`: 60-69
- `F`: below 60

If there are no scheduled classes in the selected range, the report stores metrics but leaves `gradePercentage` and `gradeLetter` empty and displays `Sin datos suficientes`.

## Missing Data Behavior

Reports should be useful even when data is incomplete.

- Cancelled classes are counted but not penalized in attendance.
- Missing optional videos or repertoire do not aggressively lower the grade.
- Missing skill, repertoire, or effort data uses neutral scoring where needed and marks summaries as insufficient.
- Missing lesson notes are surfaced explicitly so teachers/admins can close documentation gaps.

## Permissions and Flow

- Teachers can generate and edit draft reports only for assigned students.
- Teachers cannot publish reports in this version.
- Admins can generate, edit, publish, archive, and regenerate reports for all students.
- Students and parents can view only `PUBLISHED` reports for their own account.
- `adminNote` and teacher-private lesson notes are never shown to students.

When an admin publishes a report:

- Status becomes `PUBLISHED`.
- `publishedAt` and `publishedByUserId` are set.
- The student receives an in-app notification linking to `/progress/reports/[reportId]`.

When an admin archives a report:

- Status becomes `ARCHIVED`.
- `archivedAt` is set.
- The student can no longer view it.

## Manual Test Plan

Admin:

1. Log in as `admin@harmonizing.com / demo123`.
2. Open `/admin/progress/reports`.
3. Filter by month, teacher, status, and missing report.
4. Generate a report for Isabella.
5. Generate the same range again and confirm it opens or reports the duplicate.
6. Regenerate with the checkbox/action and confirm edited narrative remains.
7. Edit admin note and student-visible summary.
8. Publish the report and confirm notification is created.
9. Archive the report and confirm it disappears from student view.

Teacher:

1. Log in as `maria@harmonizing.com / demo123`.
2. Open `/teacher/progress` and select Isabella.
3. Click `Generar reporte`.
4. Generate a monthly draft.
5. Open the draft detail and edit Spanish narrative sections.
6. Confirm there is no teacher publish action.
7. Try an unassigned report URL and confirm access is denied/not found.

Student:

1. Log in as `isabella@harmonizing.com / demo123`.
2. Open `/progress`.
3. Open the latest published report.
4. Confirm grade, attendance, practice, assignments, videos, songs, strengths, areas to improve, and next focus render.
5. Confirm drafts, archived reports, admin notes, and teacher private notes are not visible.
