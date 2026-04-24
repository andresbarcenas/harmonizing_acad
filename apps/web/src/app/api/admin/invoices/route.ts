import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { getAdminInvoicesOverview } from "@/features/invoices/data";
import { requireApiUser } from "@/lib/api-auth";
import { syncAllStudentsInvoices, syncStudentInvoices } from "@/lib/invoices/sync";
import { adminInvoiceSyncSchema } from "@/lib/validators/invoices";

export async function GET() {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  if (auth.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await getAdminInvoicesOverview();
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  if (auth.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = adminInvoiceSyncSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const run = parsed.data.studentId
    ? await syncStudentInvoices(parsed.data.studentId, auth.user.id)
    : await syncAllStudentsInvoices(auth.user.id);

  return NextResponse.json({ run });
}
