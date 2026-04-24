import { Role } from "@prisma/client";
import { redirect } from "next/navigation";

import { requireViewer } from "@/features/auth/server";

export default async function TeacherEntryPage() {
  await requireViewer([Role.TEACHER]);
  redirect("/teacher/dashboard");
}
