# Architecture

## App Structure
- `apps/web/src/app`: route groups for marketing, auth, student, teacher, admin
- `apps/web/src/components`: reusable UI and feature widgets
- `apps/web/src/features`: server-side data access grouped by domain
- `apps/web/src/lib`: auth, database, RBAC, timezone, validators, utilities
- `apps/web/prisma`: schema, SQL migration, seed

## Auth and Roles
- NextAuth credentials provider with Prisma adapter
- User roles: `STUDENT`, `TEACHER`, `ADMIN`
- Middleware enforces route-level authorization
- Server helper `requireViewer()` enforces role constraints in page logic

## Data Model
Core entities:
- `User`, `StudentProfile`, `TeacherProfile`, `TeacherAssignment`
- `SubscriptionPlan`, `ActiveSubscription`
- `ClassSession`, `RescheduleRequest`, `TeacherAvailability`
- `PracticeVideo`, `VideoFeedback`
- `ProgressRecord`, `LearnedSong`, `Goal`
- `MessageThread`, `Message`, `Notification`

## Scheduling Model
- Canonical times stored in UTC (`ClassSession.startsAtUtc`/`endsAtUtc`)
- Teacher availability stored as weekday + local-minute windows + timezone
- Weekly slots generated server-side from availability and converted to UTC
- Reschedule flow:
  - Student proposes slot (`PENDING`)
  - Teacher accepts/rejects
  - Session updates if accepted, original remains if rejected

## Video Review Model
- Student uploads weekly video metadata and object key to `PracticeVideo`
- Teacher writes feedback into `VideoFeedback`
- Status progression: `PENDING` -> `FEEDBACK_GIVEN`

## Messaging Model
- One `MessageThread` per student-teacher assignment pair
- Participants append `Message` entries
- Notification emitted on new message

## Notification Model
- In-app notifications persisted in `Notification`
- Read status managed by `readAt`
- Local MailHog service available for future email strategy

## Production Considerations
- Replace public/local object URL assumptions with signed URLs + CDN
- Add real-time messaging transport (websocket/SSE)
- Add queue/background workers for reminders and video processing
- Harden with audit logs, rate limits, and observability
