import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { createOrLinkGuardian, GuardianLinkError } from "@/lib/admin/guardians";
import { db } from "@/lib/db";
import { linkGuardianSchema, unlinkGuardianSchema } from "@/lib/validators/admin";

function baseUrlFromRequest(request: Request) {
  return process.env.NEXTAUTH_URL?.trim() || new URL(request.url).origin;
}

export async function GET() {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  if (auth.user.role !== Role.ADMIN) return NextResponse.json({ error: auth.user.locale === "es" ? "No autorizado." : "Forbidden." }, { status: 403 });

  const guardians = await db.parentGuardianProfile.findMany({
    include: {
      user: true,
      students: { include: { student: { include: { user: true } } }, orderBy: [{ primaryContact: "desc" }, { createdAt: "asc" }] },
    },
    orderBy: { user: { name: "asc" } },
  });

  return NextResponse.json({ guardians });
}

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  if (auth.user.role !== Role.ADMIN) return NextResponse.json({ error: auth.user.locale === "es" ? "No autorizado." : "Forbidden." }, { status: 403 });

  const parsed = linkGuardianSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const result = await createOrLinkGuardian({
      ...parsed.data,
      actorLocale: auth.user.locale,
      baseUrl: baseUrlFromRequest(req),
    });
    return NextResponse.json({
      guardian: {
        userId: result.parentUser.id,
        parentId: result.parentProfile.id,
        linkId: result.link.id,
        name: result.parentUser.name,
        email: result.parentUser.email,
      },
      welcomeEmail: {
        ...result.welcomeEmail,
        previewUrl: process.env.NODE_ENV !== "production" ? result.previewUrl : undefined,
      },
    });
  } catch (error) {
    if (error instanceof GuardianLinkError) {
      const message = error.code === "EMAIL_IN_USE"
        ? auth.user.locale === "es" ? "Ese email ya pertenece a otra cuenta." : "That email belongs to another account."
        : error.code === "STUDENT_NOT_FOUND"
          ? auth.user.locale === "es" ? "Estudiante no encontrado." : "Student not found."
          : auth.user.locale === "es" ? "No se pudo vincular el acudiente." : "Could not link guardian.";
      return NextResponse.json({ error: message }, { status: error.status });
    }
    return NextResponse.json({ error: auth.user.locale === "es" ? "No se pudo vincular el acudiente." : "Could not link guardian." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  if (auth.user.role !== Role.ADMIN) return NextResponse.json({ error: auth.user.locale === "es" ? "No autorizado." : "Forbidden." }, { status: 403 });

  const parsed = unlinkGuardianSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await db.parentStudentLink.delete({ where: { id: parsed.data.linkId } });
  return NextResponse.json({ ok: true });
}
