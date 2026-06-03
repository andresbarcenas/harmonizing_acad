export type ChangelogSection = {
  title: string;
  items: string[];
};

export type ChangelogEntry = {
  version: string;
  date: string;
  sections: ChangelogSection[];
};

export const changelogEntries: ChangelogEntry[] = [
  {
    version: "0.10.12",
    date: "2026-06-03",
    sections: [
      {
        title: "Added",
        items: [
          "Teacher Lesson notes now has its own /teacher/lesson-notes menu item and workflow with assigned-student cards, selected-student context, lesson-note editing, and practice assignment creation.",
        ],
      },
      {
        title: "Changed",
        items: [
          "Teacher Progress now focuses on progress overview, repertoire, practice, exam assessments, and reports, with a quick link into the dedicated Lesson notes workspace.",
          "Completing or updating a class now returns teachers to the Lesson notes workflow for the selected student.",
        ],
      },
    ],
  },
  {
    version: "0.10.11",
    date: "2026-06-02",
    sections: [
      {
        title: "Changed",
        items: [
          "Complete-class skill ratings now use 0-5 sliders with localized Not rated states, keeping unrated skills out of submissions while preserving notes and quick rating shortcuts.",
        ],
      },
    ],
  },
  {
    version: "0.10.10",
    date: "2026-06-02",
    sections: [
      {
        title: "Added",
        items: [
          "Animated class-in-progress tracking for teacher-started classes, including teacher start controls, join-class start marking, live progress cards, compact schedule/dashboard indicators, and protected teacher start API support.",
          "Admin skill management at /admin/skills, including create/edit/deactivate/reorder controls, default-skill synchronization, and a production-safe skills:sync script.",
          "Reusable protected catalog sheet attachments for repertoire catalog songs, with authenticated upload, delete, and download routes.",
        ],
      },
      {
        title: "Changed",
        items: [
          "Repertoire catalog and student repertoire no longer use the obsolete song Level field; catalog search, assignment, seed/demo data, class completion, and exam selection now omit song level.",
          "Student, parent, and teacher repertoire surfaces now show shared catalog sheets alongside student-specific sheet attachments.",
          "Complete-class repertoire status dropdowns now use localized labels, and repertoire mastery updates now use 0-100% sliders instead of manual number inputs.",
        ],
      },
    ],
  },
  {
    version: "0.10.9",
    date: "2026-06-02",
    sections: [
      {
        title: "Added",
        items: [
          "Teacher Progress now has dedicated Exam assessments and Progress reports navigation entries and pages for easier access to exam and report workflows.",
        ],
      },
      {
        title: "Changed",
        items: [
          "Teacher lesson notes now use a full-width editor with slider ratings for quick ratings and observed skills, preventing observed skill rows from overflowing into adjacent panels.",
          "Teacher Progress no longer shows the recurring class setup card; recurring setup remains available from teacher dashboard and schedule.",
        ],
      },
    ],
  },
  {
    version: "0.10.8",
    date: "2026-06-02",
    sections: [
      {
        title: "Fixed",
        items: [
          "Admin teacher impersonation now supports assigning catalog songs and selecting the student's full assigned repertoire inside Piano exam assessments.",
          "Piano exam PDFs now use safer header columns so the report title no longer overlaps the date, student, and teacher metadata.",
          "Piano exam PDF table headers now use balanced columns and dynamic header heights so long Spanish labels like Interpretación remain readable.",
        ],
      },
    ],
  },
  {
    version: "0.10.7",
    date: "2026-06-01",
    sections: [
      {
        title: "Changed",
        items: [
          "Piano exam scoring now uses half-point sliders for repertoire, Harmony, and Music Reading scores instead of manual number inputs.",
          "Piano exam PDFs now use a more polished Spanish report layout with branded headers, summary score cards, refined section tables, score pills, cleaner comments wrapping, and footer pagination.",
        ],
      },
    ],
  },
  {
    version: "0.10.6",
    date: "2026-06-01",
    sections: [
      {
        title: "Added",
        items: [
          "App-wide dark mode with light, dark, and system theme preferences across auth pages, the authenticated shell, shared UI, dashboards, schedules, forms, messages, notifications, and billing surfaces.",
          "Piano exam assessments for teacher/admin progress workflows and Piano evaluation classes, including repertoire scoring, Harmony rows, Music Reading rows, historical exam entry, and repertoire mastery updates.",
          "Student and parent Repertoire and Exams sections with published Piano exam results, protected exam PDF downloads, and family-visible learning cards.",
          "Teacher quick-cancel support for reschedule-pending classes, including request closure, notifications, and class-credit synchronization.",
        ],
      },
      {
        title: "Changed",
        items: [
          "Teachers can manually add one-time classes outside their weekly availability while blackout dates, conflicts, and all student/parent scheduling protections remain enforced.",
          "Family-facing schedule and learning surfaces now link into the new repertoire and published exam experiences.",
          "Shared visual surfaces, inputs, buttons, badges, calendars, and shell chrome now use theme-aware tokens.",
        ],
      },
    ],
  },
  {
    version: "0.10.5",
    date: "2026-05-30",
    sections: [
      {
        title: "Added",
        items: [
          "Admin Health Dashboard at /admin/health with read-only operational risk checks for teacher assignments, active consent, student inactivity, email delivery, blackout conflicts, billing setup, overdue invoices, negative class-credit balances, failed-login spikes, and timezone review.",
          "Admin CSV student provisioning import from /admin/imports, including preview/apply validation, teacher assignment, parent/guardian linking, native billing profile setup, optional Alegra contact linking, and import batch audit records.",
          "Consolidated pending roadmap document for the main product, billing, scheduling, production hardening, and security backlog.",
        ],
      },
      {
        title: "Changed",
        items: [
          "Student provisioning now supports 2, 4, and 8 monthly class allowances while continuing to suppress all welcome emails and magic links during CSV imports.",
          "Roadmap docs now mark Admin Health Dashboard, Parent Guardian Portal, Payment Tracking Ledger, and Class Credit Ledger as completed where applicable.",
        ],
      },
    ],
  },
  {
    version: "0.10.4",
    date: "2026-05-29",
    sections: [
      {
        title: "Added",
        items: [
          "Teachers can now directly choose the final new date and time for their own reschedule-pending classes from teacher schedule rows and class detail.",
          "Added a teacher reschedule form with student/teacher timezone anchoring, original-time context, duration control, and an optional visible response.",
        ],
      },
      {
        title: "Changed",
        items: [
          "Direct teacher rescheduling validates future time, duration, teacher availability, blackout dates, and teacher/student conflicts before returning the class to scheduled.",
          "Pending student or parent reschedule requests for the class are closed as accepted with an audit-friendly confirmed-time note, and the student/requesting parent are notified.",
        ],
      },
    ],
  },
  {
    version: "0.10.3",
    date: "2026-05-29",
    sections: [
      {
        title: "Fixed",
        items: [
          "Admin teacher impersonation no longer loops in production when redirecting to teacher pages; middleware now lets audited admin impersonation sessions reach teacher routes so server-side impersonation validation can resolve the effective teacher.",
        ],
      },
    ],
  },
  {
    version: "0.10.2",
    date: "2026-05-29",
    sections: [
      {
        title: "Added",
        items: [
          "Admin-only teacher impersonation for production troubleshooting, with audited start/stop/expiry sessions, reason capture, IP/user-agent metadata, and a secure short-lived cookie.",
          "Impersonation controls on admin teacher and access surfaces plus recent impersonation history in Access.",
          "Persistent high-contrast impersonation banner with original admin context, teacher context, expiry time, and a safe exit action.",
        ],
      },
      {
        title: "Changed",
        items: [
          "Teacher routes and APIs can now resolve an active admin impersonation session as the effective teacher while preserving the real admin session for stop/current controls.",
          "Sensitive account settings are blocked while impersonating, including password, profile image, language, and timezone changes.",
          "Family dashboard plan copy now emphasizes Harmonizing monthly class allowance instead of Alegra invoice totals.",
        ],
      },
      {
        title: "Fixed",
        items: [
          "Native invoice PDF downloads now regenerate stale PDFs after status changes so open, paid, and void invoices show the current status instead of an older draft label.",
        ],
      },
    ],
  },
  {
    version: "0.10.1",
    date: "2026-05-29",
    sections: [
      {
        title: "Added",
        items: [
          "Searchable IANA timezone selector for scheduling timezone preferences and admin timezone fields, with browser-supported timezone lists and fallback options.",
          "Admin recurring-series management on the admin schedule page, including series details, active/stopped state, upcoming class counts, and stop/delete actions.",
        ],
      },
      {
        title: "Changed",
        items: [
          "Browser timezone detection is now only a visible suggestion; saved scheduling timezones are changed only through explicit user/admin selection.",
          "Custom timezone scheduling now uses the same searchable timezone picker instead of a free-text field.",
          "Recurring-series stop/delete actions now support admins for any series while keeping teachers limited to their own series.",
        ],
      },
    ],
  },
  {
    version: "0.10.0",
    date: "2026-05-28",
    sections: [
      {
        title: "Added",
        items: [
          "Native Harmonizing invoicing with admin invoice creation, monthly drafts, next-month generation, branded PDF downloads, open/send workflow, email logging, and in-app invoice notifications.",
          "Student billing profiles with configurable class allowance and COP price-per-class defaults for native invoice generation.",
          "Payment tracking ledger with manual payments, partial balances, paid/open recalculation, voiding, and protected receipt attachments.",
          "Class credit ledger that grants credits from opened invoices, consumes billable completed/no-show classes, supports reversals, and allows admin manual adjustments.",
          "Admin account creation from Access with temporary passwords while keeping admin accounts password-only.",
          "Login activity audit trail for successful and failed credentials/magic-link sign-ins with device, browser, IP, and country metadata.",
          "Collapsible admin desktop sidebar with a persisted icon rail preference per browser.",
        ],
      },
      {
        title: "Changed",
        items: [
          "Student and parent invoice pages now prioritize native Harmonizing invoices, payment history, balances, credit summaries, and protected invoice/receipt downloads.",
          "Class completion and session update flows now update class credits idempotently for billable class outcomes.",
          "Admin invoice workspace now focuses on native billing while keeping Alegra as a secondary external reference.",
          "Development and deployment docs now include native invoicing, payment and credit ledger, login activity retention, and billing security roadmap updates.",
        ],
      },
    ],
  },
  {
    version: "0.9.0",
    date: "2026-05-28",
    sections: [
      {
        title: "Added",
        items: [
          "Parent and guardian accounts with parent portal access for linked student schedule, progress, videos, invoices, messages, consent, and settings flows.",
          "Admin guardian management, parent welcome/access support, and parent password reset coverage from the admin access center.",
          "Parent-aware consent, protected media, invoice, messaging, notification, and student-data permission checks.",
          "Alegra admin explorer for live contact, invoice, and payment lookup with local student/family matching context.",
          "Manual Alegra contact linking per student plus invoice sync shortcuts from the Alegra explorer.",
        ],
      },
      {
        title: "Changed",
        items: [
          "Invoice sync now supports linked parent emails while preserving per-student manual Alegra contact links.",
          "Local Docker and development database workflows now use Prisma migrations by default, with db:push reserved for disposable schema experiments.",
          "Development docs and environment examples were updated for parent access, Alegra lookup, and safer migration behavior.",
        ],
      },
    ],
  },
  {
    version: "0.8.0",
    date: "2026-05-27",
    sections: [
      {
        title: "Added",
        items: [
          "Admin-managed app announcements for message-of-the-day, feature updates, billing notices, and maintenance messages.",
          "Role-targeted, bilingual, dismissible announcement banners in the app shell with optional CTA links and publish windows.",
          "Prisma-backed announcement and per-user dismissal tracking.",
        ],
      },
      {
        title: "Changed",
        items: [
          "Invoice pages now show production-safe invoice-not-configured messaging when Alegra is unavailable instead of cached/sample demo invoice rows.",
          "Invoice sync APIs now reject sync attempts while invoice integration is not configured.",
          "Production-facing docs now describe pilot-safe invoice behavior and real workflow-created notifications.",
        ],
      },
      {
        title: "Removed",
        items: [
          "The Simulate reminders button and notification simulation endpoint from the notifications center.",
          "User-facing demo-mode invoice messaging from student and admin invoice surfaces.",
        ],
      },
    ],
  },
  {
    version: "0.7.9",
    date: "2026-05-27",
    sections: [
      {
        title: "Added",
        items: [
          "Admins and teachers can update a student's current level from the existing student and progress workflows while preserving progress history.",
        ],
      },
      {
        title: "Changed",
        items: [
          "Student dashboard level metrics now show localized level labels instead of raw enum values.",
          "Billing chrome no longer shows the demo-mode pill and now uses simpler invoice-not-configured copy when invoice integration is unavailable.",
        ],
      },
      {
        title: "Fixed",
        items: [
          "Signed consent PDF attachments now use margin-safe text layout so bilingual consent text and audit hashes wrap within the page.",
        ],
      },
    ],
  },
  {
    version: "0.7.8",
    date: "2026-05-19",
    sections: [
      {
        title: "Changed",
        items: [
          "Refreshed the shared visual system with Leonardo's input, moving the portal toward a warmer premium musical/editorial experience.",
          "Reduced page hero height and tightened dashboard rhythm so metrics, next-class context, and schedule previews appear sooner.",
          "Refined cards, buttons, badges, metric cards, loading states, and app surfaces with softer cream layers, luxury amber accents, and gentler shadows.",
          "Updated sidebar active states with a subtle rail, warm glow, gradient surface, and elevated icon chip.",
          "Improved the weekly calendar and grouped class lists with warmer day cells, availability heat indicators, stronger time hierarchy, calmer badges, and polished interactive states.",
        ],
      },
    ],
  },
  {
    version: "0.7.7",
    date: "2026-05-18",
    sections: [
      {
        title: "Added",
        items: [
          "Student schedule now includes a grouped Upcoming and recent classes list for past and upcoming lessons.",
          "Shared grouped class list component with day headers, color accents, prominent time chips, status/type badges, materials counts, and detail links.",
        ],
      },
      {
        title: "Changed",
        items: [
          "Teacher and admin schedule class lists now group classes by day and make class times easier to scan on iPad/mobile widths.",
        ],
      },
    ],
  },
  {
    version: "0.7.6",
    date: "2026-05-18",
    sections: [
      {
        title: "Added",
        items: [
          "Protected class-level materials for completed classes with multi-file teacher uploads and authenticated download routes.",
          "Teacher self-service availability management and teacher/admin blackout dates for full unavailable days.",
          "Class material counts in schedule views and class detail lists for students, teachers, and admins.",
        ],
      },
      {
        title: "Changed",
        items: [
          "After-class lesson notes now use General Comments, clearer field labels, and 1-5 sliders for quick lesson ratings.",
          "Local Docker development now defaults to the Next.js dev server for hot reload without rebuilding the web image.",
          "Repertoire/song management forms were simplified by removing unnecessary active, focus, and tempo defaults.",
        ],
      },
    ],
  },
  {
    version: "0.7.5",
    date: "2026-05-15",
    sections: [
      {
        title: "Fixed",
        items: [
          "Profile photos, practice videos, and repertoire/sheet attachments now all use private-store compatible Blob writes.",
          "Profile image uploads now use private Vercel Blob access and authenticated avatar routes when production is connected to a private Blob store.",
          "Vercel Blob storage now standardizes on the native BLOB_READ_WRITE_TOKEN pointing to the private harmonizing Blob store.",
        ],
      },
    ],
  },
  {
    version: "0.7.4",
    date: "2026-05-15",
    sections: [
      {
        title: "Added",
        items: [
          "Authenticated protected media routes for practice videos and repertoire/sheet attachments.",
          "Private Vercel Blob support for new practice video and repertoire attachment uploads.",
          "Protected media migration script with dry-run, apply, and production safety flags.",
          "Shared scheduling timezone selector used by both one-time and recurring class forms.",
        ],
      },
      {
        title: "Changed",
        items: [
          "Student and teacher video players now load media through permission-checked app routes instead of direct public storage URLs.",
          "Repertoire sheet links now resolve through authenticated media routes with admin, teacher, and student access control.",
          "One-time and recurring class timezone selectors now use the same display, labels, and student/teacher timezone definition.",
        ],
      },
    ],
  },
  {
    version: "0.7.3",
    date: "2026-05-14",
    sections: [
      {
        title: "Added",
        items: [
          "Dev-only monthly report demo fixture script for teacher-facing draft and published report mock data.",
          "Admin student onboarding controls for 4-class or 8-class manual billing plans with custom USD amounts.",
          "Admin student edit controls for changing active plans immediately while preserving prior subscription history.",
        ],
      },
      {
        title: "Changed",
        items: [
          "Student plan labels now show the recorded billing amount and monthly class allowance instead of fixed plan copy.",
        ],
      },
    ],
  },
  {
    version: "0.7.2",
    date: "2026-05-14",
    sections: [
      {
        title: "Changed",
        items: [
          "Removed the high-frequency class reminder Vercel Cron schedule so Hobby production deployments can complete.",
          "Kept the Resend class reminder endpoint available for manual testing and future scheduled infrastructure.",
        ],
      },
    ],
  },
  {
    version: "0.7.1",
    date: "2026-05-13",
    sections: [
      {
        title: "Added",
        items: [
          "Student-anchored recurring timezone mode so new recurring classes keep the student's local time stable across U.S. daylight saving changes.",
          "Recurring timezone mode selector for student time, teacher time, and admin-only custom timezone anchoring.",
          "Schedule and class detail surfaces now show both student and teacher local times for cross-country scheduling clarity.",
        ],
      },
      {
        title: "Changed",
        items: [
          "Existing recurring series remain teacher-time anchored during migration so already-booked UTC class times do not shift.",
          "Recurring class creation now checks teacher availability in the teacher's timezone for every generated occurrence.",
        ],
      },
    ],
  },
  {
    version: "0.7.0",
    date: "2026-05-12",
    sections: [
      {
        title: "Added",
        items: [
          "Historical PDF import staging and generic student import commands for onboarding legacy academy progress records.",
          "Resend-backed class email reminder endpoint with idempotent delivery tracking.",
          "Repertoire song sheet attachments for PDF/image sheet music with student-visible progress links.",
          "Recurring-class setup from teacher schedule, selected-student teacher progress, and admin schedule.",
        ],
      },
      {
        title: "Changed",
        items: [
          "After-class skill ratings now show piano/general or singing/general skills based on the lesson type.",
          "Teacher selected-student progress workspace now behaves better on iPad and mobile widths.",
        ],
      },
    ],
  },
  {
    version: "0.6.1",
    date: "2026-05-12",
    sections: [
      {
        title: "Fixed",
        items: [
          "Stabilized the mobile navigation drawer on iPhone by rendering it through a body-level portal above all page content.",
          "Improved drawer viewport sizing, safe-area padding, and compact header behavior for iOS Safari.",
          "Removed avoidable horizontal scrolling from the student weekly calendar, reschedule selector, and after-class workflow stepper.",
          "Added shared overflow guardrails for cards and page hero text so long labels behave better on iPad.",
        ],
      },
      {
        title: "Added",
        items: [
          "Responsive QA checklist covering iPhone, iPad portrait, iPad landscape, and desktop smoke targets.",
        ],
      },
    ],
  },
  {
    version: "0.6.0",
    date: "2026-05-08",
    sections: [
      {
        title: "Added",
        items: [
          "Single-class scheduling management for admin, teacher, and student workflows, including class type/status visibility across schedule surfaces.",
          "Student-requested one-off class flow with pending, accepted, and rejected states plus student-visible rejection reasons.",
          "Seed coverage for trial, makeup, extra, pending, accepted, and rejected single-class scheduling scenarios.",
          "Scheduling documentation covering recurring versus single classes, request workflow, conflict detection, timezone rules, and manual validation.",
        ],
      },
      {
        title: "Changed",
        items: [
          "Standalone class sessions now default to SINGLE, while recurring session creation continues to set RECURRING explicitly.",
          "Student class requests are limited to makeup, extra, and evaluation sessions; admin/teacher booking retains broader one-off class types.",
          "Request review now separates student-visible rejection reasons from optional internal notes.",
        ],
      },
    ],
  },
  {
    version: "0.5.0",
    date: "2026-05-08",
    sections: [
      {
        title: "Added",
        items: [
          "Student/parent progress portal on /progress with next class, latest lesson summary, active assignments, practice minutes, video requests, repertoire, skill snapshots, recent teacher feedback, and latest progress report.",
          "Assignment completion notes with persisted studentCompletionNote and studentCompletedAt fields.",
          "Video request deep links from required-video assignments into /videos with assignment, repertoire, and skill preselection when available.",
          "Manual student progress portal test plan covering lesson visibility, assignment status updates, practice logging, repertoire, video links, and private-note protection.",
        ],
      },
      {
        title: "Changed",
        items: [
          "Student progress data access now returns richer Prisma-backed progress context, including week practice totals, pending video requests, related feedback, and upcoming class data.",
          "Practice assignment status updates can now include a student/parent completion note while preserving teacher-only review notes.",
        ],
      },
    ],
  },
  {
    version: "0.4.0",
    date: "2026-05-08",
    sections: [
      {
        title: "Added",
        items: [
          "English/Spanish account language support as a release baseline, including localized admin forms, teacher scheduling controls, notifications, uploads, and shared action copy.",
          "Lightweight npm run smoke:routes route check for public, student, teacher, admin, settings, and notification surfaces after local boot.",
          "Auth-first root behavior so / sends logged-out users to /sign-in and authenticated users to their role workspace.",
        ],
      },
      {
        title: "Changed",
        items: [
          "English is now the default interface language for unauthenticated and newly created users while Spanish remains available per account.",
          "Student schedule visibility now supports selected-week navigation so future recurring classes are discoverable.",
          "Release docs now distinguish MVP-complete flows from production-hardening items such as signed media URLs, realtime messaging, rate limiting, and observability.",
        ],
      },
    ],
  },
  {
    version: "0.3.0",
    date: "2026-04-24",
    sections: [
      {
        title: "Added",
        items: [
          "Secure role entry routes (/student, /teacher, /admin) with server-side redirects to role workspaces.",
          "Centralized server-side data access layer under apps/web/src/lib/data/* for admin, teacher, student, and messaging views.",
          "Configurable video storage layer (STORAGE_PROVIDER=s3|local) with local filesystem fallback and shared media URL resolver.",
          "Real practice upload UX improvements: drag-and-drop, file validation, upload progress, and auto-refresh after submit.",
        ],
      },
      {
        title: "Changed",
        items: [
          "Auth hardening with Prisma-backed credential checks, bcrypt validation safeguards, and Spanish-safe login/API error messaging.",
          "Demo seed credentials updated to @harmonizing.com accounts with hashed password demo123 for local development.",
          "Role dashboards/pages now consume the new server data layer instead of direct page-level query wiring.",
          "Teacher video review flow now supports all/pending/reviewed filtering and persists reviewed status plus feedback loop for students.",
        ],
      },
    ],
  },
  {
    version: "0.2.0",
    date: "2026-04-24",
    sections: [
      {
        title: "Added",
        items: [
          "New premium auth experience based on the provided visual reference, including refreshed /sign-in composition and a polished /forgot-password support route.",
          "Shared PageIntro section component for consistent premium hero treatment across student, teacher, admin, settings, and notifications views.",
          "Refined tokenized design language (ivory canvas, amber accent, soft-glass cards, stronger spacing rhythm) applied across app surfaces.",
        ],
      },
      {
        title: "Changed",
        items: [
          "Unified core UI primitives (card, button, input, textarea, badge, avatar, shell navigation, logo) to the new premium style system.",
          "Updated authenticated and public pages to align with the refreshed visual identity while preserving existing RBAC and business logic.",
          "Local Docker entrypoint now runs development server after Prisma setup for stable local iteration (docker compose up --build plus live route debugging).",
        ],
      },
    ],
  },
  {
    version: "0.1.0",
    date: "2026-03-31",
    sections: [
      {
        title: "Added",
        items: [
          "Foundation architecture and premium design system with role-aware layout.",
          "Student dashboard experience, including plan, progress, assigned teacher, and WhatsApp plan management CTA.",
          "Scheduling and rescheduling workflow with pending approval state.",
          "Weekly practice video workflow for student uploads and teacher feedback.",
          "Messaging and in-app notifications between assigned student and teacher.",
          "Teacher and admin operational dashboards.",
          "Docker-first local development stack (web, postgres, minio, mailhog) with seed data.",
        ],
      },
    ],
  },
  {
    version: "0.0.1",
    date: "2026-04-03",
    sections: [
      {
        title: "Added",
        items: [
          "Profile photo upload/update flow for students and teachers via MinIO-backed image uploads in Settings.",
          "Persistent top-right Cerrar sesión action in the shared app shell.",
          "App-wide version footer badge (v0.0.1) on authenticated and public entry surfaces.",
          "Teacher recurrent class scheduler with weekly recurrence, conflict detection, and student notifications.",
          "Admin edit workflows for both students and teachers, including profile updates and assignment-aware student editing.",
        ],
      },
      {
        title: "Changed",
        items: [
          "Student and teacher onboarding now accept an optional profile image URL at creation time.",
          "Admin recent lists now show avatars and inline edit controls for faster operations.",
        ],
      },
    ],
  },
];
