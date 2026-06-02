import { z } from "zod";

import { skillInstruments } from "@/lib/skills/default-skills";

const optionalTrimmedString = (maxLength: number) =>
  z.preprocess((value) => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }, z.string().max(maxLength).optional());

export const skillCategorySchema = z.object({
  instrument: z.enum(skillInstruments, { message: "Invalid skill instrument." }),
  name: z.string().trim().min(1, "Skill name is required.").max(100),
  description: optionalTrimmedString(500),
  sortOrder: z.coerce.number().int().min(0).max(10000),
  active: z.boolean().default(true),
});

export const syncDefaultSkillsSchema = z.object({
  overwriteDefaults: z.boolean().optional().default(false),
});

export type SkillCategoryInput = z.infer<typeof skillCategorySchema>;
