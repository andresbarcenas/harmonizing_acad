import type { DefaultSession } from "next-auth";
import type { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      timezone: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    timezone: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
    timezone?: string;
  }
}
