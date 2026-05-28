import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { createNextMonthInvoice } from "@/lib/native-invoices/service";

type Params = { params: Promise<{ invoiceId: string }> };

export async function POST(_req: Request, { params }: Params) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  if (auth.user.role !== Role.ADMIN) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { invoiceId } = await params;
    const invoice = await createNextMonthInvoice(invoiceId, auth.user.id);
    return NextResponse.json({ invoice });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create next invoice";
    return NextResponse.json({ error: message }, { status: message === "INVOICE_NOT_FOUND" ? 404 : 400 });
  }
}
