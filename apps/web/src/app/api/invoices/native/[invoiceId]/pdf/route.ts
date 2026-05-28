import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { ensureNativeInvoicePdf } from "@/lib/native-invoices/actions";
import { canViewerAccessNativeInvoice } from "@/lib/native-invoices/service";

type Params = { params: Promise<{ invoiceId: string }> };

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const { invoiceId } = await params;
  const access = await canViewerAccessNativeInvoice({
    role: auth.user.role,
    studentProfileId: auth.user.studentProfile?.id,
    parentGuardianProfileId: auth.user.parentGuardianProfile?.id,
  }, invoiceId);
  if (!access.invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  if (!access.allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { invoice, pdfBytes } = await ensureNativeInvoicePdf(invoiceId);
  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="harmonizing-invoice-${invoice.invoiceNumber}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
