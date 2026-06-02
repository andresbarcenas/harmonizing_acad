import "server-only";

import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

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
