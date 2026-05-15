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
