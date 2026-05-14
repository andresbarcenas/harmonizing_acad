# Privacy and Media Consent

Harmonizing requires a parent or legal guardian consent before a student account can use the app. This protects the workflow where the academy collects practice videos, audio, images, progress records, lesson notes, messages, schedules, and reports.

## Workflow

1. A student signs in for the first time.
2. Protected student pages and student API operations redirect or return `CONSENT_REQUIRED` until the active consent is signed.
3. `/consent` displays the active bilingual consent in Spanish and English.
4. A parent or guardian enters full legal name, relationship, email, and confirms authority to sign.
5. The app generates a signed PDF with the Harmonizing logo, consent text, student email, signature, signed date, and hash.
6. The PDF is stored privately in Postgres and emailed through Resend as an attachment.
7. The student account can continue to the portal.

Teachers and admins are not blocked by the student consent gate.

## Data Model

- `ConsentDocument` stores versioned bilingual consent templates.
- `ConsentSignature` stores the student user, parent/guardian signer details, signed timestamp, IP/user-agent metadata, consent text hash, private PDF bytes, PDF hash, and email delivery status.
- The active default version is `privacy-media-consent-v1`.
- One user can sign one record per active document version.

If the consent wording changes materially, create a new active `ConsentDocument` version. Students will then be required to sign the new version while older signatures remain archived.

## PDF and Email

- PDF generation uses a server-only Node route and `pdfkit`.
- The signature preview and PDF use the bundled OFL-licensed Dancing Script font.
- The PDF is stored as private database bytes, not public object storage.
- Resend sends the receipt email using `RESEND_API_KEY` and `RESEND_FROM_EMAIL`.
- If Resend is unavailable or fails, the consent still remains signed; admin can see `SKIPPED` or `FAILED` in `/admin/consents`.

## Access Rules

- Unsigned students cannot use schedule, videos, progress, messages, invoices, notifications, settings, or student mutation APIs.
- Students can access `/consent`, sign consent, change language/timezone, and sign out.
- A student can download only their own signed PDF.
- Admins can view all consent statuses and download signed PDFs.
- Teachers cannot access signed consent PDFs.

## Admin Tracking

Admins can open `/admin/consents` to see:

- all student accounts
- signed or missing status
- signer name and relationship
- signed date
- email delivery status and error
- signed PDF download link

Filters are available for all, signed, missing, and email failed.

## Manual Test Plan

Student:

1. Sign in as an unsigned student.
2. Confirm `/dashboard`, `/schedule`, `/videos`, `/progress`, and `/messages` redirect to `/consent`.
3. Try a student API mutation such as video upload or practice log and confirm `428 CONSENT_REQUIRED`.
4. Open `/consent`, review Spanish and English content, enter signer details, and sign.
5. Confirm the app redirects to `/dashboard`.
6. Confirm `/settings` shows the signed consent card and PDF download.

Admin:

1. Sign in as admin.
2. Open `/admin/consents`.
3. Confirm unsigned and signed students render correctly.
4. Download a signed PDF.
5. Confirm the email status shows `SENT`, `SKIPPED`, or `FAILED`.

Email:

1. Set `RESEND_API_KEY` and verified `RESEND_FROM_EMAIL`.
2. Sign consent with a reachable signer email.
3. Confirm the email arrives with the PDF attachment.
4. Temporarily remove `RESEND_API_KEY`, sign with another student, and confirm the signature is saved with skipped email status.

Legal note: this is a strong operational default, not legal advice. Have counsel review the final consent text before production use, especially for minors and video/audio collection.
