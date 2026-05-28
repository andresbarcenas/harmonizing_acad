import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { createNativeInvoicePayment } from "@/lib/native-invoices/ledger";
import { createNativeInvoicePaymentSchema } from "@/lib/validators/native-invoices";

type Params = { params: Promise<{ invoiceId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  if (auth.user.role !== Role.ADMIN) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { invoiceId } = await params;
  const payments = await db.nativeInvoicePayment.findMany({
    where: { invoiceId },
    include: { attachments: { orderBy: { createdAt: "desc" } }, createdBy: { select: { name: true } }, voidedBy: { select: { name: true } } },
    orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ payments });
}

export async function POST(req: Request, { params }: Params) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  if (auth.user.role !== Role.ADMIN) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = createNativeInvoicePaymentSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const { invoiceId } = await params;
    const payment = await createNativeInvoicePayment({ ...parsed.data, invoiceId, adminUserId: auth.user.id });
    return NextResponse.json({ payment });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not add payment";
    const status = message === "INVOICE_NOT_FOUND" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
