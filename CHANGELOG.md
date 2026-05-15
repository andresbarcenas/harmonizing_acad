# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

### Added
- Admin email delivery log at `/admin/emails` with status/type/recipient/subject/provider/time tracking for magic links, welcome emails, consent copies, and class reminders.
- Central `EmailDeliveryLog` audit model and migration for Resend send attempts, skipped sends, provider message ids, and failure reasons.
- Branded welcome emails for newly created student and teacher accounts, including 24-hour onboarding magic links and settings/password setup guidance.
- Grouped, icon-enhanced navigation for student, teacher, and admin menus with collapsible mobile drawer sections.
- Shared repertoire/song catalog management for admin and teacher workspaces, including catalog search, create/edit flows, and student assignment outside the after-class workflow.
- Searchable catalog song selection inside the after-class repertoire step while preserving custom song entry.
- Ten dev seed repertoire catalog songs for testing long-list search and student assignment flows.
- Owner-friendly Spanish architecture documentation with shareable SVG/PDF diagrams explaining roles, app architecture, data services, and deployment flow.
- Student privacy and media consent gate requiring student accounts to sign the active bilingual consent before using protected app operations.
- Signed consent PDF generation with Harmonizing branding, cursive typed signature rendering, audit metadata, private PDF download access, and Resend email receipt support.
- Admin consent tracking page for signed/missing consent status, email delivery status, and signed PDF downloads.
- Student settings consent status card with signed PDF access.
- Admin `/admin/access` password reset center for student, teacher, and admin accounts.
- Password change card in `/settings` for authenticated users to update their own password securely.
- Student/teacher-only magic-link sign-in via Resend while admin accounts remain password-only.
- Browser-default language detection for public/auth pages and accounts without a saved language preference.

### Changed
- Profile image uploads now use the shared media storage layer so Vercel Blob production no longer requires `NEXT_PUBLIC_MEDIA_BASE_URL`.
- Magic-link authenticated users can set a new password from `/settings` without entering the temporary/current password for that session.
- Admin navigation is now organized by functional area so operational, people, learning, communication, and system pages do not appear as one long flat menu.
- Instrument entry is now standardized to Piano/Voice dropdowns across student, teacher, class, repertoire, import, and after-class workflows, with legacy values like `Voz` normalized safely.
- Profile language preferences now support Browser default, English, and Español, with saved account choices persisted permanently.
- Teacher profile creation/editing no longer captures Zoom or Google Meet defaults; meeting links now stay on scheduled classes and recurring series.
- Teacher and student profile identity controls now link directly to `/settings` from the top bar and mobile drawer.
- Deployment notes now clarify that Resend powers magic links, consent receipts, and class reminder emails.

### Fixed
- Profile image uploads now use private Vercel Blob access when production is connected to a private Blob store, with avatars served through an authenticated app route instead of requesting unsupported public writes.
- Vercel Blob storage now standardizes on the native `BLOB_READ_WRITE_TOKEN` for profile images, practice videos, and repertoire sheets so production can be switched to the private `harmonizing` Blob store without relying on a custom empty token variable.
- Consent PDF generation now uses the standalone PDFKit bundle and buffer-based signature font registration so signing works in bundled Docker/Next.js runtime chunks.

## [0.7.4] - 2026-05-15

### Added
- Authenticated protected media routes for practice videos and repertoire/sheet attachments.
- Private Vercel Blob support for new practice video and repertoire attachment uploads.
- Protected media migration script (`npm run migrate:protected-media`) with dry-run, apply, and production safety flags.
- Private media deployment documentation and environment examples for using `BLOB_READ_WRITE_TOKEN` with the private production Blob store.
- Shared scheduling timezone selector used by both one-time and recurring class forms.

### Changed
- Student and teacher video players now load media through permission-checked app routes instead of direct public storage URLs.
- Repertoire sheet links now resolve through authenticated media routes for admin, teacher, and student access control.
- One-time and recurring class timezone selectors now use the same display, labels, and student/teacher timezone definition.

### Fixed
- Repertoire attachment deletion now also attempts to remove the protected stored media object.

## [0.7.3] - 2026-05-14

### Added
- Dev-only monthly report demo fixture script (`npm run seed:report-demo`) for teacher-facing draft and published report mock data across assigned students.
- Admin student onboarding plan controls for 4-class or 8-class manual billing plans with custom whole-dollar USD amounts.
- Admin student edit plan controls that update the active plan immediately while preserving prior subscription history.

### Changed
- Student plan labels now show the recorded manual billing amount and monthly class allowance instead of relying on the old fixed $90 / 4 classes copy.

## [0.7.2] - 2026-05-14

### Changed
- Removed the high-frequency class reminder Vercel Cron schedule so Hobby production deployments can complete; the Resend reminder endpoint remains available for manual or future scheduled use.

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
