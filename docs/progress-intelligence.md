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
