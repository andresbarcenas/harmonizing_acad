# Architecture

## App Structure
- `apps/web/src/app`: route groups for marketing, auth, student, teacher, admin
- `apps/web/src/components`: reusable UI and feature widgets
- `apps/web/src/features`: server-side data access grouped by domain
- `apps/web/src/lib`: auth, database, RBAC, timezone, notifications, validators, utilities
- `apps/web/prisma`: schema, SQL migration, seed

## Visual System
- Shared design tokens define the premium neutral palette, amber accents, elevation, and radii.
- Core primitives (`card`, `button`, `input`, `textarea`, `badge`, `avatar`) carry the visual language across all routes.
- `AppShell` + `PageIntro` enforce consistent high-level composition for student, teacher, admin, settings, and notifications surfaces.
- Auth routes (`/sign-in`, `/forgot-password`) follow the same system with denser visual hierarchy and softer atmospheric backgrounds.

## Auth and Roles
- NextAuth credentials provider with Prisma adapter
- User roles: `STUDENT`, `TEACHER`, `ADMIN`
- Middleware enforces route-level authorization
- Server helper `requireViewer()` enforces role constraints in page logic

## Data Model
Core entities:
- `User`, `StudentProfile`, `TeacherProfile`, `TeacherAssignment`
- `SubscriptionPlan`, `ActiveSubscription`
- `Invoice`, `InvoiceContactLink`, `InvoiceSyncRun`
- `ClassSession`, `RescheduleRequest`, `TeacherAvailability`
- `PracticeVideo`, `VideoFeedback`
- `ProgressRecord`, `LearnedSong`, `Goal`
- `MessageThread`, `Message`, `Notification`

## Scheduling Model
- Canonical times stored in UTC (`ClassSession.startsAtUtc` / `endsAtUtc`)
- Teacher availability stored as weekday + local-minute windows + timezone
- Weekly slots generated server-side from availability and converted to UTC
- Reschedule flow:
  - Student proposes slot (`PENDING`)
  - API validates duration, availability membership, duplicate pending request, and overlap safety
  - Teacher accepts/rejects
  - Session updates if accepted, original remains if rejected

## Video Review Model
- Student can upload file or record in browser (`MediaRecorder`) before upload
- Practice uploads stored in object storage and tracked in `PracticeVideo`
- Teacher writes feedback into `VideoFeedback`
- Status progression: `PENDING` -> `FEEDBACK_GIVEN`
- Teacher panel highlights students missing weekly submission

## Messaging Model
- One `MessageThread` per student-teacher assignment pair
- Assignment-bound access enforced for student/teacher roles
- Polling refresh (10 seconds) + optimistic send on the client

## Notification Model
- Shared notification service writes to in-app `Notification`
- Read state persisted in `readAt`
- Unread counters exposed in shell + API
- Dev reminder simulation endpoint creates upcoming-class notices
- Optional MailHog SMTP mirroring via `NOTIFICATION_SMTP_MIRROR=true`

## Invoicing Model (Alegra v1)
- Invoice source of truth is Alegra; Harmonizing stores cached snapshots for fast reads.
- Student-contact mapping defaults to exact email match and can be manually overridden by admin.
- Sync runs are tracked for observability (`STUDENT` and `ALL` scope) with status and counters.
- Student invoice UI is read-only (`/invoices`) with view/PDF actions when links exist.
- Admin operations include sync-all, sync-per-student, and manual contact relink (`/admin/invoices`).

## Production Considerations
- Replace public/local object URL assumptions with signed URLs + CDN
- Add real-time messaging transport (websocket/SSE) if needed
- Add queue/background workers for reminders and video processing
- Harden with audit logs, rate limits, and observability
