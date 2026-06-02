import type { PrismaClient } from "@prisma/client";

import { defaultSkillCategories } from "./default-skills";

export type DefaultSkillSyncAction = "CREATED" | "UPDATED" | "SKIPPED";

export type DefaultSkillSyncResult = {
  created: number;
  updated: number;
  skipped: number;
  rows: Array<{
    action: DefaultSkillSyncAction;
    id: string;
    instrument: string;
    name: string;
  }>;
};

export async function syncDefaultSkills(
  prisma: PrismaClient,
  options: { overwriteDefaults?: boolean } = {},
): Promise<DefaultSkillSyncResult> {
  const result: DefaultSkillSyncResult = { created: 0, updated: 0, skipped: 0, rows: [] };

  for (const skill of defaultSkillCategories) {
    const existing = await prisma.skillCategory.findFirst({
      where: {
        instrument: skill.instrument,
        name: { equals: skill.name, mode: "insensitive" },
      },
      select: { id: true, name: true, instrument: true },
    });

    if (!existing) {
      const created = await prisma.skillCategory.create({
        data: {
          instrument: skill.instrument,
          name: skill.name,
          description: skill.description,
          sortOrder: skill.sortOrder,
          active: true,
        },
        select: { id: true, name: true, instrument: true },
      });
      result.created += 1;
      result.rows.push({ action: "CREATED", id: created.id, instrument: created.instrument, name: created.name });
      continue;
    }

    if (options.overwriteDefaults) {
      const updated = await prisma.skillCategory.update({
        where: { id: existing.id },
        data: {
          name: skill.name,
          description: skill.description,
          sortOrder: skill.sortOrder,
          active: true,
        },
        select: { id: true, name: true, instrument: true },
      });
      result.updated += 1;
      result.rows.push({ action: "UPDATED", id: updated.id, instrument: updated.instrument, name: updated.name });
      continue;
    }

    result.skipped += 1;
    result.rows.push({ action: "SKIPPED", id: existing.id, instrument: existing.instrument, name: existing.name });
  }

  return result;
}
