# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

## [0.7.1] - 2026-05-13

### Added
- Student-anchored recurring timezone mode so new recurring classes keep the student's local time stable across U.S. daylight saving changes.
- Recurring timezone mode selector for student time, teacher time, and admin-only custom timezone anchoring.
- Class detail and schedule surfaces now show both student and teacher local times for safer cross-country scheduling.

### Changed
- Existing recurring series are preserved as teacher-time anchored during migration so already-booked UTC class times do not shift.
- Recurring class creation now checks teacher availability in the teacher's timezone for every generated occurrence.
- Scheduling documentation now clarifies UTC storage, IANA timezone requirements, Colombia/U.S. daylight-saving behavior, and recurrence anchoring rules.

## [0.7.0] - 2026-05-12

### Added
- Historical PDF import staging for Tommy's piano consolidated history, including Prisma import batch/row models, deterministic extraction script, and admin review UI at `/admin/imports`.
- Generic student historical PDF import command for future onboarded students, with student email/name, teacher, instrument, locale, timezone, and PDF path options.
- Local Tommy demo account (`tommy@harmonizing.com / demo123`) assigned to María for import validation.
- Source provenance and idempotency strategy for applying imported rows into student logs, repertoire, reviewed historical assignments, and published historical reports.
- Resend-backed class email reminders with `/api/cron/class-reminders`, Vercel Cron configuration, and idempotent `ClassReminderDelivery` tracking.
- Repertoire song sheet attachments for PDF/image sheet music, with teacher/admin upload management and student-visible links in `/progress`.
- Recurring-class setup access from teacher schedule, selected-student teacher progress context, and admin schedule.

### Changed
- After-class skill ratings now scope to the class lesson type: piano/general or singing/general, with server-side validation against mismatched skill submissions.
- Teacher selected-student progress workspace is more iPad/mobile-friendly with less cramped grids and responsive repertoire/recurring setup sections.

## [0.6.1] - 2026-05-12

### Fixed
- Stabilized the mobile navigation drawer on iPhone by rendering it through a body-level portal above all page content.
- Improved drawer viewport sizing, safe-area padding, and compact header behavior for iOS Safari.
- Removed avoidable horizontal scrolling from the student weekly calendar, reschedule selector, and after-class workflow stepper.
- Added shared overflow guardrails for cards and page hero text so long labels behave better on iPad.

### Added
- Responsive QA checklist covering iPhone, iPad portrait, iPad landscape, and desktop smoke targets.

## [0.6.0] - 2026-05-08

### Added
- Single-class scheduling management for admin, teacher, and student workflows, including class type/status visibility across schedule surfaces.
- Student-requested one-off class flow with pending, accepted, and rejected states plus student-visible rejection reasons.
- Seed coverage for trial, makeup, extra, pending, accepted, and rejected single-class scheduling scenarios.
- Scheduling documentation covering recurring versus single classes, request workflow, conflict detection, timezone rules, and manual validation.

### Changed
- Standalone class sessions now default to `SINGLE`, while recurring session creation continues to set `RECURRING` explicitly.
- Student class requests are limited to makeup, extra, and evaluation sessions; admin/teacher booking retains broader one-off class types.
- Request review now separates student-visible rejection reasons from optional internal notes.

## [0.5.0] - 2026-05-08

### Added
- Student/parent progress portal on `/progress` with next class, latest lesson summary, active assignments, practice minutes, video requests, repertoire, skill snapshots, recent teacher feedback, and latest progress report.
- Assignment completion notes with persisted `studentCompletionNote` and `studentCompletedAt` fields.
- Video request deep links from required-video assignments into `/videos` with assignment, repertoire, and skill preselection when available.
- Manual student progress portal test plan covering lesson visibility, assignment status updates, practice logging, repertoire, video links, and private-note protection.

### Changed
- Student progress data access now returns richer Prisma-backed progress context, including week practice totals, pending video requests, related feedback, and upcoming class data.
- Practice assignment status updates can now include a student/parent completion note while preserving teacher-only review notes.

## [0.4.0] - 2026-05-08

### Added
- English/Spanish account language support as a release baseline, including localized admin forms, teacher scheduling controls, notifications, uploads, and shared action copy.
- Lightweight `npm run smoke:routes` route check for public, student, teacher, admin, settings, and notification surfaces after local boot.
- Auth-first root behavior so `/` sends logged-out users to `/sign-in` and authenticated users to their role workspace.

### Changed
- English is now the default interface language for unauthenticated and newly created users while Spanish remains available per account.
- Student schedule visibility now supports selected-week navigation so future recurring classes are discoverable.
- Release docs now distinguish MVP-complete flows from production-hardening items such as signed media URLs, realtime messaging, rate limiting, and observability.

## [0.3.0] - 2026-04-24

### Added
- Secure role entry routes (`/student`, `/teacher`, `/admin`) with server-side redirects to role workspaces.
- Centralized server-side data access layer under `apps/web/src/lib/data/*` for admin, teacher, student, and messaging views.
- Configurable video storage layer (`STORAGE_PROVIDER=s3|local`) with local filesystem fallback and shared media URL resolver.
- Real practice upload UX improvements: drag-and-drop, file validation, upload progress, and auto-refresh after submit.

### Changed
- Auth hardening with Prisma-backed credential checks, bcrypt validation safeguards, and Spanish-safe login/API error messaging.
- Demo seed credentials updated to `@harmonizing.com` accounts with hashed password `demo123` for local development.
- Role dashboards/pages now consume the new server data layer instead of direct page-level query wiring.
- Teacher video review flow now supports `all/pending/reviewed` filtering and persists reviewed status + feedback loop for students.

## [0.2.0] - 2026-04-24

### Added
- New premium auth experience based on the provided visual reference, including refreshed `/sign-in` composition and a polished `/forgot-password` support route.
- Shared `PageIntro` section component for consistent premium hero treatment across student, teacher, admin, settings, and notifications views.
- Refined tokenized design language (ivory canvas, amber accent, soft-glass cards, stronger spacing rhythm) applied across app surfaces.

### Changed
- Unified core UI primitives (`card`, `button`, `input`, `textarea`, `badge`, `avatar`, shell navigation, logo) to the new premium style system.
- Updated authenticated and public pages to align with the refreshed visual identity while preserving existing RBAC and business logic.
- Local Docker entrypoint now runs development server after Prisma setup for stable local iteration (`docker compose up --build` + live route debugging).

## [0.0.1] - 2026-04-03

### Added
- Profile photo upload/update flow for students and teachers via MinIO-backed image uploads in Settings.
- Persistent top-right `Cerrar sesión` action in the shared app shell.
- App-wide version footer badge (`v0.0.1`) on authenticated and public entry surfaces.
- Teacher recurrent class scheduler with weekly recurrence, conflict detection, and student notifications.
- Admin edit workflows for both students and teachers, including profile updates and assignment-aware student editing.

### Changed
- Student and teacher onboarding now accept an optional profile image URL at creation time.
- Admin recent lists now show avatars and inline edit controls for faster operations.

## [0.1.0] - 2026-03-31

### Added
- Foundation architecture and premium design system with role-aware layout.
- Student dashboard experience, including plan, progress, assigned teacher, and WhatsApp plan management CTA.
- Scheduling and rescheduling workflow with pending approval state.
- Weekly practice video workflow for student uploads and teacher feedback.
- Messaging and in-app notifications between assigned student and teacher.
- Teacher and admin operational dashboards.
- Docker-first local development stack (`web`, `postgres`, `minio`, `mailhog`) with seed data.
