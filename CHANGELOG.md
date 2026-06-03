# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

## [0.11.1] - 2026-06-03

### Added
- Teacher Skills management at `/teacher/skills`, reusing the shared academy skill catalog controls with teacher create/edit/deactivate/reorder support.
- Server-saved post-class workflow drafts so teachers can preserve in-progress lesson notes, skill ratings, repertoire updates, and practice assignments across browsers/devices.

### Changed
- Built-in skill names now display in Spanish across skill management, lesson notes, complete-class workflows, practice forms, videos, and progress summaries while keeping stored canonical names unchanged.
- Default skill synchronization is now local-development only in the admin UI and API; production operators can still use the explicit `skills:sync` script when needed.
- The post-class workflow now restores server drafts first, falls back to local browser drafts, autosaves changes to the server, and clears drafts after final class completion.

## [0.11.0] - 2026-06-03

### Added
- Native invoice Wompi payment-provider integration with hosted payment links, sandbox/production configuration, signed webhook processing, and automatic `WOMPI` payment ledger entries for approved transactions.
- Admin invoice controls for creating Wompi payment links, viewing provider status, and copying the configured webhook URL when the provider is enabled.
- Student and parent invoice payment buttons for open invoices with active Wompi links.
- Local Wompi sandbox webhook test tooling and setup documentation for localhost/tunnel testing.

### Changed
- Invoice emails include online payment links only when Wompi is enabled and configured.
- `WOMPI_PAYMENTS_ENABLED=false` now fully hides Wompi UI, links, buttons, badges, email payment links, and provider actions while preserving historical provider metadata.
- Wompi configuration validation now rejects obvious placeholder or too-short sandbox/production keys instead of showing a false configured state.

## [0.10.13] - 2026-06-03

### Fixed
- Student, family, class-detail, and admin progress note displays now preserve teacher-entered line breaks while still wrapping long text safely.

## [0.10.12] - 2026-06-03

### Added
- Teacher Lesson notes now has its own `/teacher/lesson-notes` menu item and workflow with assigned-student cards, selected-student context, lesson-note editing, and practice assignment creation.

### Changed
- Teacher Progress now focuses on progress overview, repertoire, practice, exam assessments, and reports, with a quick link into the dedicated Lesson notes workspace.
- Completing or updating a class now returns teachers to the Lesson notes workflow for the selected student.

## [0.10.11] - 2026-06-02

### Changed
- Complete-class skill ratings now use `0-5` sliders with localized `Not rated` states, keeping unrated skills out of submissions while preserving notes and quick rating shortcuts.

## [0.10.10] - 2026-06-02

### Added
- Animated class-in-progress tracking for teacher-started classes, including teacher start controls, join-class start marking, live progress cards, compact schedule/dashboard indicators, and protected teacher start API support.
- Admin skill management at `/admin/skills`, including create/edit/deactivate/reorder controls, default-skill synchronization, and a production-safe `skills:sync` script.
- Reusable protected catalog sheet attachments for repertoire catalog songs, with authenticated upload, delete, and download routes.

### Changed
- Repertoire catalog and student repertoire no longer use the obsolete song `Level` field; catalog search, assignment, seed/demo data, class completion, and exam selection now omit song level.
- Student, parent, and teacher repertoire surfaces now show shared catalog sheets alongside student-specific sheet attachments.
- Complete-class repertoire status dropdowns now use localized labels, and repertoire mastery updates now use 0-100% sliders instead of manual number inputs.

## [0.10.9] - 2026-06-02

### Added
- Teacher Progress now has dedicated `Exam assessments` and `Progress reports` navigation entries and pages for easier access to exam and report workflows.

### Changed
- Teacher lesson notes now use a full-width editor with slider ratings for quick ratings and observed skills, preventing observed skill rows from overflowing into adjacent panels.
- Teacher Progress no longer shows the recurring class setup card; recurring setup remains available from teacher dashboard and schedule.

## [0.10.8] - 2026-06-02

### Fixed
- Admin teacher impersonation now supports assigning catalog songs and selecting the student's full assigned repertoire inside Piano exam assessments.
- Piano exam PDFs now use safer header columns so the report title no longer overlaps the date, student, and teacher metadata.
- Piano exam PDF table headers now use balanced columns and dynamic header heights so long Spanish labels like `Interpretación` remain readable.

## [0.10.7] - 2026-06-01

### Changed
- Piano exam scoring now uses half-point sliders for repertoire, Harmony, and Music Reading scores instead of manual number inputs.
- Piano exam PDFs now use a more polished Spanish report layout with branded headers, summary score cards, refined section tables, score pills, cleaner comments wrapping, and footer pagination.

## [0.10.6] - 2026-06-01

### Added
- App-wide dark mode with light, dark, and system theme preferences across auth pages, the authenticated shell, shared UI, dashboards, schedules, forms, messages, notifications, and billing surfaces.
- Piano exam assessments for teacher/admin progress workflows and Piano evaluation classes, including repertoire scoring, Harmony rows, Music Reading rows, historical exam entry, and repertoire mastery updates.
- Student and parent Repertoire and Exams sections with published Piano exam results, protected exam PDF downloads, and family-visible learning cards.
- Teacher quick-cancel support for `RESCHEDULE_PENDING` classes, including request closure, notifications, and class-credit synchronization.

### Changed
- Teachers can manually add one-time classes outside their weekly availability while blackout dates, conflicts, and all student/parent scheduling protections remain enforced.
- Family-facing schedule and learning surfaces now link into the new repertoire and published exam experiences.
- Shared visual surfaces, inputs, buttons, badges, calendars, and shell chrome now use theme-aware tokens.

## [0.10.5] - 2026-05-30

### Added
- Admin Health Dashboard at `/admin/health` with read-only operational risk checks for teacher assignments, active consent, student inactivity, email delivery, blackout conflicts, billing setup, overdue invoices, negative class-credit balances, failed-login spikes, and timezone review.
- Admin CSV student provisioning import from `/admin/imports`, including preview/apply validation, teacher assignment, parent/guardian linking, native billing profile setup, optional Alegra contact linking, and import batch audit records.
- Consolidated pending roadmap document at `docs/pending-roadmap.md` for the main product, billing, scheduling, production hardening, and security backlog.

### Changed
- Student provisioning now supports `2`, `4`, and `8` monthly class allowances while continuing to suppress all welcome emails and magic links during CSV imports.
- Roadmap docs now mark Admin Health Dashboard, Parent Guardian Portal, Payment Tracking Ledger, and Class Credit Ledger as completed where applicable.

## [0.10.4] - 2026-05-29

### Added
- Teachers can now directly choose the final new date/time for their own `RESCHEDULE_PENDING` classes from teacher schedule rows and class detail.
- Added a teacher reschedule form with student/teacher timezone anchoring, original-time context, duration control, and optional visible response.

### Changed
- Direct teacher rescheduling validates future time, duration, teacher availability, blackout dates, and teacher/student conflicts before returning the class to `SCHEDULED`.
- Pending student/parent reschedule requests for the class are closed as accepted with an audit-friendly confirmed-time note, and the student/requesting parent are notified.

## [0.10.3] - 2026-05-29

### Fixed
- Admin teacher impersonation no longer loops in production when redirecting to teacher pages; middleware now lets audited admin impersonation sessions reach `/teacher/*` so server-side impersonation validation can resolve the effective teacher.

## [0.10.2] - 2026-05-29

### Added
- Admin-only teacher impersonation for production troubleshooting, with audited start/stop/expiry sessions, reason capture, IP/user-agent metadata, and a secure short-lived cookie.
- Impersonation controls on admin teacher/access surfaces plus recent impersonation history in `/admin/access`.
- Persistent high-contrast impersonation banner with original admin context, teacher context, expiry time, and a safe exit action.

### Changed
- Teacher routes and APIs can now resolve an active admin impersonation session as the effective teacher while preserving the real admin session for stop/current controls.
- Sensitive account settings are blocked while impersonating, including password, profile image, language, and timezone changes.
- Family dashboard plan copy now emphasizes Harmonizing monthly class allowance instead of Alegra invoice totals.

### Fixed
- Native invoice PDF downloads now regenerate stale PDFs after status changes so open/paid/void invoices show the current status instead of an older draft label.

## [0.10.1] - 2026-05-29

### Added
- Searchable IANA timezone selector for scheduling timezone preferences and admin timezone fields, with browser-supported timezone lists and fallback options.
- Admin recurring-series management on `/admin/schedule`, including series details, active/stopped state, upcoming class counts, and stop/delete actions.

### Changed
- Browser timezone detection is now only a visible suggestion; saved scheduling timezones are changed only through explicit user/admin selection.
- Custom timezone scheduling now uses the same searchable timezone picker instead of a free-text field.
- Recurring-series stop/delete actions now support admins for any series while keeping teachers limited to their own series.

## [0.10.0] - 2026-05-28

### Added
- Native Harmonizing invoicing with admin invoice creation, monthly drafts, next-month generation, branded PDF downloads, open/send workflow, email logging, and in-app invoice notifications.
- Student billing profiles with configurable class allowance and COP price-per-class defaults for native invoice generation.
- Payment tracking ledger with manual payments, partial balances, paid/open recalculation, voiding, and protected receipt attachments.
- Class credit ledger that grants credits from opened invoices, consumes billable completed/no-show classes, supports reversals, and allows admin manual adjustments.
- Admin account creation from `/admin/access` with temporary passwords while keeping admin accounts password-only.
- Login activity audit trail for successful and failed credentials/magic-link sign-ins with device, browser, IP, and country metadata.
- Collapsible admin desktop sidebar with a persisted icon rail preference per browser.

### Changed
- Student and parent invoice pages now prioritize native Harmonizing invoices, payment history, balances, credit summaries, and protected invoice/receipt downloads.
- Class completion and session update flows now update class credits idempotently for billable class outcomes.
- Admin invoice workspace now focuses on native billing while keeping Alegra as a secondary external reference.
- Development and deployment docs now include native invoicing, payment/credit ledger, login activity retention, and billing security roadmap updates.

## [0.9.0] - 2026-05-28

### Added
- Parent/guardian accounts and parent portal access for linked students, including schedule, progress, videos, invoices, messages, consent, and settings flows.
- Admin guardian management, parent welcome/access support, and parent password reset coverage from the admin access center.
- Parent-aware consent, protected media, invoice, messaging, notification, and student-data permission checks.
- Alegra admin explorer at `/admin/alegra` for live contact, invoice, and payment lookup with local student/family matching context.
- Manual Alegra contact linking per student plus invoice sync shortcuts from the Alegra explorer.

### Changed
- Invoice sync now supports linked parent emails while preserving per-student manual Alegra contact links.
- Local Docker/dev database workflow now uses Prisma migrations by default, with `db:push` reserved for disposable schema experiments.
- Development docs and env examples were updated for parent access, Alegra lookup, and safer migration behavior.

## [0.8.0] - 2026-05-27

### Added
- Admin-managed app announcements at `/admin/announcements` for message-of-the-day, feature updates, billing notices, and maintenance messages.
- Role-targeted, bilingual, dismissible announcement banners in the app shell with optional CTA links and publish windows.
- Prisma-backed announcement and per-user dismissal tracking.

### Changed
- Invoice pages now show production-safe “Invoices are not configured yet” messaging when Alegra is unavailable instead of exposing cached/sample demo invoice rows.
- Invoice sync APIs now reject sync attempts while invoice integration is not configured.
- Production-facing docs now describe pilot-safe invoice behavior and real workflow-created notifications.

### Removed
- The `Simulate reminders` button and notification simulation endpoint from the notifications center.
- User-facing demo-mode invoice messaging from student and admin invoice surfaces.

## [0.7.9] - 2026-05-27

### Added
- Admins and teachers can now update a student's current level from existing student/progress workflows while preserving level history in progress records.

### Changed
- Student dashboard level metrics now show localized level labels instead of raw enum values.
- Billing chrome no longer shows the demo-mode pill and now uses simpler “Invoices are not configured yet” copy when invoice integration is unavailable.

### Fixed
- Signed consent PDF attachments now use margin-safe text layout so bilingual consent text and audit hashes wrap within the page.

## [0.7.8] - 2026-05-19

### Changed
- Refreshed the shared visual system with Leonardo's input, moving the app toward a warmer premium musical/editorial feel instead of a generic dashboard look.
- Reduced page hero height and tightened dashboard rhythm so metrics, next-class context, and schedule previews appear sooner on iPad and desktop.
- Refined cards, buttons, badges, metric cards, skeleton loading states, and app surfaces with softer cream layers, luxury amber accents, gentler shadows, and clearer hierarchy.
- Updated the sidebar active state with a subtle rail, warm glow, gradient surface, and elevated icon chip for a more custom Harmonizing navigation experience.
- Improved the weekly calendar and grouped class lists with warmer day cells, availability heat indicators, stronger time hierarchy, calmer status badges, and more polished interactive states.

## [0.7.7] - 2026-05-18

### Added
- Student `/schedule` now includes a grouped “Upcoming and recent classes” list so families can review past and upcoming classes outside the weekly calendar.
- Shared grouped class list component with day headers, color accents, prominent time chips, status/type badges, materials counts, and class detail links.

### Changed
- Teacher and admin schedule class lists now group classes by day and make class times easier to scan on iPad/mobile widths.

## [0.7.6] - 2026-05-18

### Added
- Protected class-level materials for completed classes, including multi-file teacher uploads, authenticated download routes, class detail lists, and schedule attachment counts.
- Teacher self-service availability management with a dedicated teacher availability page.
- Teacher blackout dates for admin and teacher availability workflows, with scheduling validation that blocks new bookings, recurring occurrences, requests, and reschedules on unavailable days.

### Changed
- After-class lesson notes now use clearer labeled fields, replace “What went well” and “Improvement areas” with “General Comments,” and use sliders for the quick 1-5 lesson ratings.
- Local Docker development now runs the Next.js dev server by default for hot reload without rebuilding the web image for normal code changes.
- Repertoire/song forms were simplified by removing unnecessary active/focus/tempo fields from catalog-style song management.

### Fixed
- Student progress lesson summaries now label the teacher-entered general comments consistently.
- Schedule views now surface class material counts so students, teachers, and admins can find attached class files from the relevant class detail.

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
- Consent PDF generation now uses the standalone PDFKit bundle and buffer-based signature font registration so signing works in bundled Docker/Next.js runtime chunks.

## [0.7.5] - 2026-05-15

### Fixed
- Confirmed all current file-upload surfaces use private-store compatible Blob writes: profile photos, practice videos, and repertoire/sheet attachments.
- Profile image uploads now use private Vercel Blob access when production is connected to a private Blob store, with avatars served through an authenticated app route instead of requesting unsupported public writes.
- Vercel Blob storage now standardizes on the native `BLOB_READ_WRITE_TOKEN` for profile images, practice videos, and repertoire sheets so production can be switched to the private `harmonizing` Blob store without relying on a custom empty token variable.

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
