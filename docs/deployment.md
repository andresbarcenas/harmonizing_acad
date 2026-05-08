# Vercel Deployment

Deploy Harmonizing from `apps/web`, not from the repository root. That directory is the Vercel project for the Next.js app.

## Production Environment

Configure these variables in the `apps/web` Vercel project for Production:

- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `CRON_SECRET`
- `STORAGE_PROVIDER=vercel-blob`
- `BLOB_READ_WRITE_TOKEN`
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
npx vercel@latest blob create-store harmonizing-media --access public --yes --environment production
```

Neon injects `DATABASE_URL` and `DATABASE_URL_UNPOOLED`. Blob injects `BLOB_READ_WRITE_TOKEN`.

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
- The Vercel cron is configured in `apps/web/vercel.json` because `apps/web` is the deployed project root.
- If `NEXTAUTH_URL` changes, redeploy so the new environment value applies.
- The daily invoice cron is Hobby-safe. Use a more frequent schedule only after confirming the Vercel plan supports it.
- Disable Vercel's native Git auto-deploy if this GitHub Actions workflow is the production deploy source, otherwise `main` pushes can create duplicate deployments.
