import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { applyStudentProvisioningCsv } from "@/lib/admin/student-provisioning-import";

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  if (auth.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "No autorizado." : "Forbidden." }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as { csv?: unknown; filename?: unknown } | null;
  if (!body || typeof body.csv !== "string") {
    return NextResponse.json({ error: auth.user.locale === "es" ? "CSV requerido." : "CSV is required." }, { status: 400 });
  }

  const result = await applyStudentProvisioningCsv({
    csv: body.csv,
    filename: typeof body.filename === "string" ? body.filename : null,
    actorUserId: auth.user.id,
    locale: auth.user.locale,
  });

  return NextResponse.json(result);
}
