# Harmonizing v1

Premium, mobile-first web app for an online music school serving Spanish-speaking students in the United States.

## Release Metadata
- Current version: `v0.1.0`
- Changelog: [`CHANGELOG.md`](./CHANGELOG.md)

## Stack Decisions
- Next.js App Router + TypeScript
- Tailwind CSS + shadcn-style component primitives
- Prisma + PostgreSQL
- NextAuth (credentials) + RBAC middleware
- MinIO (local S3) for practice videos
- MailHog for local notification testing
- Docker + Docker Compose local-first runtime

## One-Command Local Startup
1. Copy environment file:
   - `cp .env.example .env`
2. Run everything:
   - `docker compose up --build`

App endpoints:
- Web: `http://localhost:3001`
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
- Dockerized local stack with seed data

Current placeholders / known simplifications:
- Video playback URL is local path-style in UI; production should switch to signed/object URLs
- Chat is request/response polling-style (no websockets yet)
- Teacher class completion action is linked from dashboard to request workflow page (no inline note modal)
- No external payment gateway by design (WhatsApp management only)
- No production CDN, background jobs, or rate limiting yet

## Docs
- Architecture: `docs/architecture.md`
- Phases: `docs/phases.md`
- UX system: `docs/ux-system.md`
