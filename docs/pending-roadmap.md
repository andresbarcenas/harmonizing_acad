# Consolidated Pending Roadmap

This is the single quick-reference list of the main pending Harmonizing Academy work. Detailed historical context can still live in the feature-specific docs, but this file should answer: "What is still pending?"

## Product Features

### Timestamped Video Feedback
Let teachers leave feedback tied to exact video timestamps, such as `0:32` or `1:14`, so student video review feels music-specific and premium.

### Curriculum Map
Create Piano and Voice curriculum paths by level so progress connects to academy milestones, skills, repertoire expectations, and level advancement.

### Weekly Family Digest
Send a weekly email summary to families with completed classes, homework, next class, practice activity, teacher comments, and important reminders.

### Practice Timer And Streaks
Add a student practice timer tied to assignments, with streaks, weekly minutes, and motivational progress tracking.

### Recital Performance Mode
Track recital/performance pieces, readiness, backing tracks, teacher notes, student videos, and performance dates.

### Catalog Sheet Attachments
Allow sheet music and reference materials to live on global catalog songs, so teachers can reuse materials when assigning songs to students.

## Invoicing And Billing

### Billing Contact Profile
Store payer/legal billing details per student or family: legal name, ID/NIT/cedula, billing email, phone, address, preferred recipient, and invoice notes.

### Monthly Billing Review Queue
Generate monthly drafts into a review workspace with readiness states such as `Ready`, `Missing billing contact`, `Missing price`, `Already invoiced`, and `Needs review`.

### Invoice Aging And Statements
Add aging buckets, family balance, overdue totals, and downloadable account statements for parents and admins.

### Invoice Reminder Automation
Send friendly reminder emails and in-app notifications before due date, on due date, and after overdue, with admin controls to pause reminders per family.

### WhatsApp Billing Helper
Generate prefilled WhatsApp copy for invoice links, overdue reminders, and payment confirmations without storing WhatsApp message history.

### Tax/DIAN Readiness Layer
Add placeholders for DIAN-related metadata, invoice resolution/numbering, CUFE/provider status, and compliance export fields. Treat this as preparation only until reviewed by an accountant or legal advisor.

### Billing Health Dashboard
Show billing risks: overdue invoices, failed invoice emails, missing billing contacts, students without price profiles, duplicate drafts, unpaid balances, and parents without linked accounts.

## Scheduling And Reminders

### Scheduled Class Reminder Execution
The class reminder endpoint exists, but production scheduling strategy is still pending. Add scheduled execution when the Vercel plan or reminder strategy supports the needed cadence.

### Realtime Messaging Or SSE
Add realtime messaging or server-sent events if live chat becomes required during pilot or production usage.

## Production Hardening

### Background Jobs
Add a background-job strategy for heavier async work beyond current Vercel cron/manual triggers.

### Rate Limiting
Add rate limiting for authentication, magic-link requests, uploads, imports, and other sensitive or high-cost endpoints.

### Production Observability And Alerting
Add operational alerts for failed invoice emails, repeated failed sign-ins, suspicious PDF/media access, webhook failures, and critical workflow errors.

### Dependency Scanning
Add dependency scanning and keep Prisma, Next.js, NextAuth, PDFKit, storage, and email dependencies patched.

## Security And Compliance

### Broader Audit Logs
Add explicit audit logs for invoice create, open/send, status change, PDF download, payment record, reminder send, webhook status changes, and other sensitive admin actions.

### Receipt Attachment Retention Review
Define retention rules before storing receipt attachments or payment proof files at scale.

### Secrets Rotation And Access Hardening
Rotate `NEXTAUTH_SECRET`, database URLs, Resend keys, Blob tokens, GitHub tokens, and Vercel tokens after major access changes. Restrict Vercel/GitHub team access, require 2FA, and remove old collaborators.

### Preview Deployment Protection
Protect preview deployments if billing or student data is reachable from preview environments.

### Environment Separation
Keep production, preview, and development environment variables separate.

### Neon Database Hardening
Use separate Neon production/development branches or projects where possible, pooled runtime URLs, direct migration URLs, and least-privilege database roles when feasible.

### Stricter TLS And Network Controls
Validate Prisma compatibility before switching Neon connection strings to stricter TLS modes such as `verify-full`. Consider Neon IP allowlisting or private networking if the account/plan supports it.

### Payment Provider Safety
Use hosted checkout/payment links, store only provider IDs/status/timestamps/amounts/URLs, verify webhook signatures, and keep webhook status changes idempotent.

## Completed Recently

- Teacher Prep Dashboard
- Parent Guardian Portal
- Payment Tracking Ledger
- Class Credit Ledger
- Admin Health Dashboard
- Payment Provider Integration: Wompi hosted payment links
