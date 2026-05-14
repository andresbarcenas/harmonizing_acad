# Harmonizing v1

Premium, mobile-first web app for an online music school serving Spanish-speaking students in the United States.

## Release Metadata
- Current version: `v0.7.3`
- Changelog: [`CHANGELOG.md`](./CHANGELOG.md)

## Stack Decisions
- Next.js App Router + TypeScript
- Tailwind CSS + shadcn-style component primitives
- Prisma + PostgreSQL
- NextAuth (credentials) + RBAC middleware
- MinIO (local S3) for practice videos
- Resend for production class reminder emails
- MailHog for local notification testing
- Alegra API integration for read-only invoicing sync
- Docker + Docker Compose local-first runtime

## One-Command Local Startup
1. Copy environment file:
   - `cp .env.example .env`
2. Run everything:
   - `docker compose up --build`
3. Run route smoke after boot:
   - `cd apps/web && npm run smoke:routes`

App endpoints:
- Web: `http://localhost:3010`
- MailHog: `http://localhost:8025`
- MinIO Console: `http://localhost:9011` (user/pass `minioadmin` / `minioadmin`)

## Demo Credentials
- Student: `isabella@harmonizing.com` / `demo123`
- Historical import student: `tommy@harmonizing.com` / `demo123`
- Teacher: `maria@harmonizing.com` / `demo123`
- Admin: `admin@harmonizing.com` / `demo123`

## Phase Checklist
- [x] Phase 1 — Foundation / Architecture / Design System
- [x] Phase 2 — Core Student Experience
- [x] Phase 3 — Scheduling / Rescheduling
- [x] Phase 4 — Teacher Workspace
- [x] Phase 5 — Weekly Practice Video System
- [x] Phase 6 — Messaging + Notifications
- [x] Phase 7 — Admin Operations
- [x] Phase 8 — Polish / QA / Demo Readiness (v1 baseline)

## Complete vs Placeholder (Important)
Complete in this v1:
- Role-based dashboards and navigation (student/teacher/admin)
- UTC-backed sessions and timezone-local rendering
- Week-aware student schedule navigation for future recurring classes
- Reschedule proposal + teacher approve/reject flow
- Weekly practice upload metadata flow + teacher feedback flow
- Student-teacher chat thread (single active thread per assignment)
- Notification center + read state
- English/Spanish UI support with English default and account-level preference
- Auth-first root route (`/`) that redirects to sign-in or the active role workspace
- Student/parent progress portal with lesson summaries, practice assignments, completion notes, repertoire, video request links, skill snapshots, and reports
- Repertoire song sheet attachments for PDF/image sheet music
- Instrument-specific after-class skill ratings for piano versus singing/vocal lessons
- Single-class scheduling management for trial, makeup, extra, evaluation, replacement, and one-off private lessons
- Recurring-class setup from teacher dashboard, teacher schedule/progress context, and admin schedule
- Resend-backed class email reminders with idempotent delivery tracking
- Student-requested one-off classes with teacher/admin review, approval/rejection notifications, and rejection reason visibility
- Historical PDF import staging/review for Tommy's piano consolidated history (`/admin/imports`)
- Responsive navigation and schedule/workflow layouts tuned for iPhone and iPad portrait/landscape use
- Admin metrics (students, teachers, MRR, weekly classes, workload)
- WhatsApp plan management CTA surfaced in student-facing areas
- Alegra invoicing v1: student invoices page, cached sync, admin monitor/relink tools
- Dockerized local stack with seed data

Current placeholders / known simplifications:
- Video playback URL is local path-style in UI; production should switch to signed/object URLs
- Chat is request/response polling-style (no websockets yet)
- No external payment gateway by design (WhatsApp management only)
- Invoicing is read-only in-app; payment collection remains external
- Historical imports are deterministic and admin-reviewed; image-only pages remain source-only until OCR/manual review is added
- Some stored historical notifications may retain the language used when they were created
- No production CDN, background jobs, rate limiting, or observability package yet

## Alegra Invoicing (v1)
- Student UI: `/invoices`
- Admin monitor: `/admin/invoices`
- Sync strategy: cached snapshots in DB, daily Vercel cron in production plus manual sync from admin/student views
- Mapping default: exact email match from Harmonizing student email to Alegra contact
- Demo fallback: if Alegra credentials are missing, Harmonizing uses seeded local invoice snapshots and keeps the experience operable in read-only mode

Required environment variables:
- `ALEGRA_API_BASE_URL` (default `https://api.alegra.com/api/v1`)
- `ALEGRA_API_EMAIL`
- `ALEGRA_API_TOKEN`
- `INVOICE_SYNC_HOURS` (default `6`)
- `CRON_SECRET` (required for `/api/cron/invoices/sync`)

Demo fallback details:
- Seed creates sample invoices for demo students (`isabella@harmonizing.com`, `luis@harmonizing.com`)
- Student and admin invoice screens display a “modo demo” warning when credentials are missing
- Manual sync still works in demo mode and refreshes cache timestamps without external API calls

## Historical Imports
- Admin review UI: `/admin/imports`
- Generic import: `docker compose exec web npm run import:student-history -- --student-email "student@example.com" --student-name "Student Name" --teacher-email "maria@harmonizing.com" --instrument "Piano" --pdf "/imports/student-history.pdf"`
- Tommy local pilot: `docker compose exec web npm run import:tommy-history`
- Dry run: `docker compose exec web npm run import:student-history -- --dry-run --student-email "student@example.com" --pdf "/imports/student-history.pdf"`
- PDF mount directory: `HARMONIZING_IMPORTS_DIR=/Users/andresbarcenas/Downloads`
- Details: [`docs/historical-imports.md`](./docs/historical-imports.md)

## Deployment Notes
- Local Docker runtime starts the app in development mode after Prisma setup for fast iteration.
- For production verification before deploy, use `npm run build && npm run start` from `apps/web`.
- Vercel deployment runbook: [`docs/deployment.md`](./docs/deployment.md)
- Optional dev mail preview: set `NOTIFICATION_SMTP_MIRROR=true` to mirror in-app notifications to MailHog inbox.
- Class reminders use Resend in production. Configure `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `CLASS_EMAIL_REMINDERS_ENABLED=true`, `CLASS_REMINDER_OFFSETS_MINUTES`, and `CRON_SECRET`.
- Vercel production should keep `NEXTAUTH_URL` as deployed URL and disable local-only hostnames/ports.

## Docs
- Architecture: `docs/architecture.md`
- Deployment: `docs/deployment.md`
- Phases: `docs/phases.md`
- Responsive QA: `docs/responsive-qa.md`
- Progress reports: `docs/progress-reports.md`
- Historical imports: `docs/historical-imports.md`
- Repertoire attachments and class reminders: `docs/repertoire-reminders.md`
- UX system: `docs/ux-system.md`
