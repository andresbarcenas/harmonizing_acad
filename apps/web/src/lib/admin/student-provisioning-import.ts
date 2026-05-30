import "server-only";

import { InvoiceContactLinkStrategy, Prisma, Role, StudentProvisioningImportBatchStatus, StudentProvisioningImportRowStatus } from "@prisma/client";

import { INTERNAL_CLASS_ALLOWANCE_PRICE_USD, manualPlanDescription, manualPlanId, manualPlanName, type ManualMonthlyClassCount } from "@/lib/billing/manual-plans";
import { db } from "@/lib/db";
import { normalizeInstrument, type SupportedInstrument } from "@/lib/instruments";

const DEFAULT_IMPORTED_TIMEZONE = "America/New_York";
const MAX_CSV_BYTES = 1_000_000;
const MAX_ROWS = 500;

const REQUIRED_HEADERS = [
  "student_name",
  "student_email",
  "teacher_email",
  "student_instrument",
  "monthly_session_count",
  "price_per_class_cop",
] as const;

const OPTIONAL_HEADERS = [
  "student_phone",
  "parent1_name",
  "parent1_email",
  "parent1_relationship",
  "parent1_phone",
  "parent2_name",
  "parent2_email",
  "parent2_relationship",
  "parent2_phone",
  "alegra_contact_id",
  "notes",
] as const;

export const STUDENT_PROVISIONING_HEADERS = [...REQUIRED_HEADERS, ...OPTIONAL_HEADERS] as const;

type CsvRecord = {
  rowNumber: number;
  values: Record<string, string>;
};

type NormalizedGuardian = {
  name: string;
  email: string;
  relationship: string;
  phone: string | null;
  primaryContact: boolean;
};

export type StudentProvisioningNormalizedRow = {
  studentName: string;
  studentEmail: string;
  teacherEmail: string;
  studentInstrument: SupportedInstrument;
  monthlySessionCount: ManualMonthlyClassCount;
  pricePerClassCop: number;
  studentPhone: string | null;
  guardians: NormalizedGuardian[];
  alegraContactId: string | null;
  notes: string | null;
  defaultTimezone: string;
};

export type StudentProvisioningPreviewRow = {
  rowNumber: number;
  status: "valid" | "error";
  errors: string[];
  warnings: string[];
  matchedTeacherName: string | null;
  existingStudent: boolean;
  normalized: StudentProvisioningNormalizedRow | null;
};

export type StudentProvisioningPreview = {
  ok: boolean;
  filename?: string | null;
  headers: string[];
  requiredHeaders: readonly string[];
  optionalHeaders: readonly string[];
  missingHeaders: string[];
  totalRows: number;
  validRows: number;
  errorRows: number;
  emailsSuppressed: true;
  rows: StudentProvisioningPreviewRow[];
  errors: string[];
};

export type StudentProvisioningApplyResult = StudentProvisioningPreview & {
  batchId: string;
  appliedRows: number;
  skippedRows: number;
  failedRows: number;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function compact(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parsePrice(value: string) {
  const digits = value.replace(/[^0-9]/g, "");
  if (!digits) return null;
  const parsed = Number(digits);
  return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= 50_000_000 ? parsed : null;
}

function parseSessionCount(value: string): ManualMonthlyClassCount | null {
  const parsed = Number(value.trim());
  return parsed === 2 || parsed === 4 || parsed === 8 ? parsed : null;
}

function parseCsv(csv: string) {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field);
      field = "";
      if (row.some((value) => value.trim().length > 0)) rows.push(row);
      row = [];
      continue;
    }

    field += char;
  }

  row.push(field);
  if (row.some((value) => value.trim().length > 0)) rows.push(row);

  if (!rows.length) return { headers: [] as string[], records: [] as CsvRecord[], errors: ["CSV is empty."] };

  const headers = rows[0].map((header) => header.trim().toLowerCase());
  const records = rows.slice(1).map((values, index) => {
    const mapped: Record<string, string> = {};
    headers.forEach((header, headerIndex) => {
      mapped[header] = values[headerIndex]?.trim() ?? "";
    });
    return { rowNumber: index + 2, values: mapped };
  });

  return { headers, records, errors: [] as string[] };
}

function normalizeGuardian(values: Record<string, string>, index: 1 | 2, studentEmail: string, errors: string[]) {
  const name = compact(values[`parent${index}_name`]);
  const email = normalizeEmail(values[`parent${index}_email`] ?? "");
  const relationship = compact(values[`parent${index}_relationship`]);
  const phone = compact(values[`parent${index}_phone`]);
  const hasAny = Boolean(name || email || relationship || phone);
  if (!hasAny) return null;

  if (!name) errors.push(`Parent ${index} name is required when any parent ${index} field is provided.`);
  if (!email) errors.push(`Parent ${index} email is required when any parent ${index} field is provided.`);
  if (!relationship) errors.push(`Parent ${index} relationship is required when any parent ${index} field is provided.`);
  if (email && !/^\S+@\S+\.\S+$/.test(email)) errors.push(`Parent ${index} email is invalid.`);
  if (email && email === studentEmail) errors.push(`Parent ${index} email must be different from the student email.`);

  if (!name || !email || !relationship) return null;
  return { name, email, relationship, phone: phone || null, primaryContact: index === 1 } satisfies NormalizedGuardian;
}

function normalizeRecord(record: CsvRecord, duplicateStudentEmails: Set<string>) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const values = record.values;
  const studentName = compact(values.student_name);
  const studentEmail = normalizeEmail(values.student_email ?? "");
  const teacherEmail = normalizeEmail(values.teacher_email ?? "");
  const instrument = normalizeInstrument(values.student_instrument);
  const monthlySessionCount = parseSessionCount(values.monthly_session_count ?? "");
  const pricePerClassCop = parsePrice(values.price_per_class_cop ?? "");
  const studentPhone = compact(values.student_phone);
  const alegraContactId = compact(values.alegra_contact_id);
  const notes = compact(values.notes);

  if (!studentName) errors.push("Student name is required.");
  if (!studentEmail) errors.push("Student email is required.");
  if (studentEmail && !/^\S+@\S+\.\S+$/.test(studentEmail)) errors.push("Student email is invalid.");
  if (duplicateStudentEmails.has(studentEmail)) errors.push("Student email appears more than once in this CSV.");
  if (!teacherEmail) errors.push("Teacher email is required.");
  if (teacherEmail && !/^\S+@\S+\.\S+$/.test(teacherEmail)) errors.push("Teacher email is invalid.");
  if (!instrument) errors.push("Student instrument must be Piano or Voice.");
  if (!monthlySessionCount) errors.push("Monthly session count must be 2, 4, or 8.");
  if (pricePerClassCop === null) errors.push("Price per class COP must be a valid whole-peso amount.");

  const guardians = [normalizeGuardian(values, 1, studentEmail, errors), normalizeGuardian(values, 2, studentEmail, errors)].filter((guardian): guardian is NormalizedGuardian => Boolean(guardian));
  if (guardians.length >= 2 && guardians[0].email === guardians[1].email) errors.push("Parent 1 and parent 2 emails must be different.");
  if (!guardians.length) warnings.push("No parent/guardian provided for this student.");

  if (!studentName || !studentEmail || !teacherEmail || !instrument || !monthlySessionCount || pricePerClassCop === null) {
    return { normalized: null, errors, warnings };
  }

  return {
    normalized: {
      studentName,
      studentEmail,
      teacherEmail,
      studentInstrument: instrument,
      monthlySessionCount,
      pricePerClassCop,
      studentPhone: studentPhone || null,
      guardians,
      alegraContactId: alegraContactId || null,
      notes: notes || null,
      defaultTimezone: DEFAULT_IMPORTED_TIMEZONE,
    } satisfies StudentProvisioningNormalizedRow,
    errors,
    warnings,
  };
}

async function buildPreview(csv: string, filename?: string | null): Promise<StudentProvisioningPreview> {
  const errors: string[] = [];
  if (Buffer.byteLength(csv, "utf8") > MAX_CSV_BYTES) errors.push("CSV is too large. Maximum size is 1MB.");

  const parsed = parseCsv(csv);
  errors.push(...parsed.errors);
  const missingHeaders = REQUIRED_HEADERS.filter((header) => !parsed.headers.includes(header));
  if (missingHeaders.length) errors.push(`Missing required columns: ${missingHeaders.join(", ")}.`);
  if (parsed.records.length > MAX_ROWS) errors.push(`CSV has too many rows. Maximum is ${MAX_ROWS}.`);

  const studentEmailCounts = new Map<string, number>();
  parsed.records.forEach((record) => {
    const email = normalizeEmail(record.values.student_email ?? "");
    if (email) studentEmailCounts.set(email, (studentEmailCounts.get(email) ?? 0) + 1);
  });
  const duplicateStudentEmails = new Set(Array.from(studentEmailCounts.entries()).filter(([, count]) => count > 1).map(([email]) => email));

  const normalizedRows = parsed.records.map((record) => ({ record, ...normalizeRecord(record, duplicateStudentEmails) }));
  const candidateRows = normalizedRows.filter((row) => row.normalized);
  const teacherEmails = Array.from(new Set(candidateRows.map((row) => row.normalized!.teacherEmail)));
  const studentEmails = Array.from(new Set(candidateRows.map((row) => row.normalized!.studentEmail)));
  const guardianEmails = Array.from(new Set(candidateRows.flatMap((row) => row.normalized!.guardians.map((guardian) => guardian.email))));

  const [teachers, studentUsers, guardianUsers] = await Promise.all([
    teacherEmails.length
      ? db.user.findMany({
          where: { email: { in: teacherEmails } },
          include: { teacherProfile: true },
        })
      : [],
    studentEmails.length
      ? db.user.findMany({
          where: { email: { in: studentEmails } },
          include: { studentProfile: true },
        })
      : [],
    guardianEmails.length
      ? db.user.findMany({
          where: { email: { in: guardianEmails } },
          include: { parentGuardianProfile: true },
        })
      : [],
  ]);

  const teacherByEmail = new Map(teachers.map((teacher) => [teacher.email, teacher]));
  const studentByEmail = new Map(studentUsers.map((user) => [user.email, user]));
  const guardianByEmail = new Map(guardianUsers.map((user) => [user.email, user]));

  const rows: StudentProvisioningPreviewRow[] = normalizedRows.map((row) => {
    const rowErrors = [...row.errors];
    const rowWarnings = [...row.warnings];
    let matchedTeacherName: string | null = null;
    let existingStudent = false;

    if (row.normalized) {
      const teacher = teacherByEmail.get(row.normalized.teacherEmail);
      if (!teacher || teacher.role !== Role.TEACHER || !teacher.teacherProfile) {
        rowErrors.push("Teacher email does not match an existing teacher account.");
      } else {
        matchedTeacherName = teacher.name;
      }

      const studentUser = studentByEmail.get(row.normalized.studentEmail);
      if (studentUser && studentUser.role !== Role.STUDENT) {
        rowErrors.push("Student email already belongs to a non-student account.");
      } else if (studentUser) {
        existingStudent = true;
        rowWarnings.push("Existing student will be updated.");
      }

      row.normalized.guardians.forEach((guardian) => {
        const guardianUser = guardianByEmail.get(guardian.email);
        if (guardianUser && guardianUser.role !== Role.PARENT) {
          rowErrors.push(`Guardian email ${guardian.email} already belongs to a non-parent account.`);
        } else if (guardianUser) {
          rowWarnings.push(`Existing guardian ${guardian.email} will be linked.`);
        }
      });

      if (row.normalized.alegraContactId) rowWarnings.push(`Alegra contact ${row.normalized.alegraContactId} will be linked manually.`);
    }

    return {
      rowNumber: row.record.rowNumber,
      status: rowErrors.length ? "error" : "valid",
      errors: rowErrors,
      warnings: rowWarnings,
      matchedTeacherName,
      existingStudent,
      normalized: row.normalized,
    };
  });

  const validRows = rows.filter((row) => row.status === "valid").length;
  const errorRows = rows.length - validRows;

  return {
    ok: errors.length === 0 && errorRows === 0,
    filename,
    headers: parsed.headers,
    requiredHeaders: REQUIRED_HEADERS,
    optionalHeaders: OPTIONAL_HEADERS,
    missingHeaders,
    totalRows: parsed.records.length,
    validRows,
    errorRows,
    emailsSuppressed: true,
    rows,
    errors,
  };
}

export async function previewStudentProvisioningCsv(input: { csv: string; filename?: string | null }) {
  return buildPreview(input.csv, input.filename);
}

async function upsertPlan(tx: Prisma.TransactionClient, monthlyClassCount: ManualMonthlyClassCount, locale: "en" | "es") {
  return tx.subscriptionPlan.upsert({
    where: { id: manualPlanId(monthlyClassCount) },
    update: {
      name: manualPlanName(monthlyClassCount, locale),
      priceUsd: INTERNAL_CLASS_ALLOWANCE_PRICE_USD,
      monthlyClassCount,
      description: manualPlanDescription(locale),
      active: true,
    },
    create: {
      id: manualPlanId(monthlyClassCount),
      name: manualPlanName(monthlyClassCount, locale),
      priceUsd: INTERNAL_CLASS_ALLOWANCE_PRICE_USD,
      monthlyClassCount,
      description: manualPlanDescription(locale),
      active: true,
    },
  });
}

async function linkGuardianSilently(tx: Prisma.TransactionClient, input: { studentId: string; studentTimezone: string; guardian: NormalizedGuardian }) {
  const existingUser = await tx.user.findUnique({
    where: { email: input.guardian.email },
    include: { parentGuardianProfile: true },
  });

  if (existingUser && existingUser.role !== Role.PARENT) throw new Error(`Guardian email ${input.guardian.email} belongs to a non-parent account.`);

  const parentUser = existingUser
    ? await tx.user.update({
        where: { id: existingUser.id },
        data: { name: input.guardian.name },
        include: { parentGuardianProfile: true },
      })
    : await tx.user.create({
        data: {
          name: input.guardian.name,
          email: input.guardian.email,
          role: Role.PARENT,
          timezone: input.studentTimezone,
        },
        include: { parentGuardianProfile: true },
      });

  const parentProfile = parentUser.parentGuardianProfile
    ? await tx.parentGuardianProfile.update({
        where: { id: parentUser.parentGuardianProfile.id },
        data: { phone: input.guardian.phone },
      })
    : await tx.parentGuardianProfile.create({
        data: { userId: parentUser.id, phone: input.guardian.phone },
      });

  if (input.guardian.primaryContact) {
    await tx.parentStudentLink.updateMany({
      where: { studentId: input.studentId, primaryContact: true },
      data: { primaryContact: false },
    });
  }

  await tx.parentStudentLink.upsert({
    where: { parentId_studentId: { parentId: parentProfile.id, studentId: input.studentId } },
    update: {
      relationship: input.guardian.relationship,
      primaryContact: input.guardian.primaryContact,
    },
    create: {
      parentId: parentProfile.id,
      studentId: input.studentId,
      relationship: input.guardian.relationship,
      primaryContact: input.guardian.primaryContact,
    },
  });
}

async function applyNormalizedRow(input: { row: StudentProvisioningNormalizedRow; actorUserId: string; locale: "en" | "es" }) {
  return db.$transaction(async (tx) => {
    const teacher = await tx.user.findUnique({
      where: { email: input.row.teacherEmail },
      include: { teacherProfile: true },
    });
    if (!teacher || teacher.role !== Role.TEACHER || !teacher.teacherProfile) throw new Error("Teacher email does not match an existing teacher account.");

    const existingUser = await tx.user.findUnique({
      where: { email: input.row.studentEmail },
      include: { studentProfile: true },
    });
    if (existingUser && existingUser.role !== Role.STUDENT) throw new Error("Student email already belongs to a non-student account.");

    const studentUser = existingUser
      ? await tx.user.update({
          where: { id: existingUser.id },
          data: { name: input.row.studentName },
          include: { studentProfile: true },
        })
      : await tx.user.create({
          data: {
            name: input.row.studentName,
            email: input.row.studentEmail,
            role: Role.STUDENT,
            timezone: input.row.defaultTimezone,
          },
          include: { studentProfile: true },
        });

    const profileData = {
      phone: input.row.studentPhone ?? undefined,
      preferredInstrument: input.row.studentInstrument,
      bio: input.row.notes ?? undefined,
    };
    const studentProfile = studentUser.studentProfile
      ? await tx.studentProfile.update({
          where: { id: studentUser.studentProfile.id },
          data: profileData,
        })
      : await tx.studentProfile.create({
          data: {
            userId: studentUser.id,
            phone: input.row.studentPhone,
            preferredInstrument: input.row.studentInstrument,
            bio: input.row.notes,
          },
        });

    await tx.teacherAssignment.upsert({
      where: { studentId: studentProfile.id },
      update: { teacherId: teacher.teacherProfile.id, assignedBy: input.actorUserId },
      create: { studentId: studentProfile.id, teacherId: teacher.teacherProfile.id, assignedBy: input.actorUserId },
    });

    const plan = await upsertPlan(tx, input.row.monthlySessionCount, input.locale);
    const activeSubscription = await tx.activeSubscription.findFirst({
      where: { studentId: studentProfile.id, active: true },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    });
    if (!activeSubscription || activeSubscription.monthlyClassLimit !== input.row.monthlySessionCount || activeSubscription.plan.monthlyClassCount !== input.row.monthlySessionCount) {
      const now = new Date();
      await tx.activeSubscription.updateMany({
        where: { studentId: studentProfile.id, active: true },
        data: { active: false, endsAt: now },
      });
      await tx.activeSubscription.create({
        data: {
          studentId: studentProfile.id,
          planId: plan.id,
          startsAt: now,
          monthlyClassLimit: input.row.monthlySessionCount,
          active: true,
        },
      });
    }

    await tx.studentBillingProfile.upsert({
      where: { studentId: studentProfile.id },
      update: {
        defaultSessionCount: input.row.monthlySessionCount,
        pricePerClassCop: input.row.pricePerClassCop,
        notes: input.row.notes ?? undefined,
      },
      create: {
        studentId: studentProfile.id,
        defaultSessionCount: input.row.monthlySessionCount,
        pricePerClassCop: input.row.pricePerClassCop,
        notes: input.row.notes,
      },
    });

    if (input.row.alegraContactId) {
      await tx.invoiceContactLink.upsert({
        where: { studentId: studentProfile.id },
        update: {
          alegraContactId: input.row.alegraContactId,
          strategy: InvoiceContactLinkStrategy.MANUAL,
          lastResolvedAt: new Date(),
          lastError: null,
        },
        create: {
          studentId: studentProfile.id,
          alegraContactId: input.row.alegraContactId,
          strategy: InvoiceContactLinkStrategy.MANUAL,
          lastResolvedAt: new Date(),
          lastError: null,
        },
      });
    }

    for (const guardian of input.row.guardians) {
      await linkGuardianSilently(tx, { studentId: studentProfile.id, studentTimezone: studentUser.timezone, guardian });
    }

    return { studentId: studentProfile.id, teacherName: teacher.name };
  });
}

export async function applyStudentProvisioningCsv(input: { csv: string; filename?: string | null; actorUserId: string; locale: "en" | "es" }): Promise<StudentProvisioningApplyResult> {
  const preview = await buildPreview(input.csv, input.filename);
  const batch = await db.studentProvisioningImportBatch.create({
    data: {
      filename: input.filename ?? null,
      status: StudentProvisioningImportBatchStatus.FAILED,
      totalRows: preview.totalRows,
      validRows: preview.validRows,
      errorRows: preview.errorRows,
      emailsSuppressed: true,
      createdByUserId: input.actorUserId,
    },
  });

  let appliedRows = 0;
  let skippedRows = 0;
  let failedRows = 0;
  const resultRows: StudentProvisioningPreviewRow[] = [];

  for (const row of preview.rows) {
    if (row.status !== "valid" || !row.normalized) {
      skippedRows += 1;
      await db.studentProvisioningImportRow.create({
        data: {
          batchId: batch.id,
          rowNumber: row.rowNumber,
          status: StudentProvisioningImportRowStatus.SKIPPED,
          studentEmail: row.normalized?.studentEmail ?? "",
          studentName: row.normalized?.studentName ?? null,
          teacherEmail: row.normalized?.teacherEmail ?? null,
          teacherName: row.matchedTeacherName,
          guardianEmails: row.normalized?.guardians.map((guardian) => guardian.email) ?? [],
          errors: row.errors as Prisma.InputJsonValue,
          warnings: row.warnings as Prisma.InputJsonValue,
          normalized: row.normalized ? row.normalized as Prisma.InputJsonValue : undefined,
        },
      });
      resultRows.push(row);
      continue;
    }

    try {
      const applied = await applyNormalizedRow({ row: row.normalized, actorUserId: input.actorUserId, locale: input.locale });
      appliedRows += 1;
      await db.studentProvisioningImportRow.create({
        data: {
          batchId: batch.id,
          rowNumber: row.rowNumber,
          status: StudentProvisioningImportRowStatus.APPLIED,
          studentEmail: row.normalized.studentEmail,
          studentName: row.normalized.studentName,
          teacherEmail: row.normalized.teacherEmail,
          teacherName: applied.teacherName,
          guardianEmails: row.normalized.guardians.map((guardian) => guardian.email),
          warnings: row.warnings as Prisma.InputJsonValue,
          normalized: row.normalized as Prisma.InputJsonValue,
          studentId: applied.studentId,
        },
      });
      resultRows.push(row);
    } catch (error) {
      failedRows += 1;
      const message = error instanceof Error ? error.message : "Could not apply row.";
      const failed = { ...row, status: "error" as const, errors: [...row.errors, message] };
      await db.studentProvisioningImportRow.create({
        data: {
          batchId: batch.id,
          rowNumber: row.rowNumber,
          status: StudentProvisioningImportRowStatus.FAILED,
          studentEmail: row.normalized.studentEmail,
          studentName: row.normalized.studentName,
          teacherEmail: row.normalized.teacherEmail,
          teacherName: row.matchedTeacherName,
          guardianEmails: row.normalized.guardians.map((guardian) => guardian.email),
          errors: failed.errors as Prisma.InputJsonValue,
          warnings: row.warnings as Prisma.InputJsonValue,
          normalized: row.normalized as Prisma.InputJsonValue,
        },
      });
      resultRows.push(failed);
    }
  }

  const status = failedRows > 0 || skippedRows > 0
    ? appliedRows > 0 ? StudentProvisioningImportBatchStatus.PARTIAL : StudentProvisioningImportBatchStatus.FAILED
    : StudentProvisioningImportBatchStatus.APPLIED;

  await db.studentProvisioningImportBatch.update({
    where: { id: batch.id },
    data: { status, appliedRows, skippedRows, failedRows },
  });

  return {
    ...preview,
    ok: failedRows === 0 && preview.errorRows === 0,
    batchId: batch.id,
    appliedRows,
    skippedRows,
    failedRows,
    rows: resultRows,
  };
}
