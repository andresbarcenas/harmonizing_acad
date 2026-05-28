import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { setNativeInvoiceStatus } from "@/lib/native-invoices/service";
import { nativeInvoiceStatusSchema } from "@/lib/validators/native-invoices";

type Params = { params: Promise<{ invoiceId: string }> };

export async function POST(req: Request, { params }: Params) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  if (auth.user.role !== Role.ADMIN) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = nativeInvoiceStatusSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const { invoiceId } = await params;
    const invoice = await setNativeInvoiceStatus(invoiceId, parsed.data.status, auth.user.id);
    return NextResponse.json({ invoice });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update status";
    return NextResponse.json({ error: message }, { status: message === "INVOICE_NOT_FOUND" ? 404 : 400 });
  }
}
