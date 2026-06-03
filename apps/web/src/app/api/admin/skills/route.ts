import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { createSkillCategory, getAdminSkillCategories } from "@/lib/skills/admin";
import { validationErrorMessage } from "@/lib/validation-errors";
import { skillCategorySchema } from "@/lib/validators/skills";

export async function GET() {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  if (auth.user.role !== Role.ADMIN) return forbidden(auth.user.locale);

  return NextResponse.json({ skills: await getAdminSkillCategories() });
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  if (auth.user.role !== Role.ADMIN) return forbidden(auth.user.locale);

  const parsed = skillCategorySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: validationErrorMessage(parsed.error, auth.user.locale, auth.user.locale === "es" ? "Habilidad inválida." : "Invalid skill.") }, { status: 400 });
  }

  try {
    const skill = await createSkillCategory(parsed.data);
    return NextResponse.json({ skill }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    if (message === "DUPLICATE_SKILL") {
      return NextResponse.json({ error: auth.user.locale === "es" ? "Ya existe una habilidad con ese nombre para ese instrumento." : "A skill with that name already exists for that instrument." }, { status: 409 });
    }
    return NextResponse.json({ error: auth.user.locale === "es" ? "No se pudo guardar la habilidad." : "Could not save skill." }, { status: 400 });
  }
}

function forbidden(locale: string) {
  return NextResponse.json({ error: locale === "es" ? "No autorizado." : "Forbidden." }, { status: 403 });
}
