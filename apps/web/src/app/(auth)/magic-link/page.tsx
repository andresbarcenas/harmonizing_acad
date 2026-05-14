import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { BrandLogo } from "@/components/brand/logo";
import { MagicLinkCallback } from "@/components/auth/magic-link-callback";
import { Card } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { getCookieLocale } from "@/lib/i18n/request";
import { defaultRouteForRole } from "@/lib/rbac";

type PageProps = {
  searchParams?: Promise<{ email?: string; token?: string }>;
};

export default async function MagicLinkPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role) redirect(defaultRouteForRole(session.user.role));

  const locale = await getCookieLocale();
  const params = searchParams ? await searchParams : {};

  return (
    <div className="relative isolate min-h-screen overflow-hidden px-3 py-6 sm:px-4 md:px-6 md:py-12">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-xl flex-col items-center justify-center">
        <div className="rounded-[2rem] border border-white/70 bg-white/68 px-10 py-8 shadow-[var(--shadow-soft)] backdrop-blur-[16px]">
          <BrandLogo stacked className="justify-center" />
        </div>
        <Card className="mt-8 w-full rounded-[2rem] px-5 py-7 sm:px-7 sm:py-8 md:mt-10 md:px-8 md:py-9">
          <MagicLinkCallback email={params.email} token={params.token} locale={locale} />
        </Card>
      </div>
    </div>
  );
}
