import { Role } from "@prisma/client";
import { redirect } from "next/navigation";

import { requireViewer } from "@/features/auth/server";

export default async function ParentEntryPage() {
  await requireViewer([Role.PARENT]);
  redirect("/parent/dashboard");
}
