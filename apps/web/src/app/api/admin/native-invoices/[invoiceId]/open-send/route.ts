import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { openAndSendNativeInvoice } from "@/lib/native-invoices/actions";

type Params = { params: Promise<{ invoiceId: string }> };

export const runtime = "nodejs";

export async function POST(_req: Request, { params }: Params) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  if (auth.user.role !== Role.ADMIN) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { invoiceId } = await params;
    const result = await openAndSendNativeInvoice(invoiceId, auth.user.id);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not open and send invoice";
    return NextResponse.json({ error: message }, { status: message === "INVOICE_NOT_FOUND" ? 404 : 400 });
  }
}
