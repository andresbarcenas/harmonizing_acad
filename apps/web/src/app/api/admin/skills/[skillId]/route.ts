import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { serializeSkillCategory, skillCategoryUsageInclude } from "@/lib/skills/admin";
import { validationErrorMessage } from "@/lib/validation-errors";
import { skillCategorySchema, type SkillCategoryInput } from "@/lib/validators/skills";

type RouteContext = {
  params: Promise<{ skillId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  if (auth.user.role !== Role.ADMIN) return forbidden(auth.user.locale);

  const { skillId } = await context.params;
  const parsed = skillCategorySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: validationErrorMessage(parsed.error, auth.user.locale, auth.user.locale === "es" ? "Habilidad inválida." : "Invalid skill.") }, { status: 400 });
  }

  const existing = await db.skillCategory.findUnique({ where: { id: skillId }, select: { id: true } });
  if (!existing) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "Habilidad no encontrada." : "Skill not found." }, { status: 404 });
  }

  const duplicate = await findDuplicateSkill(parsed.data, skillId);
  if (duplicate) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "Ya existe una habilidad con ese nombre para ese instrumento." : "A skill with that name already exists for that instrument." }, { status: 409 });
  }

  const skill = await db.skillCategory.update({
    where: { id: skillId },
    data: toSkillData(parsed.data),
    include: skillCategoryUsageInclude,
  });

  return NextResponse.json({ skill: serializeSkillCategory(skill) });
}

function toSkillData(input: SkillCategoryInput) {
  return {
    instrument: input.instrument,
    name: input.name,
    description: input.description ?? null,
    sortOrder: input.sortOrder,
    active: input.active,
  };
}

async function findDuplicateSkill(input: SkillCategoryInput, excludeId: string) {
  return db.skillCategory.findFirst({
    where: {
      id: { not: excludeId },
      instrument: input.instrument,
      name: { equals: input.name, mode: "insensitive" },
    },
    select: { id: true },
  });
}

function forbidden(locale: string) {
  return NextResponse.json({ error: locale === "es" ? "No autorizado." : "Forbidden." }, { status: 403 });
}
