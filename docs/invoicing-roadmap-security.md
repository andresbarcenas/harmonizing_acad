# Harmonizing Invoicing Roadmap + Security Hardening

This roadmap keeps stable names for invoicing and billing improvements. For the single current pending list across product, billing, operations, and security, use [Consolidated Pending Roadmap](./pending-roadmap.md).

Native Harmonizing invoices are now the primary billing experience. Alegra remains useful as an external reference while the app grows toward richer internal billing, payment tracking, and future payment-provider integration.

## Named Invoicing Plans

### 1. Billing Contact Profile
Store payer/legal billing details per student or family: legal name, ID/NIT/cedula, billing email, phone, address, preferred recipient, and invoice notes. This should be the next billing feature because invoices are often under the parent or guardian name, not the student name.

### 2. Payment Tracking Ledger — Completed
Manual payment records now track amount, date, method, reference number, notes, protected receipt attachments, voiding, and partial-payment support so `PAID` status is backed by auditable payment history.

### 3. Class Credit Ledger — Completed
Class credits now track invoice grants, completed/no-show class consumption, reversals, manual admin adjustments, and remaining class balance.

### 4. Monthly Billing Review Queue
Generate monthly drafts into a review workspace with readiness states such as `Ready`, `Missing billing contact`, `Missing price`, `Already invoiced`, and `Needs review`.

### 5. Invoice Aging And Statements
Add aging buckets, family balance, overdue totals, and downloadable account statements for parents and admins.

### 6. Invoice Reminder Automation
Send friendly reminder emails and in-app notifications before due date, on due date, and after overdue, with admin controls to pause reminders per family.

### 7. Payment Provider Integration — Completed
Wompi hosted payment links now connect native Harmonizing invoices to online payments. The integration is env-gated, supports sandbox setup on localhost, verifies signed webhooks, and records approved Wompi transactions into the payment ledger without storing card or bank data.

### 8. WhatsApp Billing Helper
Generate prefilled WhatsApp copy for invoice links, overdue reminders, and payment confirmations without storing WhatsApp message history.

### 9. Tax/DIAN Readiness Layer
Add placeholders for DIAN-related metadata, invoice resolution/numbering, CUFE/provider status, and compliance export fields. Treat this as preparation only until reviewed by an accountant or legal advisor.

### 10. Billing Health Dashboard
Show billing risks: overdue invoices, failed invoice emails, missing billing contacts, students without price profiles, duplicate drafts, unpaid balances, and parents without linked accounts.

## Recommended Order

1. Billing Contact Profile
2. Monthly Billing Review Queue
3. Invoice Aging And Statements
4. Invoice Reminder Automation
5. WhatsApp Billing Helper
6. Tax/DIAN Readiness Layer
7. Billing Health Dashboard

## Security Hardening Recommendations

### Data Minimization

- Store only billing data needed to operate: payer identity, invoice PDFs, payment references, and audit history.
- Do not store card numbers, bank credentials, payment secrets, or sensitive payment instruments.
- Keep native invoice PDFs private and accessible only through authenticated routes.
- Add a retention review before storing receipt attachments or payment proof files at scale.

### Access Control

- Keep admin-only invoice creation, editing, sending, and status changes.
- Parents and students should only read invoices for linked/self students.
- Add explicit audit logs for invoice create, open/send, status change, PDF download, payment record, reminder send, and webhook status changes.
- Keep following OWASP guidance closely; broken access control remains a top application risk. Reference: [OWASP Top 10](https://owasp.org/Top10/2021/).

### Secrets And Vercel

- Mark production secrets as sensitive in Vercel whenever possible.
- Rotate `NEXTAUTH_SECRET`, database URLs, Resend keys, Blob tokens, GitHub tokens, and Vercel tokens after major access changes.
- Restrict Vercel and GitHub team access, require 2FA, and remove old collaborators.
- Protect preview deployments if billing data is reachable from preview environments. Reference: [Vercel Deployment Protection](https://vercel.com/docs/security/deployment-protection).
- Keep production, preview, and development environment variables separate. Reference: [Vercel Environment Variables](https://vercel.com/docs/environment-variables).

### Database Security

- Treat Neon production and development as separate branches/projects where possible.
- Use pooled database URLs for runtime and direct/unpooled URLs only for migrations.
- Use least-privilege roles when feasible: one app runtime role and one migration/admin role.
- Neon requires SSL/TLS and supports stronger connection security options such as `verify-full`; validate Prisma compatibility before switching production connection strings. Reference: [Neon security overview](https://neon.com/docs/security/security-overview).
- If the account/plan supports it, consider Neon IP allowlisting or private networking for production. Reference: [Neon project network security](https://neon.com/docs/manage/projects).

### Payment Provider Safety

- Use hosted checkout/payment links instead of collecting payment details directly.
- Store only provider IDs, payment status, timestamps, amount, and redirect/payment URLs.
- Verify provider webhook signatures before changing invoice/payment status.
- Keep payment status changes idempotent so duplicate webhooks cannot double-credit a student.
- Wompi supports payment links via dashboard or API, which fits the future Colombia payment direction. Reference: [Wompi payment links](https://docs.wompi.co/en/docs/colombia/links-de-pago/).

### Operational Monitoring

- Add admin alerts for failed invoice emails, repeated failed sign-ins, suspicious PDF access, and webhook failures.
- Add dependency scanning and keep Prisma, Next.js, NextAuth, PDFKit, and storage/email dependencies patched.
- Keep GitHub branch protection and required checks before deployment.
- Keep backups/PITR enabled where available, and test restore before real billing data grows.
- Log enough operational metadata for investigations without storing full payment secrets or unnecessary private data.

## Current Defaults And Assumptions

- Native Harmonizing invoices are internal billing documents for now, not certified Colombian electronic invoices.
- Wompi payment provider integration is implemented with hosted payment links; future provider expansion should keep avoiding direct handling of card or bank data.
- Harmonizing does not store card numbers, bank credentials, or payment instrument secrets.
- Alegra remains an external reference during transition.
- Security priority is practical pilot hardening first, then compliance-grade controls as real payment and tax workflows expand.
