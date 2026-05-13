# Harmonizing Web App

This package contains the Next.js application for Harmonizing.

## Scripts
- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run typecheck`
- `npm run prisma:generate`
- `npm run prisma:migrate`
- `npm run prisma:seed`
- `npm run bootstrap:admin`
- `npm run bootstrap:prod`
- `npm run import:student-history`
- `npm run import:tommy-history`

## Local env
See root `.env.example` and `apps/web/.env.example`.

`npm run prisma:migrate` uses `prisma db push` for local Docker convenience and runs a small pre-push compatibility step for existing progress report rows. Do not use `--force-reset` unless you intentionally want to delete local data.

## Class reminders
Production class reminder emails use Resend. Set `RESEND_API_KEY`, a verified `RESEND_FROM_EMAIL`, `CLASS_EMAIL_REMINDERS_ENABLED=true`, and `CRON_SECRET`. Vercel Cron calls `/api/cron/class-reminders`; local development can trigger the endpoint manually.

## Historical imports
With Docker running, use `docker compose exec web npm run import:student-history -- --student-email "student@example.com" --student-name "Student Name" --teacher-email "maria@harmonizing.com" --instrument "Piano" --pdf "/imports/student-history.pdf"` to stage any student's historical PDF into the admin review queue. The Tommy shortcut remains available with `docker compose exec web npm run import:tommy-history`. See [`docs/historical-imports.md`](../../docs/historical-imports.md).

## Deployment
Deploy this package as the Vercel project root. See [`docs/deployment.md`](../../docs/deployment.md) for the production runbook.
