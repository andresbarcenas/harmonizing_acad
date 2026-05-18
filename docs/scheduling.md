# Harmonizing Scheduling

## Overview

Harmonizing supports two scheduling patterns:

- **Recurring class series** for fixed weekly lessons.
- **Single classes** for one-off bookings such as trial classes, makeup lessons, extra practice, evaluations, replacements, or manual admin bookings.

Both patterns produce `ClassSession` rows, so every class can later connect to lesson notes, progress records, assignments, videos, attendance, and reports.

## Data Model

`RecurringClassSeries` stores the recurring rule:

- student
- teacher
- anchor timezone
- timezone mode
- local start time
- weekday list
- duration
- horizon and interval

`ClassSession` stores the actual scheduled lesson instance. Single classes are `ClassSession` records with no `recurrenceId`. Standalone/manual sessions default to `SINGLE`; recurring generation sets `RECURRING` explicitly.

`ClassSession.type` identifies the booking type:

- `RECURRING`
- `SINGLE`
- `TRIAL`
- `MAKEUP`
- `EXTRA`
- `EVALUATION`
- `REPLACEMENT`

`ClassRequest` stores student-requested one-off classes. Requests use a simple lifecycle:

- `PENDING`
- `ACCEPTED`
- `REJECTED`
- `CANCELLED`

When a request is accepted, the app creates a linked `ClassSession` through `classRequestId`.

Students can request only:

- `MAKEUP`
- `EXTRA`
- `EVALUATION`

`SINGLE`, `TRIAL`, and `REPLACEMENT` remain admin/teacher booking types.

## Conflict Detection

All conflict checks happen server-side in `src/lib/scheduling.ts`.

A new class conflicts when:

```txt
newStart < existingEnd AND newEnd > existingStart
```

The app checks:

- teacher overlapping classes
- student overlapping classes
- invalid date/time
- invalid duration
- teacher availability, when availability windows exist
- teacher blackout dates, when a teacher/admin has marked a full day unavailable

Cancelled classes do not block future scheduling.

## Timezone Rules

The app stores scheduled class times in UTC:

- `startsAtUtc`
- `endsAtUtc`

Forms collect a local date/time plus an anchor timezone. The server converts that local time into UTC before saving.

The saved `ClassSession.timezone` keeps the booking/anchor timezone visible for audit/debugging. Display should always use the viewer/student/teacher timezone through the existing i18n formatting helpers.

One-time class booking follows the same intent as recurring scheduling:

- new one-time classes default to `Student time`, so the time entered by admin/teacher is interpreted in the student's local timezone
- `Teacher time` is available when the teacher's local schedule should be the source of truth
- `Custom timezone` is admin-only
- the form shows both student and teacher local previews before saving

Student one-time class requests are always interpreted in the student's own timezone and then converted to UTC.

Recurring class series use `RecurringTimezoneMode`:

- `STUDENT_TIME`: default for new series. The student's local class time remains stable, which prevents U.S. families from seeing lessons drift during daylight saving changes.
- `TEACHER_TIME`: preserves the teacher's local class time. Existing recurring series are marked this way so already-booked UTC class times are not recalculated or shifted.
- `CUSTOM_TIMEZONE`: admin-only override for unusual cases.

Teachers in Colombia typically use `America/Bogota`, while U.S. students use their own IANA timezone such as `America/New_York`, `America/Chicago`, or `America/Los_Angeles`. The app never relies on fixed offsets like `-05:00`, because the U.S. observes daylight saving time and Colombia does not.

Teacher availability is still evaluated in the teacher's local timezone for every generated occurrence. A student-time anchored class can therefore be skipped/reported if that occurrence falls outside the teacher's Bogotá availability after a daylight-saving shift.

Teacher blackout dates are full local days in the teacher's timezone. Admins manage them from `/admin/availability`; teachers manage their own from `/teacher/availability`. Blackouts prevent new bookings, generated recurring sessions, class requests, and reschedule approvals on that teacher-local day. Existing scheduled classes are not automatically cancelled; the availability screen warns when a blackout date already has scheduled classes.

## Permissions

Admin can:

- book a single class for any student and teacher
- create recurring class series for selected student/teacher pairs
- view all classes
- approve/reject class requests

Teacher can:

- book one-off classes only for assigned students
- create recurring class series only for assigned students
- view assigned recurring and single classes
- approve/reject requests for assigned students
- complete a class through the after-class workflow

Student can:

- view their own recurring and single classes
- request a one-off class with their assigned teacher
- view pending class requests

## Notifications

When a single class is booked:

- student receives an in-app notification
- teacher receives an in-app notification when an admin booked it

When a student requests a class:

- assigned teacher receives an in-app notification
- admins receive an in-app notification

When a request is accepted or rejected:

- student receives an in-app notification
- accepted requests link to the created class detail when available

Class email reminders:

- Resend can send reminder emails for scheduled classes through `/api/cron/class-reminders`.
- Default reminders are 24 hours and 1 hour before class.
- `ClassReminderDelivery` prevents duplicate reminder emails for the same class, recipient, channel, and offset.
- rejected requests store and show a student-visible rejection reason
- The endpoint is not scheduled in Vercel yet because Hobby cron schedules are limited to daily execution; add it later when the plan or reminder strategy changes.

## Routes

Admin:

- `/admin/schedule` creates one-off classes, lists all sessions, and reviews requests.
- `/admin/schedule` also creates recurring class series for selected student/teacher pairs.

Teacher:

- `/teacher/schedule` creates one-off classes for assigned students, lists assigned sessions, and reviews requests.
- `/teacher/schedule` also creates recurring class series for assigned students.

Student:

- `/schedule` shows recurring and single classes, pending reschedules, and one-off class requests.

Shared:

- `/classes/[classId]` shows class detail with role-aware visibility.

## Manual Test Plan

Admin:

1. Sign in as `admin@harmonizing.com / demo123`.
2. Open `/admin/schedule`.
3. Create a trial class for Luis and María.
4. Try to create an overlapping class and confirm it is blocked.
5. Confirm the class appears in the admin schedule list with a type badge.
6. Approve and reject a pending student request.
7. Confirm rejected requests keep a student-visible rejection reason and optional internal note.
8. Add a blackout date for María in `/admin/availability` and confirm a one-time class on that teacher-local day is blocked.

Teacher:

1. Sign in as `maria@harmonizing.com / demo123`.
2. Open `/teacher/schedule`.
3. Select Isabella in the top student selector.
4. Create a makeup class for Isabella.
5. Confirm unassigned students are not available in the teacher form.
6. Open the class detail.
7. Use `Completar` to enter the after-class workflow.
8. Open `/teacher/availability`, add a blackout date, and confirm it appears without affecting existing classes.

Student:

1. Sign in as `isabella@harmonizing.com / demo123`.
2. Open `/schedule`.
3. Confirm recurring and single classes appear together.
4. Submit a makeup, extra, or evaluation request.
5. Confirm the pending request appears.
6. After teacher/admin approval, confirm the approved class appears in schedule and class detail.
7. Confirm rejected request copy is shown through notifications when rejected.
8. Confirm available slots do not appear on a teacher blackout date.

Quality checks:

```bash
cd apps/web
npm run db:generate
npm run typecheck
npm run lint
npm run build
npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url <shadow-db-url> --script
```
