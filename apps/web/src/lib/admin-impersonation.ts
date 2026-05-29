import "server-only";

import { randomBytes, createHash } from "crypto";
import { cookies } from "next/headers";
import { AdminImpersonationStatus, Role, TeacherStatus, type Prisma } from "@prisma/client";

import { db } from "@/lib/db";

export const IMPERSONATION_COOKIE_NAME = "harmonizing_impersonation";
export const IMPERSONATION_MAX_AGE_SECONDS = 60 * 60;

export type UserWithProfiles = Prisma.UserGetPayload<{
  include: {
    studentProfile: true;
    teacherProfile: true;
    parentGuardianProfile: true;
  };
}>;

export type ActiveAdminImpersonation = {
  sessionId: string;
  adminUserId: string;
  adminName: string;
  targetUserId: string;
  targetName: string;
  expiresAt: Date;
  targetUser: UserWithProfiles;
};

type HeaderBag = Headers | Record<string, string | string[] | undefined> | undefined;

type StartImpersonationInput = {
  adminUserId: string;
  targetUserId: string;
  reason: string;
  headers?: HeaderBag;
};

function readHeader(headers: HeaderBag, name: string) {
  if (!headers) return null;
  if (headers instanceof Headers) return headers.get(name);
  const value = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function clientIp(headers: HeaderBag) {
  const forwarded = readHeader(headers, "x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  return readHeader(headers, "x-real-ip");
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createImpersonationToken() {
  return randomBytes(32).toString("base64url");
}

export function impersonationCookieOptions(expiresAt?: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: IMPERSONATION_MAX_AGE_SECONDS,
    expires: expiresAt,
  };
}

export function clearImpersonationCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };
}

export async function getImpersonationCookieToken() {
  const cookieStore = await cookies();
  return cookieStore.get(IMPERSONATION_COOKIE_NAME)?.value ?? null;
}

export async function startTeacherImpersonation(input: StartImpersonationInput) {
  const reason = input.reason.trim().slice(0, 500);
  if (reason.length < 3) {
    return { error: "REASON_REQUIRED" as const };
  }

  const [adminUser, targetUser] = await Promise.all([
    db.user.findUnique({ where: { id: input.adminUserId }, include: { studentProfile: true, teacherProfile: true, parentGuardianProfile: true } }),
    db.user.findUnique({ where: { id: input.targetUserId }, include: { studentProfile: true, teacherProfile: true, parentGuardianProfile: true } }),
  ]);

  if (!adminUser || adminUser.role !== Role.ADMIN) {
    return { error: "ADMIN_REQUIRED" as const };
  }

  if (!targetUser) {
    return { error: "TARGET_NOT_FOUND" as const };
  }

  if (targetUser.id === adminUser.id) {
    return { error: "SELF_IMPERSONATION_BLOCKED" as const };
  }

  if (targetUser.role !== Role.TEACHER || !targetUser.teacherProfile) {
    return { error: "TEACHER_ONLY" as const };
  }

  if (targetUser.teacherProfile.status === TeacherStatus.INACTIVE) {
    return { error: "TARGET_INACTIVE" as const };
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + IMPERSONATION_MAX_AGE_SECONDS * 1000);
  const token = createImpersonationToken();

  await db.adminImpersonationSession.updateMany({
    where: {
      adminUserId: adminUser.id,
      status: AdminImpersonationStatus.ACTIVE,
    },
    data: {
      status: AdminImpersonationStatus.ENDED,
      endedAt: now,
    },
  });

  const session = await db.adminImpersonationSession.create({
    data: {
      adminUserId: adminUser.id,
      targetUserId: targetUser.id,
      targetRole: targetUser.role,
      reason,
      tokenHash: hashToken(token),
      expiresAt,
      ipAddress: clientIp(input.headers)?.slice(0, 80) ?? undefined,
      userAgent: readHeader(input.headers, "user-agent")?.slice(0, 1000) ?? undefined,
    },
    include: {
      adminUser: { select: { id: true, name: true, email: true } },
      targetUser: { include: { studentProfile: true, teacherProfile: true, parentGuardianProfile: true } },
    },
  });

  return { token, session, targetUser };
}

export async function resolveActiveImpersonation(realUser: UserWithProfiles, token?: string | null): Promise<ActiveAdminImpersonation | null> {
  if (realUser.role !== Role.ADMIN) return null;

  const cookieToken = token ?? await getImpersonationCookieToken();
  if (!cookieToken) return null;

  const session = await db.adminImpersonationSession.findUnique({
    where: { tokenHash: hashToken(cookieToken) },
    include: {
      adminUser: { select: { id: true, name: true, email: true } },
      targetUser: { include: { studentProfile: true, teacherProfile: true, parentGuardianProfile: true } },
    },
  });

  if (!session || session.adminUserId !== realUser.id || session.status !== AdminImpersonationStatus.ACTIVE) {
    return null;
  }

  const now = new Date();
  if (session.expiresAt <= now) {
    await db.adminImpersonationSession.update({
      where: { id: session.id },
      data: { status: AdminImpersonationStatus.EXPIRED, endedAt: now },
    }).catch(() => null);
    return null;
  }

  if (
    session.targetUser.role !== Role.TEACHER
    || !session.targetUser.teacherProfile
    || session.targetUser.teacherProfile.status === TeacherStatus.INACTIVE
  ) {
    await db.adminImpersonationSession.update({
      where: { id: session.id },
      data: { status: AdminImpersonationStatus.ENDED, endedAt: now },
    }).catch(() => null);
    return null;
  }

  return {
    sessionId: session.id,
    adminUserId: session.adminUserId,
    adminName: session.adminUser.name,
    targetUserId: session.targetUserId,
    targetName: session.targetUser.name,
    expiresAt: session.expiresAt,
    targetUser: session.targetUser,
  };
}

export async function stopActiveImpersonation(adminUserId: string, token?: string | null) {
  const cookieToken = token ?? await getImpersonationCookieToken();
  if (!cookieToken) return null;

  const session = await db.adminImpersonationSession.findUnique({
    where: { tokenHash: hashToken(cookieToken) },
    select: { id: true, adminUserId: true, status: true },
  });

  if (!session || session.adminUserId !== adminUserId || session.status !== AdminImpersonationStatus.ACTIVE) {
    return null;
  }

  return db.adminImpersonationSession.update({
    where: { id: session.id },
    data: {
      status: AdminImpersonationStatus.ENDED,
      endedAt: new Date(),
    },
  });
}
