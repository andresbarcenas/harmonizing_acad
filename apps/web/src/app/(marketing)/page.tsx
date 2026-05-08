import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { defaultRouteForRole } from "@/lib/rbac";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.role) {
    redirect("/sign-in");
  }

  redirect(defaultRouteForRole(session.user.role));
}
