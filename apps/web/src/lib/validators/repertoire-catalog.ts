import { RepertoireStatus } from "@prisma/client";
import { z } from "zod";

import { normalizeInstrument } from "@/lib/instruments";

const optionalString = (max = 2000) => z.preprocess((value) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().max(max).optional());

const optionalPositiveInt = (max = 400) => z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}, z.number().int().min(1).max(max).optional());

const optionalPercent = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}, z.number().int().min(0).max(100).optional());

const requiredInstrumentSchema = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  return normalizeInstrument(value) ?? value.trim();
}, z.enum(["Piano", "Voice"], { message: "Selecciona Piano o Voz." }));

export const repertoireCatalogItemSchema = z.object({
  title: z.string().trim().min(2).max(180),
  composerOrArtist: optionalString(160),
  instrument: requiredInstrumentSchema,
  level: optionalString(80),
  defaultFocusSection: optionalString(180),
  defaultCurrentTempo: optionalPositiveInt(400),
  defaultTargetTempo: optionalPositiveInt(400),
  defaultTeacherNotes: optionalString(2000),
  defaultStudentVisibleNotes: optionalString(2000),
  tags: optionalString(500),
});

export const repertoireCatalogAssignSchema = z.object({
  studentId: z.string().min(1),
  status: z.nativeEnum(RepertoireStatus).default(RepertoireStatus.ASSIGNED),
  masteryPercent: optionalPercent.default(0),
  currentFocusSection: optionalString(180),
  currentTempo: optionalPositiveInt(400),
  targetTempo: optionalPositiveInt(400),
  teacherNotes: optionalString(2000),
  studentVisibleNotes: optionalString(2000),
});

export type RepertoireCatalogItemInput = z.infer<typeof repertoireCatalogItemSchema>;
export type RepertoireCatalogAssignInput = z.infer<typeof repertoireCatalogAssignSchema>;
