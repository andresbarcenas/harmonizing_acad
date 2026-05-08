# Progress Intelligence Foundation

Harmonizing Academy now has a structured progress layer for music lessons. This layer does not use AI yet; it captures teacher and student activity in a way that can later power reports, insights, grades, and AI-assisted summaries.

## Data Model

The foundation keeps the existing legacy progress models intact (`ProgressRecord`, `LearnedSong`, `Goal`, `StudentLogEntry`) and adds structured academic models around the lesson workflow:

- `LessonNote`: one structured note per `ClassSession`, owned by the assigned teacher and visible to the student only through `studentVisibleNote`.
- `SkillCategory`: flexible piano, voice, and general skill taxonomy seeded for local/demo use.
- `LessonSkillRating`: per-lesson 1-5 rating for multiple skills.
- `RepertoireItem`: songs or pieces currently assigned, learning, improving, performance-ready, completed, or paused.
- `PracticeAssignment`: teacher-assigned practice work related to a lesson, repertoire item, or skill category.
- `PracticeLog`: student-entered practice minutes and notes.
- `VideoSkillRating`: skill ratings attached to teacher feedback on practice videos.
- `ProgressReport`: deterministic snapshot for a student/date range with attendance, practice, video, skill, repertoire, and teacher-authored summary fields.

Practice videos can optionally link to a practice assignment, repertoire item, and skill category. This makes submitted videos evidence for the same progress graph as lessons and practice logs.

## Workflow

Teacher workflow:

1. Open `/teacher/progress`.
2. Use the top student selector or open a student card.
3. Create or update a structured lesson note for a class.
4. Add 1-5 skill ratings for relevant piano/singing/general categories.
5. Create repertoire items and practice assignments.
6. Review student practice logs and videos.
7. Generate a deterministic progress report for a date range.

Fast after-class workflow:

1. From the teacher dashboard or a selected student's progress workspace, open `/teacher/classes/[classId]/complete`.
2. Choose the class status: completed, student absent, cancelled, or needs reschedule.
3. If completed, add the lesson summary, worked topics, strengths, improvement areas, next focus, private note, and student/parent-visible note.
4. Rate relevant piano, voice, or general skills from 1-5.
5. Update active repertoire progress or add one new song/piece.
6. Create one or more practice assignments, optionally requiring a practice video.
7. Review the Spanish summary and save. The app updates the class, upserts the one-per-class `LessonNote`, writes skill ratings/repertoire/assignments in a transaction, and creates an in-app notification for the student.

The workflow records `ClassSession.completedAt` when a class is saved as completed. Non-completed statuses do not create lesson notes or assignments from this fast flow.

Student workflow:

1. Open `/progress`.
2. Review assigned practice work and repertoire.
3. Mark practice assignments as in progress or completed.
4. Log minutes, notes, mood, difficulty, and optional parent context.
5. Review visible lesson notes and progress report summaries.
6. Upload videos from `/videos` and optionally link them to assignments, repertoire, and skills.

Admin workflow:

1. Open `/admin/progress`.
2. Review completed classes missing lesson notes.
3. Identify students with low recent practice activity.
4. Review generated report status and seeded skill categories.

## Report Calculation

Progress reports are deterministic. For a selected student/date range, the app stores:

- Attendance count: completed plus no-show lessons.
- Completed lessons count: completed lessons only.
- Missed/cancelled count: no-show plus cancelled lessons.
- Total practice minutes: sum of `PracticeLog.minutesPracticed`.
- Assignment completion rate: completed/reviewed assignments divided by total assignments in range.
- Video submissions count: videos submitted in range.
- Average lesson rating: average structured lesson overall rating.
- Average skill ratings: average from lesson skill ratings and video skill ratings.
- Repertoire summary: count by status plus average mastery percent.

Teacher/admin text fields remain editable and manual: summary, strengths, improvement areas, recommended focus, final grade, and grade percentage.

## RBAC

- Teachers can edit progress data only for students assigned to them through `TeacherAssignment`.
- Students can view only their own progress data.
- Students can create practice logs and update their own assignment status.
- Admins can view progress visibility and reports across students.

## Future AI Extension Points

The structured data can later support AI-generated summaries, risk indicators, recommended practice plans, and academy-level analytics. AI should read from structured lesson notes, skill ratings, assignments, practice logs, videos, and reports, but should not replace teacher-authored feedback.

## Migration Baseline And Deployment

The Prisma migration history was squashed into a single baseline migration after the Progress Intelligence foundation. This corrects the earlier local-development history where the initial migration was empty and local Docker relied on `prisma db push`.

Current intent:

- Fresh staging/production databases should use `npm run db:deploy` from `apps/web`, which runs `prisma migrate deploy`.
- Local Docker remains compatible with the existing boot flow, which still uses `prisma db push` for fast local iteration.
- Existing local databases that were created before the baseline may continue working with `db push`; for a clean migration-style reset, use a fresh database or reset Docker volumes.
- Migration correctness should be checked with:

```bash
npx prisma migrate diff \
  --from-migrations prisma/migrations \
  --to-schema-datamodel prisma/schema.prisma \
  --shadow-database-url "$SHADOW_DATABASE_URL" \
  --script
```

Expected output is an empty migration.

## Progress Foundation Verification Checklist

Use this checklist before adding more progress features:

- `npm run db:generate` succeeds.
- `npm run db:deploy` succeeds against a fresh database/schema.
- `npm run db:seed` creates piano, voice, lesson note, skill rating, repertoire, assignment, practice log, video link, and report demo data.
- `npm run typecheck`, `npm run lint`, and `npm run build` pass.
- `/teacher/classes/[classId]/complete` only opens for the teacher assigned to that class and student.
- Completing a class twice updates the existing `LessonNote`; it should not create a duplicate note.
- Teacher APIs reject records for students not assigned to that teacher.
- Practice assignment creation rejects linked sessions, lesson notes, repertoire items, or skills that do not belong to the selected student/teacher context.
- Student practice logging rejects assignments or repertoire items owned by another student.
- Video upload rejects assignment/repertoire links not owned by the logged-in student.
- Video feedback rejects inactive or missing skill categories.
- Progress report generation uses deterministic database calculations only; no AI is involved.

## Stricter RBAC Boundaries

Progress writes validate ownership before data reaches Prisma foreign-key constraints:

- Teachers must be assigned to a student before creating lesson notes, repertoire, practice assignments, or reports for that student.
- Linked class sessions and lesson notes must belong to the same assigned student and teacher.
- Linked repertoire and practice assignments must belong to the same student context.
- Students can only log practice against their own assignments/repertoire and only update their own assignment status.
- Admins can view progress globally and generate reports, but broad edit flows remain intentionally limited until a dedicated admin progress-management pass.

## Student Progress Portal Manual Test Plan

Use this checklist for the student/parent-facing progress experience:

1. Sign in as `isabella@harmonizing.com / demo123`.
2. Open `/progress` and confirm the dashboard shows next class, practice minutes this week, active assignments, pending video requests, last lesson summary, repertoire, skill snapshot, feedback, and latest report.
3. Confirm the last lesson card shows only student-visible lesson fields: summary, topics worked, strengths, improvement areas, next focus, and visible teacher note. Teacher private notes must not appear anywhere on the student page.
4. In the assignments section, mark an assigned task as in progress.
5. Add a short completion note and mark the task completed. Refresh and confirm the completion note remains visible.
6. Log practice minutes with date, notes, optional assignment/repertoire/skill, mood/difficulty, and optional parent note. Confirm the weekly minutes and recent activity update after refresh.
7. Review the repertoire section and confirm each active song/piece shows status, mastery percentage, focus section, tempo, visible notes, latest assignment, and latest video feedback when available.
8. For an assignment that requires video, click `Subir video de práctica` and confirm `/videos` opens with the assignment/repertoire/skill preselected when those links exist.
9. Return to `/progress` and confirm empty states are helpful if assignments, lesson notes, songs, practice logs, reports, or feedback are missing.
10. Confirm student RBAC by attempting to access another student's IDs through assignment/video/practice links; APIs should reject cross-student records.
