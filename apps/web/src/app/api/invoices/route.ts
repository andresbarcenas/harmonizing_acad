import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { getStudentInvoicesView } from "@/features/invoices/data";
import { canUseAlegra } from "@/lib/alegra/client";
import { getRecentStudentSyncCooldownHit, syncStudentInvoices } from "@/lib/invoices/sync";
import { ParentAccessError, resolveStudentIdForStudentOrParent } from "@/lib/parents";

const STUDENT_SYNC_COOLDOWN_SECONDS = 60;

export async function GET(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  if (auth.user.role !== Role.STUDENT && auth.user.role !== Role.PARENT) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "No autorizado." : "Forbidden." }, { status: 403 });
  }
  let studentId: string;
  try {
    studentId = await resolveStudentIdForStudentOrParent(auth.user, new URL(req.url).searchParams.get("studentId"));
  } catch (error) {
    if (error instanceof ParentAccessError) return NextResponse.json({ error: auth.user.locale === "es" ? "No autorizado." : "Forbidden." }, { status: error.status });
    throw error;
  }

  const data = await getStudentInvoicesView(studentId);

  return NextResponse.json({
    invoices: data.invoices,
    totalInvoices: data.totalInvoices,
    lastSyncedAt: data.lastSyncedAt,
    isStale: data.isStale,
    isConfigured: data.isConfigured,
    latestRun: data.latestRun,
    contactLink: data.link,
  });
}

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  if (auth.user.role !== Role.STUDENT && auth.user.role !== Role.PARENT) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "No autorizado." : "Forbidden." }, { status: 403 });
  }
  const body = await req.json().catch(() => ({})) as { studentId?: string };
  let studentId: string;
  try {
    studentId = await resolveStudentIdForStudentOrParent(auth.user, body.studentId);
  } catch (error) {
    if (error instanceof ParentAccessError) return NextResponse.json({ error: auth.user.locale === "es" ? "No autorizado." : "Forbidden." }, { status: error.status });
    throw error;
  }

  if (!canUseAlegra()) {
    return NextResponse.json(
      { error: auth.user.locale === "es" ? "Las facturas aún no están configuradas." : "Invoices are not configured yet." },
      { status: 503 },
    );
  }

  const cooldownHit = await getRecentStudentSyncCooldownHit(
    studentId,
    STUDENT_SYNC_COOLDOWN_SECONDS,
  );

  if (cooldownHit) {
    return NextResponse.json(
      { error: auth.user.locale === "es" ? "Ya existe una sincronización reciente. Intenta nuevamente en unos segundos." : "A recent sync already exists. Try again in a few seconds." },
      { status: 429 },
    );
  }

  const run = await syncStudentInvoices(studentId, auth.user.id);
  return NextResponse.json({ run });
}
