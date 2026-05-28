import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { createNativeInvoice, getAdminNativeInvoiceWorkspace } from "@/lib/native-invoices/service";
import { createNativeInvoiceSchema } from "@/lib/validators/native-invoices";

export async function GET() {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  if (auth.user.role !== Role.ADMIN) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json(await getAdminNativeInvoiceWorkspace());
}

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  if (auth.user.role !== Role.ADMIN) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = createNativeInvoiceSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const invoice = await createNativeInvoice(parsed.data, auth.user.id);
    return NextResponse.json({ invoice });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create invoice";
    return NextResponse.json({ error: message }, { status: message === "STUDENT_NOT_FOUND" ? 404 : 400 });
  }
}
