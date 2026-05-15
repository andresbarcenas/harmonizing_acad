# Vercel Deployment

Deploy Harmonizing from `apps/web`, not from the repository root. That directory is the Vercel project for the Next.js app.

## Production Environment

Configure these variables in the `apps/web` Vercel project for Production:

- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `CRON_SECRET`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `CLASS_EMAIL_REMINDERS_ENABLED=false`
- `CLASS_REMINDER_OFFSETS_MINUTES=1440,60`
- `CLASS_REMINDER_WINDOW_MINUTES=20`
- `STORAGE_PROVIDER=vercel-blob`
- `BLOB_READ_WRITE_TOKEN` from the intended Vercel Blob store. For production, this should be the private `harmonizing` store (`store_6qK2sEo1avMUTZrl`), not the old public `harmonizing-media` store.
- `ALEGRA_API_BASE_URL`
- `ALEGRA_API_EMAIL`
- `ALEGRA_API_TOKEN`
- `INVOICE_SYNC_HOURS=24`

Generate long random secrets locally when needed:

```bash
openssl rand -base64 32
```

Create the managed resources from `apps/web`:

```bash
npx vercel@latest integration add neon --environment production
npx vercel@latest integration add resend --environment production
npx vercel@latest blob create-store harmonizing --access private --yes --environment production
```

Neon injects `DATABASE_URL` and `DATABASE_URL_UNPOOLED`. Resend injects `RESEND_API_KEY`; configure `RESEND_FROM_EMAIL` with a verified sender/domain. Magic-link sign-in emails, consent receipt emails, and class reminder emails all use this sender. Vercel Blob injects `BLOB_READ_WRITE_TOKEN`; production must point that variable at the private `harmonizing` Blob store.

Profile images, practice videos, and repertoire/sheet attachments are uploaded to the private production Blob store. Avatars are served through authenticated app routes so profile uploads work with a private-only store while existing public avatar URLs continue to render.

- `/api/media/profile-images/[userId]`
- `/api/media/videos/[videoId]`
- `/api/media/repertoire-attachments/[attachmentId]`

`NEXT_PUBLIC_MEDIA_BASE_URL` is only needed for local MinIO/S3-style storage and should not be required for the Vercel Blob production path.

After confirming `BLOB_READ_WRITE_TOKEN` points to the private production Blob store, migrate existing public practice videos and sheet attachments into private storage:

```bash
cd apps/web
npm run migrate:protected-media
npm run migrate:protected-media -- --apply
```

For production, use the same direct production environment and add the explicit safety flag:

```bash
npm run migrate:protected-media -- --apply --force-production
```

The migration is idempotent and skips records whose `storageKey` already starts with `private-media/`. It copies existing files and updates database records, but it does not delete old public blobs automatically. After verifying protected playback/downloads, remove old public media manually from the public Blob store if needed.

## First-Time Link

Run these commands from the app directory:

```bash
cd apps/web
npx vercel@latest login
npx vercel@latest link
```

Choose the existing `web` Vercel project.

## Manual Production Deploy

Run these commands from `apps/web`:

```bash
npm run lint
npm run typecheck

npx vercel@latest pull --yes --environment=production
npx vercel@latest build --prod

npx vercel@latest env run -e production -- npm run bootstrap:prod

npx vercel@latest deploy --prebuilt --prod --archive=tgz
```

The `bootstrap:prod` command runs migrations and creates the initial production admin if needed. It prints a temporary password only when it creates or resets the admin account. Store that password privately immediately.

Default admin email:

```text
admin@harmonizing.app
```

After signing in, create teachers and students through `/admin/teachers` and `/admin/students`.

## GitHub Actions Production Deploy

The workflow in `.github/workflows/deploy-vercel.yml` deploys production whenever commits land on `main`. It also supports manual runs through GitHub Actions `workflow_dispatch`.

Add these repository secrets in GitHub under `Settings > Secrets and variables > Actions`:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `DATABASE_URL`

Use `apps/web/.vercel/project.json` for the Vercel org and project IDs. Keep the token and database URL private.
Use the unpooled Neon connection string (`DATABASE_URL_UNPOOLED` or `POSTGRES_URL_NON_POOLING`) for the GitHub `DATABASE_URL` secret because GitHub Actions runs Prisma migrations.

The workflow runs from `apps/web`, installs dependencies, lints, typechecks, pulls the Vercel production environment, builds with `vercel build --prod`, applies Prisma migrations, and deploys the prebuilt output with `vercel deploy --prebuilt --prod --archive=tgz`.

`npm run prisma:deploy` automatically prefers a direct migration URL in this order: `MIGRATION_DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `POSTGRES_URL_NON_POOLING`, then `DATABASE_URL`. It refuses obvious pooled Neon URLs so migration advisory locks do not get stranded behind PgBouncer.

It intentionally does not run `bootstrap:prod`; admin bootstrap stays manual because it can create or reset credentials.

## Safety Notes

- Never run `npm run prisma:seed` against production.
- Vercel cron is configured in `apps/web/vercel.json` because `apps/web` is the deployed project root.
- If `NEXTAUTH_URL` changes, redeploy so the new environment value applies.
- Student consent signing stores the generated PDF privately in Postgres and sends a copy by Resend. If Resend is unavailable, the signature remains valid and `/admin/consents` shows the skipped/failed email state.
- Student practice videos and repertoire/sheet attachments are protected media. Admins can access all, teachers can access assigned students only, and students can access only their own media. Manual QA should verify that a student cannot open another student's `/api/media/videos/...` or `/api/media/repertoire-attachments/...` URL.
- The daily invoice cron is Hobby-safe. Class reminder email code remains available at `/api/cron/class-reminders`, but it is not scheduled on Vercel yet because Hobby accounts reject more-than-daily cron schedules.
- Disable Vercel's native Git auto-deploy if this GitHub Actions workflow is the production deploy source, otherwise `main` pushes can create duplicate deployments.
