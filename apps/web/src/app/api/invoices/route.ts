import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { getStudentInvoicesView } from "@/features/invoices/data";
import { getRecentStudentSyncCooldownHit, syncStudentInvoices } from "@/lib/invoices/sync";

const STUDENT_SYNC_COOLDOWN_SECONDS = 60;

export async function GET() {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  if (auth.user.role !== Role.STUDENT || !auth.user.studentProfile?.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await getStudentInvoicesView(auth.user.studentProfile.id);

  return NextResponse.json({
    invoices: data.invoices,
    totalInvoices: data.totalInvoices,
    lastSyncedAt: data.lastSyncedAt,
    isStale: data.isStale,
    latestRun: data.latestRun,
    contactLink: data.link,
  });
}

export async function POST() {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  if (auth.user.role !== Role.STUDENT || !auth.user.studentProfile?.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const cooldownHit = await getRecentStudentSyncCooldownHit(
    auth.user.studentProfile.id,
    STUDENT_SYNC_COOLDOWN_SECONDS,
  );

  if (cooldownHit) {
    return NextResponse.json(
      { error: "Ya existe una sincronización reciente. Intenta nuevamente en unos segundos." },
      { status: 429 },
    );
  }

  const run = await syncStudentInvoices(auth.user.studentProfile.id, auth.user.id);
  return NextResponse.json({ run });
}
