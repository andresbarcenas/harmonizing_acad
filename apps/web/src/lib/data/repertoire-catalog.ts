import "server-only";

import { RepertoireStatus, Role } from "@prisma/client";
import type { Prisma, PrismaClient } from "@prisma/client";

import type { AppViewer } from "@/features/auth/server";
import { db } from "@/lib/db";
import { normalizeInstrument } from "@/lib/instruments";
import type { RepertoireCatalogAssignInput, RepertoireCatalogItemInput } from "@/lib/validators/repertoire-catalog";

type TxClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export type RepertoireCatalogSearchOptions = {
  query?: string | null;
  instrument?: string | null;
  limit?: number;
};

export class RepertoireCatalogError extends Error {
  constructor(public code: "FORBIDDEN" | "NOT_FOUND" | "STUDENT_NOT_ASSIGNED", public status = 400) {
    super(code);
    this.name = "RepertoireCatalogError";
  }
}

export function getRepertoireCatalogErrorMessage(error: unknown, locale = "en") {
  if (!(error instanceof RepertoireCatalogError)) return null;
  const es = locale === "es";
  const messages = {
    FORBIDDEN: es ? "No tienes permisos para gestionar repertorio." : "You do not have permission to manage repertoire.",
    NOT_FOUND: es ? "Canción o pieza no encontrada." : "Song or piece not found.",
    STUDENT_NOT_ASSIGNED: es ? "El estudiante no está asignado a esta docente." : "The student is not assigned to this teacher.",
  } satisfies Record<RepertoireCatalogError["code"], string>;
  return { status: error.status, message: messages[error.code] };
}

function catalogWhere(options: RepertoireCatalogSearchOptions = {}): Prisma.RepertoireCatalogItemWhereInput {
  const query = options.query?.trim();
  const instrument = normalizeInstrument(options.instrument);
  const where: Prisma.RepertoireCatalogItemWhereInput = {};
  const and: Prisma.RepertoireCatalogItemWhereInput[] = [];

  if (instrument) and.push({ instrument: { equals: instrument, mode: "insensitive" } });
  if (query) {
    and.push({
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { composerOrArtist: { contains: query, mode: "insensitive" } },
        { tags: { contains: query, mode: "insensitive" } },
        { level: { contains: query, mode: "insensitive" } },
        { instrument: { contains: query, mode: "insensitive" } },
      ],
    });
  }

  if (and.length) where.AND = and;
  return where;
}

export async function searchRepertoireCatalog(options: RepertoireCatalogSearchOptions = {}) {
  const requestedLimit = Number.isFinite(options.limit) ? options.limit ?? 50 : 50;
  return db.repertoireCatalogItem.findMany({
    where: catalogWhere(options),
    orderBy: [{ instrument: "asc" }, { title: "asc" }],
    take: Math.min(Math.max(requestedLimit, 1), 100),
  });
}

export async function getRepertoireCatalogManagerData(viewer: AppViewer, options: RepertoireCatalogSearchOptions = {}) {
  if (viewer.role !== Role.ADMIN && viewer.role !== Role.TEACHER) {
    throw new RepertoireCatalogError("FORBIDDEN", 403);
  }

  const [catalogItems, students] = await Promise.all([
    searchRepertoireCatalog({ ...options, limit: options.limit ?? 60 }),
    viewer.role === Role.ADMIN
      ? db.studentProfile.findMany({ include: { user: true, assignment: { include: { teacher: { include: { user: true } } } } }, orderBy: { user: { name: "asc" } } })
      : db.studentProfile.findMany({ where: { assignment: { teacherId: viewer.teacherProfileId } }, include: { user: true, assignment: { include: { teacher: { include: { user: true } } } } }, orderBy: { user: { name: "asc" } } }),
  ]);

  return { catalogItems, students };
}

export async function assertCanManageCatalog(viewer: AppViewer | { role: Role }) {
  if (viewer.role !== Role.ADMIN && viewer.role !== Role.TEACHER) {
    throw new RepertoireCatalogError("FORBIDDEN", 403);
  }
}

export async function assertCanAssignCatalogToStudent(viewer: AppViewer | { role: Role; teacherProfileId?: string | null }, studentId: string) {
  if (viewer.role === Role.ADMIN) return;
  if (viewer.role !== Role.TEACHER || !viewer.teacherProfileId) throw new RepertoireCatalogError("FORBIDDEN", 403);
  const assignment = await db.teacherAssignment.findFirst({ where: { teacherId: viewer.teacherProfileId, studentId }, select: { id: true } });
  if (!assignment) throw new RepertoireCatalogError("STUDENT_NOT_ASSIGNED", 403);
}

export async function createCatalogItem(input: RepertoireCatalogItemInput, createdByUserId: string) {
  return db.repertoireCatalogItem.create({ data: { ...input, createdByUserId } });
}

export async function updateCatalogItem(catalogItemId: string, input: RepertoireCatalogItemInput) {
  const existing = await db.repertoireCatalogItem.findUnique({ where: { id: catalogItemId }, select: { id: true } });
  if (!existing) throw new RepertoireCatalogError("NOT_FOUND", 404);
  return db.repertoireCatalogItem.update({ where: { id: catalogItemId }, data: input });
}

export async function assignCatalogItemToStudent(input: {
  catalogItemId: string;
  studentId: string;
  teacherId?: string | null;
  values?: Partial<RepertoireCatalogAssignInput>;
  tx?: TxClient;
}) {
  const client = input.tx ?? db;
  const catalogItem = await client.repertoireCatalogItem.findUnique({ where: { id: input.catalogItemId } });
  if (!catalogItem) throw new RepertoireCatalogError("NOT_FOUND", 404);

  const existing = await client.repertoireItem.findFirst({
    where: {
      studentId: input.studentId,
      catalogItemId: catalogItem.id,
      status: { notIn: [RepertoireStatus.COMPLETED, RepertoireStatus.PAUSED] },
    },
  });
  if (existing) return existing;

  const values = input.values ?? {};
  return client.repertoireItem.create({
    data: {
      studentId: input.studentId,
      teacherId: input.teacherId ?? null,
      catalogItemId: catalogItem.id,
      title: catalogItem.title,
      composerOrArtist: catalogItem.composerOrArtist,
      instrument: catalogItem.instrument,
      level: catalogItem.level,
      status: values.status ?? RepertoireStatus.ASSIGNED,
      startDate: new Date(),
      masteryPercent: values.masteryPercent ?? 0,
      currentFocusSection: values.currentFocusSection ?? catalogItem.defaultFocusSection,
      currentTempo: values.currentTempo ?? catalogItem.defaultCurrentTempo,
      targetTempo: values.targetTempo ?? catalogItem.defaultTargetTempo,
      teacherNotes: values.teacherNotes ?? catalogItem.defaultTeacherNotes,
      studentVisibleNotes: values.studentVisibleNotes ?? catalogItem.defaultStudentVisibleNotes,
    },
  });
}
