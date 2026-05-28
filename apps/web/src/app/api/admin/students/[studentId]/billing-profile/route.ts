import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { getOrCreateStudentBillingProfile, updateStudentBillingProfile } from "@/lib/native-invoices/service";
import { studentBillingProfileSchema } from "@/lib/validators/native-invoices";

type Params = { params: Promise<{ studentId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  if (auth.user.role !== Role.ADMIN) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { studentId } = await params;
  const profile = await getOrCreateStudentBillingProfile(studentId);
  return NextResponse.json({ profile });
}

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  if (auth.user.role !== Role.ADMIN) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = studentBillingProfileSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { studentId } = await params;
  const profile = await updateStudentBillingProfile(studentId, parsed.data);
  return NextResponse.json({ profile });
}
