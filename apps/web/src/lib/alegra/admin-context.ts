import { db } from "@/lib/db";
import type { AlegraLookupContact } from "@/lib/alegra/client";

export type AlegraStudentContext = {
  studentId: string;
  userId: string;
  name: string;
  email: string;
  parentEmails: string[];
  teacherName: string | null;
  existingAlegraContactId: string | null;
  linkStrategy: string | null;
  lastResolvedAt: string | null;
  lastError: string | null;
  latestSyncStatus: string | null;
  latestSyncError: string | null;
  latestSyncAt: string | null;
};

export type AlegraLocalMatch = AlegraStudentContext & {
  matchReason: "manual_link" | "student_email" | "parent_email";
};

export async function getAlegraStudentContexts(): Promise<AlegraStudentContext[]> {
  const students = await db.studentProfile.findMany({
    include: {
      user: true,
      assignment: {
        include: { teacher: { include: { user: true } } },
      },
      parentLinks: {
        include: { parent: { include: { user: true } } },
        orderBy: [{ primaryContact: "desc" }, { createdAt: "asc" }],
      },
      invoiceContactLink: true,
      invoiceSyncRuns: {
        orderBy: { startedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  return students.sort((first, second) => first.user.name.localeCompare(second.user.name)).map((student) => {
    const latestRun = student.invoiceSyncRuns[0] ?? null;
    return {
      studentId: student.id,
      userId: student.userId,
      name: student.user.name,
      email: student.user.email,
      parentEmails: student.parentLinks.map((link) => link.parent.user.email),
      teacherName: student.assignment?.teacher.user.name ?? null,
      existingAlegraContactId: student.invoiceContactLink?.alegraContactId ?? null,
      linkStrategy: student.invoiceContactLink?.strategy ?? null,
      lastResolvedAt: student.invoiceContactLink?.lastResolvedAt?.toISOString() ?? null,
      lastError: student.invoiceContactLink?.lastError ?? null,
      latestSyncStatus: latestRun?.status ?? null,
      latestSyncError: latestRun?.errorSummary ?? null,
      latestSyncAt: latestRun?.startedAt.toISOString() ?? null,
    };
  });
}

export function matchContactToLocalStudents(contact: Pick<AlegraLookupContact, "id" | "emails">, contexts: AlegraStudentContext[]): AlegraLocalMatch[] {
  const contactEmails = new Set(contact.emails.map((email) => email.toLowerCase().trim()).filter(Boolean));
  const matches: AlegraLocalMatch[] = [];

  for (const context of contexts) {
    if (context.existingAlegraContactId && context.existingAlegraContactId === contact.id) {
      matches.push({ ...context, matchReason: "manual_link" });
      continue;
    }

    if (contactEmails.has(context.email.toLowerCase().trim())) {
      matches.push({ ...context, matchReason: "student_email" });
      continue;
    }

    if (context.parentEmails.some((email) => contactEmails.has(email.toLowerCase().trim()))) {
      matches.push({ ...context, matchReason: "parent_email" });
    }
  }

  return matches;
}

export function matchContactIdToLocalStudents(contactId: string | undefined, contexts: AlegraStudentContext[]): AlegraLocalMatch[] {
  if (!contactId) return [];
  return contexts
    .filter((context) => context.existingAlegraContactId === contactId)
    .map((context) => ({ ...context, matchReason: "manual_link" as const }));
}
