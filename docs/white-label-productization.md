# White-Label Productization And Customer Feature Strategy

## Summary

The app has enough product depth to become useful beyond Harmonizing Academy. The safest first commercial path is **white-label deployment**, not full shared-database multi-tenancy.

White-label means each academy gets its own deployment, database, storage, email sender, payment credentials, and academy configuration while all deployments run from the same shared codebase. This keeps student data isolated, lowers security risk, and makes the first customer pilots much easier to operate.

True multi-tenancy can come later if multiple academy deployments prove demand.

## Recommended Commercial Model

Start with one codebase and one release stream.

For each customer academy:

- Create a separate Vercel project or production environment.
- Use a separate Neon database.
- Use a separate private Blob/storage store or storage prefix.
- Use a separate Resend sender/domain.
- Use separate Wompi, Alegra, and other integration credentials.
- Configure academy identity through environment variables or a future academy settings screen.

This gives each academy strong operational isolation without the complexity of adding tenant IDs to every table and permission query immediately.

## Why White-Label First

White-label is the best first step because the current app is single-academy by design.

Important current constraints:

- `User.email` is globally unique.
- Skill categories, repertoire catalog, announcements, consent documents, invoice sequences, and integrations are global.
- Many records link directly to users, students, teachers, and parents without an academy or organization boundary.
- Billing, consent, PDF, email, WhatsApp, metadata, seed data, and documentation still include Harmonizing-specific assumptions.

Trying to host many academies in one shared database now would require a broad schema and authorization migration. White-label deployment lets the business sell pilots sooner while still improving the architecture in a tenant-ready direction.

## What Should Become Configurable

These values should move out of hardcoded Harmonizing copy and into a centralized academy configuration layer:

- Academy name, short name, subtitle, logo, and brand mark.
- App metadata title and description.
- Default locale, timezone, country, and currency.
- Support email, billing email, and WhatsApp phone/message.
- Default meeting URL.
- Invoice prefix and invoice numbering identity.
- Billing business name, tax ID/NIT, address, legal footer, and invoice notes.
- Email sender name/address and email template branding.
- Consent document title, academy wording, and PDF branding.
- Wompi enablement and credentials.
- Alegra enablement and credentials.
- Storage provider, bucket/store, and media base URL.
- Demo seed behavior and bootstrap admin email.

The first implementation should use environment variables and typed server-side config. A later version can add an admin-only Academy Settings page for safe non-secret settings.

## Customer Deployment Model

For a new academy, the operator should be able to:

1. Create a new Vercel project from the same repository.
2. Configure customer-specific environment variables.
3. Connect a dedicated Neon database.
4. Connect a dedicated private storage store.
5. Configure a verified Resend sender/domain.
6. Configure optional Wompi and Alegra credentials.
7. Run migrations.
8. Run bootstrap for the first admin account.
9. Sync default skills and optional starter catalog data.
10. Import students, parents, teachers, billing profiles, and repertoire as needed.

The deployment should not require customer-specific code changes.

## Customer Feature Strategy

The product should avoid permanent customer forks. A fork may feel fast once, but it creates long-term maintenance drag because every bug fix, security patch, and feature release must be merged multiple times.

Default policy:

- Keep one shared codebase.
- Keep one release stream.
- Keep customer differences in configuration, feature flags, permissions, or academy settings.
- Avoid customer-specific branches for production deployments.
- Only accept private/custom behavior when there is a clear business reason and a maintenance owner.

## Feature Categories

### Core Platform Feature

A feature useful to most music academies.

Examples:

- Student/parent portal.
- Scheduling and rescheduling.
- Teacher lesson notes.
- Practice assignments.
- Native invoicing.
- Payment tracking.
- Class credits.

Build these into the shared product.

### Configurable Feature

The same feature is useful to many academies, but behavior or labels differ by academy.

Examples:

- Invoice prefix.
- Class package sizes.
- Default price per class.
- Consent text.
- Branding and colors.
- WhatsApp contact.
- Enabled instruments.

Build once and expose configuration.

### Feature-Flagged Feature

A feature should exist in the shared codebase but only be enabled for selected deployments.

Examples:

- Wompi payments.
- Alegra sync.
- Piano exams.
- Voice curriculum.
- Family weekly digest.

Use explicit flags such as:

- `FEATURE_EXAMS_ENABLED`
- `FEATURE_NATIVE_INVOICING_ENABLED`
- `FEATURE_WOMPI_ENABLED`
- `FEATURE_ALEGRA_ENABLED`
- `FEATURE_PIANO_EXAMS_ENABLED`

Keep flags simple, documented, and easy to remove once a feature becomes standard.

### Custom Or Private Feature

A feature requested by one academy that is not likely to benefit others.

Examples:

- A custom report format only one owner uses.
- A private billing export for a specific accountant workflow.
- A one-off naming convention that conflicts with the general product.

Build only when:

- The customer pays for the work or it has strategic value.
- It is isolated behind configuration or a feature flag.
- It does not weaken security, privacy, billing, or permissions.
- There is a clear plan for support and future maintenance.

### Not Now

A request that does not fit the product direction, creates too much risk, or should wait until the product is more mature.

Saying "not now" protects the app from becoming a collection of one-off exceptions.

## Customer Request Decision Checklist

Before accepting customer-specific work, answer:

- Does this help more than one academy?
- Can it be solved with configuration instead of code?
- Can it be controlled with a feature flag?
- Does it affect billing, payments, taxes, minors, privacy, permissions, or audit logs?
- Does it create long-term maintenance burden?
- Who pays for development, QA, deployment, and support?
- Can the implementation be tested without access to the customer production data?
- Will this make future multi-tenancy harder?

If the answers are unclear, document the request and defer it until the business value is clearer.

## Recommended Development Workflow

For shared features:

1. Write a product plan.
2. Decide whether it is core, configurable, or feature-flagged.
3. Implement in the shared codebase.
4. Add migrations and backward-compatible defaults when needed.
5. Test with at least the Harmonizing deployment and one customer-style configuration.
6. Release once to `main`.
7. Deploy the same commit to each academy.

For customer-specific features:

1. Confirm that configuration or a feature flag cannot solve it.
2. Write down the business reason and owner.
3. Put the feature behind a customer-specific flag or config value.
4. Keep data model changes general where possible.
5. Add tests for enabled and disabled states.
6. Document how to turn it on/off.

## Future True Multi-Tenancy

True multi-tenancy means one app and one shared database host many academies. This may become useful later, but it should not be the first commercialization step.

Future multi-tenant work would require:

- Add an `Academy` or `Organization` model.
- Add `academyId` to users, profiles, schedules, invoices, payments, credits, skills, repertoire, messages, media, consents, imports, announcements, and audit logs.
- Scope unique constraints by academy, such as user email, skill name, invoice number, invoice sequence, and catalog entries.
- Resolve the academy by custom domain, subdomain, or invite link.
- Enforce academy isolation in every page, API, cron job, webhook, media route, and admin query.
- Add super-admin tooling for academy management.
- Add tenant-aware backups, migrations, monitoring, and incident response.

This should be planned as a major architecture phase after white-label pilots validate the market.

## Recommended Roadmap

1. Document the white-label model and customer feature policy.
2. Create a centralized academy config layer.
3. Replace hardcoded Harmonizing branding in UI, emails, PDFs, filenames, metadata, and notifications.
4. Add customer deployment env examples and bootstrap runbook.
5. Add feature flags for optional modules.
6. Pilot one non-Harmonizing academy in an isolated deployment.
7. Decide whether true multi-tenancy is worth the migration.

## Current Recommendation

Use white-label deployments for the first customers in Colombia.

This keeps the business flexible, protects student data, avoids premature architecture complexity, and lets customer-specific requests be handled as product decisions rather than code forks.
