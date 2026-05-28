import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { voidNativeInvoicePayment } from "@/lib/native-invoices/ledger";
import { voidNativeInvoicePaymentSchema } from "@/lib/validators/native-invoices";

type Params = { params: Promise<{ invoiceId: string; paymentId: string }> };

export async function POST(req: Request, { params }: Params) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  if (auth.user.role !== Role.ADMIN) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = voidNativeInvoicePaymentSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const { invoiceId, paymentId } = await params;
    const paymentExists = await db.nativeInvoicePayment.count({ where: { id: paymentId, invoiceId } });
    if (!paymentExists) return NextResponse.json({ error: "PAYMENT_NOT_FOUND" }, { status: 404 });
    const payment = await voidNativeInvoicePayment({ paymentId, adminUserId: auth.user.id, reason: parsed.data.reason });
    return NextResponse.json({ payment });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not void payment";
    const status = message === "PAYMENT_NOT_FOUND" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
