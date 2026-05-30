import "server-only";

import { addDays, subDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { EmailDeliveryStatus, NativeInvoiceStatus, Role, SessionStatus, UserLoginActivityStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { DEFAULT_IANA_TIMEZONE, isValidIanaTimezone, normalizeIanaTimezone } from "@/lib/iana-timezones";

export const adminHealthSeverities = ["critical", "warning", "review"] as const;
export const adminHealthCategories = ["students", "consent", "email", "schedule", "billing", "security"] as const;

export type AdminHealthSeverity = (typeof adminHealthSeverities)[number];
export type AdminHealthCategory = (typeof adminHealthCategories)[number];

export type AdminHealthIssue = {
  id: string;
  severity: AdminHealthSeverity;
  category: AdminHealthCategory;
  title: string;
  subject: string;
  description: string;
  href: string;
  meta?: string;
  occurredAt?: Date | null;
};

export type AdminHealthDashboardFilters = {
  severity?: AdminHealthSeverity;
  category?: AdminHealthCategory;
  limit?: number;
};

const severityRank: Record<AdminHealthSeverity, number> = {
  critical: 0,
  warning: 1,
  review: 2,
};

export async function getAdminHealthDashboardData(filters: AdminHealthDashboardFilters = {}) {
  const now = new Date();
  const limit = clampLimit(filters.limit);
  const queryLimit = Math.max(limit * 3, 90);
  const inactivityCutoff = subDays(now, 30);
  const emailCutoff = subDays(now, 30);
  const loginCutoff = subDays(now, 1);
  const blackoutHorizon = addDays(now, 90);

  const [studentsWithoutTeacher, activeConsentDocument, inactiveCandidates, emailIssues, blackoutCandidates, billingStudents, invoiceRisks, creditBalances, failedLoginAttempts, timezoneUsers] = await Promise.all([
    db.studentProfile.findMany({
      where: { assignment: { is: null } },
      include: { user: true },
      orderBy: { user: { name: "asc" } },
      take: queryLimit,
    }),
    db.consentDocument.findFirst({
      where: { active: true },
      orderBy: { effectiveAt: "desc" },
    }),
    db.studentProfile.findMany({
      where: { user: { createdAt: { lt: inactivityCutoff } } },
      include: {
        user: true,
        sessions: { where: { startsAtUtc: { gte: inactivityCutoff } }, take: 1 },
        lessonNotes: { where: { updatedAt: { gte: inactivityCutoff } }, take: 1 },
        practiceLogs: { where: { createdAt: { gte: inactivityCutoff } }, take: 1 },
        practiceVideos: { where: { submittedAt: { gte: inactivityCutoff } }, take: 1 },
        studentThreads: {
          include: { messages: { where: { createdAt: { gte: inactivityCutoff } }, take: 1 } },
          take: 5,
        },
      },
      orderBy: { user: { name: "asc" } },
      take: queryLimit,
    }),
    db.emailDeliveryLog.findMany({
      where: {
        status: { in: [EmailDeliveryStatus.FAILED, EmailDeliveryStatus.SKIPPED] },
        attemptedAt: { gte: emailCutoff },
      },
      include: { recipient: { select: { name: true, email: true } } },
      orderBy: { attemptedAt: "desc" },
      take: queryLimit,
    }),
    db.classSession.findMany({
      where: {
        status: SessionStatus.SCHEDULED,
        startsAtUtc: { gte: now, lte: blackoutHorizon },
      },
      include: {
        student: { include: { user: true } },
        teacher: {
          include: {
            user: true,
            blackoutDates: true,
          },
        },
      },
      orderBy: { startsAtUtc: "asc" },
      take: 500,
    }),
    db.studentProfile.findMany({
      include: {
        user: true,
        billingProfile: true,
        subscriptions: {
          where: {
            active: true,
            OR: [{ endsAt: null }, { endsAt: { gte: now } }],
          },
          orderBy: { startsAt: "desc" },
          take: 1,
        },
        parentLinks: {
          where: { primaryContact: true },
          include: { parent: { include: { user: true } } },
          take: 1,
        },
      },
      orderBy: { user: { name: "asc" } },
      take: queryLimit,
    }),
    db.nativeInvoice.findMany({
      where: {
        OR: [
          { status: NativeInvoiceStatus.OPEN, dueDate: { lt: now } },
          { emailStatus: EmailDeliveryStatus.FAILED },
        ],
      },
      include: { student: { include: { user: true } } },
      orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
      take: queryLimit,
    }),
    db.classCreditLedgerEntry.groupBy({
      by: ["studentId"],
      _sum: { delta: true },
    }),
    db.userLoginActivity.findMany({
      where: {
        status: UserLoginActivityStatus.FAILED,
        createdAt: { gte: loginCutoff },
      },
      include: { user: { select: { name: true, email: true, role: true } } },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    db.user.findMany({
      where: { role: { in: [Role.STUDENT, Role.TEACHER, Role.PARENT] } },
      select: { id: true, name: true, email: true, role: true, timezone: true, createdAt: true },
      orderBy: { name: "asc" },
      take: 250,
    }),
  ]);

  const missingConsentStudents = activeConsentDocument
    ? await db.studentProfile.findMany({
        where: { consentSignatures: { none: { documentId: activeConsentDocument.id } } },
        include: { user: true },
        orderBy: { user: { name: "asc" } },
        take: queryLimit,
      })
    : [];

  const negativeCreditRows = creditBalances.filter((row) => (row._sum.delta ?? 0) < 0);
  const negativeCreditStudents = negativeCreditRows.length
    ? await db.studentProfile.findMany({
        where: { id: { in: negativeCreditRows.map((row) => row.studentId) } },
        include: { user: true },
      })
    : [];
  const studentById = new Map(negativeCreditStudents.map((student) => [student.id, student]));

  const issues: AdminHealthIssue[] = [];

  if (!activeConsentDocument) {
    issues.push({
      id: "missing-active-consent-document",
      severity: "critical",
      category: "consent",
      title: "No active consent document",
      subject: "Consent setup",
      description: "No active consent document is configured, so consent completion cannot be verified.",
      href: "/admin/consents",
      occurredAt: now,
    });
  }

  for (const student of studentsWithoutTeacher) {
    issues.push({
      id: `missing-teacher:${student.id}`,
      severity: "critical",
      category: "students",
      title: "Missing teacher assignment",
      subject: student.user.name,
      description: "This student has no assigned teacher, so scheduling, progress, and communication workflows may stall.",
      href: "/admin/assignments",
      meta: student.user.email,
      occurredAt: student.joinedAt,
    });
  }

  for (const student of missingConsentStudents) {
    issues.push({
      id: `missing-consent:${student.id}:${activeConsentDocument?.id}`,
      severity: "critical",
      category: "consent",
      title: "Missing active consent",
      subject: student.user.name,
      description: activeConsentDocument
        ? `No signature is recorded for the active consent document (${activeConsentDocument.version}).`
        : "No active consent document is configured.",
      href: "/admin/consents",
      meta: student.user.email,
      occurredAt: activeConsentDocument?.effectiveAt ?? student.joinedAt,
    });
  }

  for (const student of inactiveCandidates) {
    const hasRecentActivity =
      student.sessions.length > 0 ||
      student.lessonNotes.length > 0 ||
      student.practiceLogs.length > 0 ||
      student.practiceVideos.length > 0 ||
      student.studentThreads.some((thread) => thread.messages.length > 0);

    if (!hasRecentActivity) {
      issues.push({
        id: `inactive-student:${student.id}`,
        severity: "warning",
        category: "students",
        title: "Student inactivity",
        subject: student.user.name,
        description: "No class, lesson note, practice log, video, or message activity was found in the last 30 days.",
        href: "/admin/students",
        meta: student.user.email,
        occurredAt: inactivityCutoff,
      });
    }
  }

  for (const log of emailIssues) {
    issues.push({
      id: `email:${log.id}`,
      severity: log.status === EmailDeliveryStatus.FAILED ? "critical" : "warning",
      category: "email",
      title: log.status === EmailDeliveryStatus.FAILED ? "Failed email delivery" : "Skipped email delivery",
      subject: log.recipient?.name ?? log.recipientEmail ?? "Unknown recipient",
      description: log.errorMessage ?? log.subject,
      href: `/admin/emails?status=${log.status}`,
      meta: `${log.type} · ${log.recipientEmail ?? log.recipient?.email ?? "No email"}`,
      occurredAt: log.attemptedAt,
    });
  }

  for (const session of blackoutCandidates) {
    const teacherTimezone = normalizeIanaTimezone(session.teacher.user.timezone);
    const localDate = formatInTimeZone(session.startsAtUtc, teacherTimezone, "yyyy-MM-dd");
    const blackout = session.teacher.blackoutDates.find((date) => date.localDate === localDate);
    if (!blackout) continue;

    issues.push({
      id: `blackout-conflict:${session.id}:${blackout.id}`,
      severity: "critical",
      category: "schedule",
      title: "Scheduled class on blackout date",
      subject: `${session.student.user.name} with ${session.teacher.user.name}`,
      description: "A future scheduled class falls on a teacher blackout date. Existing classes are not automatically cancelled.",
      href: "/admin/schedule",
      meta: `${localDate} · ${teacherTimezone}${blackout.note ? ` · ${blackout.note}` : ""}`,
      occurredAt: session.startsAtUtc,
    });
  }

  for (const student of billingStudents) {
    if (!student.billingProfile) {
      issues.push({
        id: `missing-billing-profile:${student.id}`,
        severity: "warning",
        category: "billing",
        title: "Missing billing profile",
        subject: student.user.name,
        description: "Native invoice defaults are missing, so monthly draft generation may need manual values.",
        href: "/admin/invoices",
        meta: student.user.email,
        occurredAt: student.joinedAt,
      });
    }

    if (!student.subscriptions[0]) {
      issues.push({
        id: `missing-class-allowance:${student.id}`,
        severity: "warning",
        category: "billing",
        title: "Missing active class allowance",
        subject: student.user.name,
        description: "No active internal class allowance/subscription is recorded for this student.",
        href: "/admin/students",
        meta: student.user.email,
        occurredAt: student.joinedAt,
      });
    }

    if (!student.parentLinks[0]) {
      issues.push({
        id: `missing-primary-parent:${student.id}`,
        severity: "review",
        category: "billing",
        title: "Missing primary parent/guardian",
        subject: student.user.name,
        description: "Invoices are parent-facing when a primary parent is linked. Confirm whether this student needs a guardian billing contact.",
        href: "/admin/guardians",
        meta: student.user.email,
        occurredAt: student.joinedAt,
      });
    }
  }

  for (const invoice of invoiceRisks) {
    const isOverdue = invoice.status === NativeInvoiceStatus.OPEN && invoice.dueDate < now;
    issues.push({
      id: `invoice:${invoice.id}:${isOverdue ? "overdue" : "email"}`,
      severity: isOverdue ? "warning" : "critical",
      category: "billing",
      title: isOverdue ? "Open invoice is overdue" : "Invoice email failed",
      subject: `${invoice.invoiceNumber} · ${invoice.student.user.name}`,
      description: isOverdue
        ? "This invoice is open and past its due date."
        : invoice.emailError ?? "The invoice email delivery failed and may need to be resent manually.",
      href: "/admin/invoices",
      meta: `${invoice.recipientName} · ${invoice.recipientEmail}`,
      occurredAt: isOverdue ? invoice.dueDate : invoice.updatedAt,
    });
  }

  for (const row of negativeCreditRows) {
    const student = studentById.get(row.studentId);
    if (!student) continue;
    const balance = row._sum.delta ?? 0;
    issues.push({
      id: `negative-credit:${row.studentId}`,
      severity: "warning",
      category: "billing",
      title: "Negative class-credit balance",
      subject: student.user.name,
      description: "This student has consumed more class credits than have been granted. Review invoices, credits, or manual adjustments.",
      href: "/admin/invoices",
      meta: `${balance} credits`,
      occurredAt: now,
    });
  }

  for (const issue of failedLoginSpikeIssues(failedLoginAttempts)) {
    issues.push(issue);
  }

  for (const user of timezoneUsers) {
    const invalid = !isValidIanaTimezone(user.timezone);
    const usingFallback = user.timezone === DEFAULT_IANA_TIMEZONE;
    if (!invalid && !usingFallback) continue;

    issues.push({
      id: `timezone:${user.id}`,
      severity: "review",
      category: "students",
      title: invalid ? "Invalid timezone" : "Timezone uses app fallback",
      subject: user.name,
      description: invalid
        ? "This user has an invalid saved timezone. Scheduling displays may fall back to the default timezone."
        : "This user is still using the default scheduling timezone. Confirm it is intentional before regular scheduling begins.",
      href: user.role === Role.TEACHER ? "/admin/teachers" : user.role === Role.PARENT ? "/admin/guardians" : "/admin/students",
      meta: `${user.email} · ${user.role} · ${user.timezone}`,
      occurredAt: user.createdAt,
    });
  }

  const filteredIssues = issues
    .filter((issue) => !filters.severity || issue.severity === filters.severity)
    .filter((issue) => !filters.category || issue.category === filters.category)
    .sort(compareIssues);
  const visibleIssues = filteredIssues.slice(0, limit);
  const counts = summarizeIssues(visibleIssues);

  return {
    generatedAt: now,
    filters: {
      severity: filters.severity,
      category: filters.category,
      limit,
    },
    issues: visibleIssues,
    totalMatchingIssues: filteredIssues.length,
    counts,
    thresholds: {
      inactivityDays: 30,
      emailLookbackDays: 30,
      failedLoginLookbackHours: 24,
      blackoutLookaheadDays: 90,
      failedLoginSpikeThreshold: 5,
    },
  };
}

function failedLoginSpikeIssues(attempts: Awaited<ReturnType<typeof db.userLoginActivity.findMany>>) {
  const emailGroups = new Map<string, typeof attempts>();
  const ipGroups = new Map<string, typeof attempts>();

  for (const attempt of attempts) {
    const email = attempt.emailAttempted.trim().toLowerCase();
    if (email) emailGroups.set(email, [...(emailGroups.get(email) ?? []), attempt]);
    if (attempt.ipAddress) ipGroups.set(attempt.ipAddress, [...(ipGroups.get(attempt.ipAddress) ?? []), attempt]);
  }

  const issues: AdminHealthIssue[] = [];
  for (const [email, rows] of emailGroups) {
    if (rows.length < 5) continue;
    issues.push({
      id: `failed-login-email:${email}`,
      severity: "critical",
      category: "security",
      title: "Repeated failed logins by email",
      subject: email,
      description: `${rows.length} failed sign-in attempts were recorded for this email in the last 24 hours.`,
      href: `/admin/access?status=${UserLoginActivityStatus.FAILED}&q=${encodeURIComponent(email)}`,
      meta: rows[0]?.failureReason ?? rows[0]?.authMethod ?? undefined,
      occurredAt: rows[0]?.createdAt ?? null,
    });
  }

  for (const [ipAddress, rows] of ipGroups) {
    if (rows.length < 5) continue;
    issues.push({
      id: `failed-login-ip:${ipAddress}`,
      severity: "warning",
      category: "security",
      title: "Repeated failed logins by IP",
      subject: ipAddress,
      description: `${rows.length} failed sign-in attempts came from this IP address in the last 24 hours.`,
      href: `/admin/access?status=${UserLoginActivityStatus.FAILED}&q=${encodeURIComponent(ipAddress)}`,
      meta: rows[0]?.countryCode ?? "Unknown country",
      occurredAt: rows[0]?.createdAt ?? null,
    });
  }

  return issues;
}

function compareIssues(a: AdminHealthIssue, b: AdminHealthIssue) {
  const severity = severityRank[a.severity] - severityRank[b.severity];
  if (severity !== 0) return severity;
  return (b.occurredAt?.getTime() ?? 0) - (a.occurredAt?.getTime() ?? 0);
}

function summarizeIssues(issues: AdminHealthIssue[]) {
  return {
    critical: issues.filter((issue) => issue.severity === "critical").length,
    warning: issues.filter((issue) => issue.severity === "warning").length,
    review: issues.filter((issue) => issue.severity === "review").length,
    total: issues.length,
  };
}

function clampLimit(value: number | undefined) {
  if (!value || Number.isNaN(value)) return 80;
  return Math.min(Math.max(Math.floor(value), 10), 200);
}
