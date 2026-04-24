# Harmonizing v1

Premium, mobile-first web app for an online music school serving Spanish-speaking students in the United States.

## Release Metadata
- Current version: `v0.0.1`
- Changelog: [`CHANGELOG.md`](./CHANGELOG.md)

## Stack Decisions
- Next.js App Router + TypeScript
- Tailwind CSS + shadcn-style component primitives
- Prisma + PostgreSQL
- NextAuth (credentials) + RBAC middleware
- MinIO (local S3) for practice videos
- MailHog for local notification testing
- Alegra API integration for read-only invoicing sync
- Docker + Docker Compose local-first runtime

## One-Command Local Startup
1. Copy environment file:
   - `cp .env.example .env`
2. Run everything:
   - `docker compose up --build`

App endpoints:
- Web: `http://localhost:3010`
- MailHog: `http://localhost:8025`
- MinIO Console: `http://localhost:9011` (user/pass `minioadmin` / `minioadmin`)

## Demo Credentials
- Student: `student@harmonizing.app` / `Harmonizing123!`
- Teacher: `teacher@harmonizing.app` / `Harmonizing123!`
- Admin: `admin@harmonizing.app` / `Harmonizing123!`

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
- Reschedule proposal + teacher approve/reject flow
- Weekly practice upload metadata flow + teacher feedback flow
- Student-teacher chat thread (single active thread per assignment)
- Notification center + read state
- Admin metrics (students, teachers, MRR, weekly classes, workload)
- WhatsApp plan management CTA surfaced in student-facing areas
- Alegra invoicing v1: student invoices page, cached sync, admin monitor/relink tools
- Dockerized local stack with seed data

Current placeholders / known simplifications:
- Video playback URL is local path-style in UI; production should switch to signed/object URLs
- Chat is request/response polling-style (no websockets yet)
- No external payment gateway by design (WhatsApp management only)
- Invoicing is read-only in-app; payment collection remains external
- No production CDN, background jobs, or rate limiting yet

## Alegra Invoicing (v1)
- Student UI: `/invoices`
- Admin monitor: `/admin/invoices`
- Sync strategy: cached snapshots in DB, auto-sync every 6 hours (Vercel cron) plus manual sync from admin/student views
- Mapping default: exact email match from Harmonizing student email to Alegra contact
- Demo fallback: if Alegra credentials are missing, Harmonizing uses seeded local invoice snapshots and keeps the experience operable in read-only mode

Required environment variables:
- `ALEGRA_API_BASE_URL` (default `https://api.alegra.com/api/v1`)
- `ALEGRA_API_EMAIL`
- `ALEGRA_API_TOKEN`
- `INVOICE_SYNC_HOURS` (default `6`)
- `CRON_SECRET` (required for `/api/cron/invoices/sync`)

Demo fallback details:
- Seed creates sample invoices for demo students (`student@harmonizing.app`, `student2@harmonizing.app`)
- Student and admin invoice screens display a “modo demo” warning when credentials are missing
- Manual sync still works in demo mode and refreshes cache timestamps without external API calls

## Deployment Notes
- Local Docker runtime now builds and serves production output (`next build` + `next start`) for stability.
- For fast local iteration outside Docker, use `npm run dev` from `apps/web`.
- Optional dev mail preview: set `NOTIFICATION_SMTP_MIRROR=true` to mirror in-app notifications to MailHog inbox.
- Vercel production should keep `NEXTAUTH_URL` as deployed URL and disable local-only hostnames/ports.

## Docs
- Architecture: `docs/architecture.md`
- Phases: `docs/phases.md`
- UX system: `docs/ux-system.md`
