import { Role } from "@prisma/client";
import { redirect } from "next/navigation";

import { requireViewer } from "@/features/auth/server";

export default async function AdminEntryPage() {
  await requireViewer([Role.ADMIN]);
  redirect("/admin/dashboard");
}
