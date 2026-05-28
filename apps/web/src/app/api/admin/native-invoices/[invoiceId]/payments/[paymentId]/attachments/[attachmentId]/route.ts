import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { deleteProtectedMedia } from "@/lib/storage";

type Params = { params: Promise<{ invoiceId: string; paymentId: string; attachmentId: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  if (auth.user.role !== Role.ADMIN) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { invoiceId, paymentId, attachmentId } = await params;
  const attachment = await db.nativeInvoicePaymentAttachment.findFirst({
    where: { id: attachmentId, paymentId, payment: { invoiceId } },
  });
  if (!attachment) return NextResponse.json({ error: "Attachment not found" }, { status: 404 });

  await db.nativeInvoicePaymentAttachment.delete({ where: { id: attachment.id } });
  await deleteProtectedMedia(attachment.storageKey, "payment-receipt");
  return NextResponse.json({ ok: true });
}
