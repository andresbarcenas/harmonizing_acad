import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { updateNativeInvoice } from "@/lib/native-invoices/service";
import { updateNativeInvoiceSchema } from "@/lib/validators/native-invoices";

type Params = { params: Promise<{ invoiceId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  if (auth.user.role !== Role.ADMIN) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = updateNativeInvoiceSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const { invoiceId } = await params;
    const invoice = await updateNativeInvoice(invoiceId, parsed.data, auth.user.id);
    return NextResponse.json({ invoice });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update invoice";
    return NextResponse.json({ error: message }, { status: message === "INVOICE_NOT_FOUND" ? 404 : 400 });
  }
}
