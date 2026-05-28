import { NextResponse } from "next/server";
import { Role, UserLoginActivityStatus, UserLoginAuthMethod } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";

function enumValue<T extends Record<string, string>>(values: T, value: string | null) {
  if (!value) return undefined;
  return Object.values(values).includes(value) ? value as T[keyof T] : undefined;
}

export async function GET(req: Request) {
  const auth = await requireApiUser({ skipConsent: true });
  if ("error" in auth) return auth.error;
  if (auth.user.role !== Role.ADMIN) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const status = enumValue(UserLoginActivityStatus, url.searchParams.get("status"));
  const authMethod = enumValue(UserLoginAuthMethod, url.searchParams.get("authMethod"));
  const q = url.searchParams.get("q")?.trim();
  const rawLimit = Number(url.searchParams.get("limit") ?? 80);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.trunc(rawLimit), 10), 200) : 80;

  const activity = await db.userLoginActivity.findMany({
    where: {
      status,
      authMethod,
      OR: q
        ? [
            { emailAttempted: { contains: q, mode: "insensitive" } },
            { user: { name: { contains: q, mode: "insensitive" } } },
            { ipAddress: { contains: q, mode: "insensitive" } },
          ]
        : undefined,
    },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ activity });
}
