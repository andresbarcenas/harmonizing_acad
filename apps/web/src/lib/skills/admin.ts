import "server-only";

import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import type { SkillCategoryInput } from "@/lib/validators/skills";

export const skillCategoryUsageInclude = {
  _count: {
    select: {
      lessonRatings: true,
      practiceAssignments: true,
      practiceLogs: true,
      practiceVideos: true,
      videoSkillRatings: true,
    },
  },
} satisfies Prisma.SkillCategoryInclude;

export type SkillCategoryWithUsage = Prisma.SkillCategoryGetPayload<{ include: typeof skillCategoryUsageInclude }>;

export function serializeSkillCategory(skill: SkillCategoryWithUsage) {
  const usageCount =
    skill._count.lessonRatings +
    skill._count.practiceAssignments +
    skill._count.practiceLogs +
    skill._count.practiceVideos +
    skill._count.videoSkillRatings;

  return {
    id: skill.id,
    name: skill.name,
    instrument: skill.instrument,
    description: skill.description,
    sortOrder: skill.sortOrder,
    active: skill.active,
    createdAt: skill.createdAt.toISOString(),
    updatedAt: skill.updatedAt.toISOString(),
    usageCount,
    usage: skill._count,
  };
}

export async function getAdminSkillCategories() {
  const skills = await db.skillCategory.findMany({
    include: skillCategoryUsageInclude,
    orderBy: [{ instrument: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  });

  return skills.map(serializeSkillCategory);
}

export async function createSkillCategory(input: SkillCategoryInput) {
  const duplicate = await findDuplicateSkill(input);
  if (duplicate) throw new Error("DUPLICATE_SKILL");

  const skill = await db.skillCategory.create({
    data: toSkillData(input),
    include: skillCategoryUsageInclude,
  });

  return serializeSkillCategory(skill);
}

export async function updateSkillCategory(skillId: string, input: SkillCategoryInput) {
  const existing = await db.skillCategory.findUnique({ where: { id: skillId }, select: { id: true } });
  if (!existing) throw new Error("SKILL_NOT_FOUND");

  const duplicate = await findDuplicateSkill(input, skillId);
  if (duplicate) throw new Error("DUPLICATE_SKILL");

  const skill = await db.skillCategory.update({
    where: { id: skillId },
    data: toSkillData(input),
    include: skillCategoryUsageInclude,
  });

  return serializeSkillCategory(skill);
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

async function findDuplicateSkill(input: SkillCategoryInput, excludeId?: string) {
  return db.skillCategory.findFirst({
    where: {
      ...(excludeId ? { id: { not: excludeId } } : {}),
      instrument: input.instrument,
      name: { equals: input.name, mode: "insensitive" },
    },
    select: { id: true },
  });
}
