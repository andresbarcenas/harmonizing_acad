import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import {
  ALLOWED_PAYMENT_RECEIPT_MIME_TYPES,
  MAX_PAYMENT_RECEIPT_SIZE_BYTES,
  isAllowedPaymentReceiptType,
  storeNativeInvoicePaymentReceipt,
} from "@/lib/storage";

type Params = { params: Promise<{ invoiceId: string; paymentId: string }> };

export const runtime = "nodejs";

export async function POST(req: Request, { params }: Params) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  if (auth.user.role !== Role.ADMIN) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { invoiceId, paymentId } = await params;
  const payment = await db.nativeInvoicePayment.findFirst({ where: { id: paymentId, invoiceId }, select: { id: true } });
  if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

  const formData = await req.formData();
  const files = [...formData.getAll("files"), ...formData.getAll("file")].filter((value): value is File => value instanceof File && value.size > 0);
  if (!files.length) return NextResponse.json({ error: "Select at least one receipt file." }, { status: 400 });

  for (const file of files) {
    if (!isAllowedPaymentReceiptType(file.type)) {
      return NextResponse.json({ error: `Unsupported format. Use PDF or image (${ALLOWED_PAYMENT_RECEIPT_MIME_TYPES.join(", ")}).` }, { status: 400 });
    }
    if (file.size > MAX_PAYMENT_RECEIPT_SIZE_BYTES) {
      return NextResponse.json({ error: "A receipt file exceeds the 20MB limit." }, { status: 400 });
    }
  }

  const attachments = [];
  for (const file of files) {
    const stored = await storeNativeInvoicePaymentReceipt(file, payment.id);
    attachments.push(await db.nativeInvoicePaymentAttachment.create({
      data: {
        paymentId: payment.id,
        uploadedByUserId: auth.user.id,
        storageKey: stored.storageKey,
        originalName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      },
    }));
  }

  return NextResponse.json({ attachments });
}
