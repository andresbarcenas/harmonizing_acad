import "server-only";

import { Role } from "@prisma/client";

import { db } from "@/lib/db";

export class ParentAccessError extends Error {
  constructor(public status = 403) {
    super("PARENT_STUDENT_ACCESS_DENIED");
    this.name = "ParentAccessError";
  }
}

type ParentCapableUser = {
  role: Role;
  parentGuardianProfile?: { id: string } | null;
  studentProfile?: { id: string } | null;
};

type ParentCapableViewer = {
  role: Role;
  parentGuardianProfileId?: string | null;
  studentProfileId?: string | null;
};

export async function getParentLinkedStudents(parentProfileId: string) {
  return db.parentStudentLink.findMany({
    where: { parentId: parentProfileId },
    include: {
      student: {
        include: {
          user: true,
          assignment: { include: { teacher: { include: { user: true } } } },
        },
      },
    },
    orderBy: [{ primaryContact: "desc" }, { student: { user: { name: "asc" } } }],
  });
}

export async function resolveParentStudentSelection(parentProfileId: string, requestedStudentId?: string | null) {
  const links = await getParentLinkedStudents(parentProfileId);
  const selectedLink = requestedStudentId
    ? links.find((link) => link.studentId === requestedStudentId) ?? null
    : links[0] ?? null;

  return {
    links,
    selectedLink,
    selectedStudentId: selectedLink?.studentId ?? null,
  };
}

export async function parentCanAccessStudent(parentProfileId: string | null | undefined, studentId: string) {
  if (!parentProfileId) return false;
  const link = await db.parentStudentLink.findUnique({
    where: { parentId_studentId: { parentId: parentProfileId, studentId } },
    select: { id: true },
  });
  return Boolean(link);
}

export async function assertParentCanAccessStudent(parentProfileId: string | null | undefined, studentId: string) {
  const allowed = await parentCanAccessStudent(parentProfileId, studentId);
  if (!allowed) throw new ParentAccessError(403);
}

export async function resolveStudentIdForStudentOrParent(user: ParentCapableUser, requestedStudentId?: string | null) {
  if (user.role === Role.STUDENT && user.studentProfile?.id) return user.studentProfile.id;
  if (user.role === Role.PARENT && user.parentGuardianProfile?.id) {
    const { selectedStudentId } = await resolveParentStudentSelection(user.parentGuardianProfile.id, requestedStudentId);
    if (!selectedStudentId) throw new ParentAccessError(403);
    return selectedStudentId;
  }
  throw new ParentAccessError(403);
}

export async function resolveStudentIdForViewer(viewer: ParentCapableViewer, requestedStudentId?: string | null) {
  if (viewer.role === Role.STUDENT && viewer.studentProfileId) return viewer.studentProfileId;
  if (viewer.role === Role.PARENT && viewer.parentGuardianProfileId) {
    const { selectedStudentId } = await resolveParentStudentSelection(viewer.parentGuardianProfileId, requestedStudentId);
    if (!selectedStudentId) throw new ParentAccessError(403);
    return selectedStudentId;
  }
  throw new ParentAccessError(403);
}

export async function canAccessStudentProfile(user: ParentCapableUser, studentId: string) {
  if (user.role === Role.ADMIN) return true;
  if (user.role === Role.STUDENT) return user.studentProfile?.id === studentId;
  if (user.role === Role.PARENT) return parentCanAccessStudent(user.parentGuardianProfile?.id, studentId);
  return false;
}

export function parentPortalHref(pathname: string, studentId?: string | null) {
  if (!studentId) return pathname;
  const separator = pathname.includes("?") ? "&" : "?";
  return `${pathname}${separator}studentId=${encodeURIComponent(studentId)}`;
}
