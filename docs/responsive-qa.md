# Responsive QA Checklist

Use this checklist after layout, navigation, or dense workflow changes. Harmonizing is expected to feel reliable on iPad first, while still being comfortable on iPhone and desktop.

## Target Viewports

- iPhone SE/small: `320 x 568`
- iPhone standard: `390 x 844`
- iPad portrait primary: `768 x 1024`
- iPad landscape secondary: `1024 x 768`
- Desktop smoke: `1280 x 900`

## Global Acceptance Criteria

- No horizontal page scrolling on authenticated pages.
- Mobile navigation opens above page content, respects iOS safe areas, and closes on overlay tap, Escape, and link tap.
- Tablet/desktop navigation uses the left sidebar at large widths without squeezing page content.
- Cards, page hero titles, badges, and long names wrap or truncate without pushing the viewport wider.
- Sticky action bars remain visible, tappable, and do not cover required form controls.
- Forms use stacked controls on phone widths and readable multi-column layouts on iPad/desktop.
- Tables or dense lists collapse into cards or readable rows before they overflow.

## Route Smoke Matrix

Run these routes in the target viewports after signing in with the matching demo account.

### Student

- `/student`
- `/dashboard`
- `/schedule`
- `/videos`
- `/progress`
- `/messages`
- `/invoices`
- `/notifications`
- `/settings`

Student-specific checks:

- Weekly schedule and reschedule day selectors wrap into grid rows instead of requiring sideways scrolling.
- Single-class request form remains readable at iPad portrait width.
- Progress cards show assignments, repertoire, and skill snapshots without clipping.
- Video upload controls fit within the card and keep upload status visible.

### Teacher

- `/teacher/dashboard`
- `/teacher/schedule`
- `/teacher/requests`
- `/teacher/videos`
- `/teacher/progress`
- `/messages`
- `/notifications`

Teacher-specific checks:

- Teacher student selector remains usable in the mobile header and tablet layout.
- After-class workflow stepper wraps into rows and sticky actions stack on phone widths.
- Skill rating and repertoire sections do not require horizontal scrolling.
- Schedule booking form and pending request cards stay readable on iPad portrait.

### Admin

- `/admin/dashboard`
- `/admin/schedule`
- `/admin/invoices`
- `/admin/teachers`
- `/admin/students`
- `/admin/assignments`
- `/admin/availability`
- `/admin/progress`
- `/admin/changelog`
- `/notifications`
- `/settings`

Admin-specific checks:

- Dashboard metric cards and action buttons wrap before they overflow.
- Admin schedule booking and request review panels stack cleanly at iPad portrait.
- Availability rows wrap their select/time controls without clipping.
- Invoices, students, teachers, and changelog cards remain readable without sideways page scroll.

## Manual Browser Steps

1. Start the app with `docker compose up --build`.
2. Open `http://localhost:3010/sign-in`.
3. Verify logged-out `/` redirects to `/sign-in`.
4. Sign in as each seeded role and run the route smoke matrix.
5. Toggle the mobile menu at `320`, `390`, and `768` widths.
6. At `768 x 1024`, complete one pass through the most complex page for each role:
   - Student: `/schedule`
   - Teacher: `/teacher/classes/[classId]/complete`
   - Admin: `/admin/schedule`
7. Confirm no browser console errors that are caused by responsive layout code.

## Automated Checks

Run from `apps/web`:

```bash
npm run typecheck
npm run lint
npm run build
```

After local boot, optionally run:

```bash
npm run smoke:routes
```

