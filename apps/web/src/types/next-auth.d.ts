import type { DefaultSession } from "next-auth";
import type { Role } from "@prisma/client";
import type { AppLocale } from "@/lib/i18n/locales";

export type AuthMethod = "credentials" | "magic-link";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      locale: AppLocale;
      timezone: string;
      authMethod?: AuthMethod;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    locale: AppLocale;
    timezone: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
    locale?: AppLocale;
    timezone?: string;
    authMethod?: AuthMethod;
  }
}
