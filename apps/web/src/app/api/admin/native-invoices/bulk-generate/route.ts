import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { bulkGenerateNativeInvoiceDrafts } from "@/lib/native-invoices/service";
import { nativeInvoiceBulkGenerateSchema } from "@/lib/validators/native-invoices";

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  if (auth.user.role !== Role.ADMIN) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = nativeInvoiceBulkGenerateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const result = await bulkGenerateNativeInvoiceDrafts(parsed.data.periodStart, auth.user.id);
  return NextResponse.json(result);
}
