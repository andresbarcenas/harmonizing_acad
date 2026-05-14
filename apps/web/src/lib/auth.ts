import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { Role } from "@prisma/client";
import { compare } from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { consumeMagicLinkToken } from "@/lib/auth/magic-link";
import { db } from "@/lib/db";
import { normalizeLocale } from "@/lib/i18n/locales";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  pages: {
    signIn: "/sign-in",
  },
  session: {
    // Security-sensitive: session tokens live in httpOnly cookies and are validated on the server.
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          return null;
        }

        const email = credentials.email.toLowerCase().trim();
        const user = await db.user.findUnique({ where: { email } });

        if (!user?.passwordHash) {
          return null;
        }

        // Security-sensitive: compare hashed password server-side only.
        const isValid = await compare(credentials.password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          locale: normalizeLocale(user.locale),
          timezone: user.timezone,
        };
      },
    }),
    CredentialsProvider({
      id: "magic-link",
      name: "Magic Link",
      credentials: {
        email: { label: "Email", type: "email" },
        token: { label: "Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.token) return null;

        // Security-sensitive: this provider only accepts one-time magic links for student/teacher accounts.
        return consumeMagicLinkToken({
          email: credentials.email,
          token: credentials.token,
        });
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: Role }).role;
        token.locale = normalizeLocale((user as { locale?: string }).locale);
        token.timezone = (user as { timezone: string }).timezone;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role as Role) ?? Role.STUDENT;
        session.user.locale = normalizeLocale(token.locale);
        session.user.timezone = (token.timezone as string) ?? "America/New_York";
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
