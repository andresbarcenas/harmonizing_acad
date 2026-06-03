import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { createManualClassCreditAdjustment, getStudentClassCreditSummary } from "@/lib/native-invoices/ledger";
import { classCreditAdjustmentSchema } from "@/lib/validators/native-invoices";

type Params = { params: Promise<{ studentId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  if (auth.user.role !== Role.ADMIN) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { studentId } = await params;
  const student = await db.studentProfile.findUnique({ where: { id: studentId }, select: { id: true } });
  if (!student) return NextResponse.json({ error: "Student not found." }, { status: 404 });
  return NextResponse.json(await getStudentClassCreditSummary(studentId, 30));
}

export async function POST(req: Request, { params }: Params) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  if (auth.user.role !== Role.ADMIN) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = classCreditAdjustmentSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid credit adjustment." }, { status: 400 });

  const { studentId } = await params;
  const student = await db.studentProfile.findUnique({ where: { id: studentId }, select: { id: true } });
  if (!student) return NextResponse.json({ error: "Student not found." }, { status: 404 });
  const entry = await createManualClassCreditAdjustment({ ...parsed.data, studentId, adminUserId: auth.user.id });
  return NextResponse.json({ entry });
}
