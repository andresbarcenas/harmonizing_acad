import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { assignCatalogItemToStudent, assertCanAssignCatalogToStudent, getRepertoireCatalogErrorMessage } from "@/lib/data/repertoire-catalog";
import { repertoireCatalogAssignSchema } from "@/lib/validators/repertoire-catalog";

type Params = { params: Promise<{ catalogItemId: string }> };

export async function POST(request: Request, { params }: Params) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const parsed = repertoireCatalogAssignSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });

  try {
    await assertCanAssignCatalogToStudent(auth.user, parsed.data.studentId);
    const { catalogItemId } = await params;
    const item = await assignCatalogItemToStudent({
      catalogItemId,
      studentId: parsed.data.studentId,
      teacherId: auth.user.role === Role.TEACHER ? auth.user.teacherProfile?.id : null,
      values: parsed.data,
    });
    return NextResponse.json({ item });
  } catch (error) {
    const catalogError = getRepertoireCatalogErrorMessage(error, auth.user.locale);
    if (catalogError) return NextResponse.json({ error: catalogError.message }, { status: catalogError.status });
    throw error;
  }
}
