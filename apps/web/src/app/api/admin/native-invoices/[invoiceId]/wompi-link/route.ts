import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { isWompiEnabled } from "@/lib/wompi/config";
import { ensureWompiPaymentLinkForInvoice } from "@/lib/wompi/service";

type Params = { params: Promise<{ invoiceId: string }> };

export const runtime = "nodejs";

export async function POST(_req: Request, { params }: Params) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  if (auth.user.role !== Role.ADMIN) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isWompiEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const { invoiceId } = await params;
    const invoice = await ensureWompiPaymentLinkForInvoice(invoiceId);
    return NextResponse.json({ invoice });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create Wompi payment link";
    const status = message === "INVOICE_NOT_FOUND" ? 404 : message.startsWith("WOMPI") ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
