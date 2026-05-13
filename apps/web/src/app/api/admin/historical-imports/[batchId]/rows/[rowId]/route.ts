import { NextResponse } from "next/server";
import { HistoricalImportRowStatus, Prisma, Role } from "@prisma/client";
import { z } from "zod";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { applyHistoricalImportRow, markHistoricalImportRow } from "@/lib/historical-imports/apply";

const historicalImportRowActionSchema = z.object({
  action: z.enum(["APPLY", "SKIP", "SOURCE_ONLY"]),
  suggestedPayload: z.unknown().optional(),
});

type Params = { params: Promise<{ batchId: string; rowId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  if (auth.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "Solo administración puede revisar importaciones." : "Only admins can review imports." }, { status: 403 });
  }

  const { batchId, rowId } = await params;
  const parsed = historicalImportRowActionSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
  }

  const row = await db.historicalImportRow.findFirst({ where: { id: rowId, batchId } });
  if (!row) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "Fila de importación no encontrada." : "Import row not found." }, { status: 404 });
  }

  if (parsed.data.suggestedPayload !== undefined) {
    await db.historicalImportRow.update({ where: { id: row.id }, data: { suggestedPayload: parsed.data.suggestedPayload as Prisma.InputJsonValue } });
  }

  try {
    const updated = parsed.data.action === "APPLY"
      ? await applyHistoricalImportRow(row.id, auth.user.id)
      : await markHistoricalImportRow(
          row.id,
          auth.user.id,
          parsed.data.action === "SOURCE_ONLY" ? HistoricalImportRowStatus.SOURCE_ONLY : HistoricalImportRowStatus.SKIPPED,
        );

    return NextResponse.json({ row: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : auth.user.locale === "es" ? "No se pudo aplicar la fila." : "Could not apply row." },
      { status: 400 },
    );
  }
}
