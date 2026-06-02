import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { getAdminSkillCategories } from "@/lib/skills/admin";
import { syncDefaultSkills } from "@/lib/skills/sync-defaults";
import { validationErrorMessage } from "@/lib/validation-errors";
import { syncDefaultSkillsSchema } from "@/lib/validators/skills";

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  if (auth.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "No autorizado." : "Forbidden." }, { status: 403 });
  }

  const parsed = syncDefaultSkillsSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: validationErrorMessage(parsed.error, auth.user.locale, auth.user.locale === "es" ? "Sincronización inválida." : "Invalid sync request.") }, { status: 400 });
  }

  const result = await syncDefaultSkills(db, { overwriteDefaults: parsed.data.overwriteDefaults });
  const skills = await getAdminSkillCategories();

  return NextResponse.json({ result, skills });
}
