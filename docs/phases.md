# Implementation Phases

- [x] Foundation: project scaffold, RBAC auth, Prisma schema, Docker stack, seed data
- [x] Student core: premium dashboard, plan details, assigned teacher, progress, WhatsApp CTA
- [x] Scheduling: weekly calendar grid, teacher-only availability slots, guarded pending approval flow
- [x] Teacher workspace: classes today, student roster, inline status + notes, request/video previews
- [x] Weekly practice videos: upload + browser record, review queue, feedback timeline, weekly missing indicators
- [x] Messaging + notifications: assignment-bound chat, polling refresh, unread counters, reminder simulation
- [x] Admin operations: metrics, reassignment tools, occupancy analytics, availability management controls
- [x] Polish/QA: responsive empty/loading states, accessibility-focused forms, richer seeded demo content, updated docs
- [x] Premium visual refresh: app-wide calm-luxury redesign from auth reference across shared primitives and role surfaces
- [x] Alegra invoicing v1: read-only student invoices, cached sync engine, admin monitoring/relink controls
- [x] v0.4.0 stabilization: English/Spanish locale support, auth-first root route, week-aware student schedule visibility, route smoke script
- [x] v0.5.0 student/parent progress portal: lesson summaries, assignments with completion notes, practice logging, repertoire, video request links, skill snapshots

## Current MVP Status

- MVP-complete locally: authenticated role workspaces, scheduling/rescheduling, recurring class visibility, practice upload/review, messaging, notifications, admin operations, and read-only invoicing.
- Release baseline: English is the default language; Spanish is selectable publicly and per account.
- Validation baseline: `npm run typecheck`, `npm run lint`, `npm run build`, and `npm run smoke:routes` after `docker compose up --build`.

## Remaining Production Hardening

- Signed media URLs/CDN for practice videos.
- Realtime messaging or SSE if live chat becomes required.
- Background jobs for reminders/invoice sync beyond cron/manual triggers.
- Rate limiting, audit logs, production observability, and alerting.
