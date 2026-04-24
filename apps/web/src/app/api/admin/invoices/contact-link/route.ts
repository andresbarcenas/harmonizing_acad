import { NextResponse } from "next/server";
import { InvoiceContactLinkStrategy, Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { invoiceContactLinkSchema } from "@/lib/validators/invoices";

export async function PATCH(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  if (auth.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = invoiceContactLinkSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const student = await db.studentProfile.findUnique({
    where: { id: parsed.data.studentId },
    select: { id: true },
  });

  if (!student) {
    return NextResponse.json({ error: "Estudiante no encontrado." }, { status: 404 });
  }

  const link = await db.invoiceContactLink.upsert({
    where: { studentId: parsed.data.studentId },
    update: {
      alegraContactId: parsed.data.alegraContactId,
      strategy: parsed.data.alegraContactId ? InvoiceContactLinkStrategy.MANUAL : InvoiceContactLinkStrategy.EMAIL_AUTO,
      lastResolvedAt: new Date(),
      lastError: null,
    },
    create: {
      studentId: parsed.data.studentId,
      alegraContactId: parsed.data.alegraContactId,
      strategy: parsed.data.alegraContactId ? InvoiceContactLinkStrategy.MANUAL : InvoiceContactLinkStrategy.EMAIL_AUTO,
      lastResolvedAt: new Date(),
      lastError: null,
    },
  });

  return NextResponse.json({ link });
}
