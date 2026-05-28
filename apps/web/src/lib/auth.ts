import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { Role, UserLoginActivityStatus, UserLoginAuthMethod } from "@prisma/client";
import { compare } from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { consumeMagicLinkToken } from "@/lib/auth/magic-link";
import { recordLoginActivity } from "@/lib/auth/login-activity";
import { db } from "@/lib/db";
import { normalizeLocale } from "@/lib/i18n/locales";
import { getRequestLocale } from "@/lib/i18n/request";

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
      async authorize(credentials, request) {
        const email = credentials?.email?.toLowerCase().trim() ?? "";
        if (!email || !credentials?.password) {
          if (email) {
            await recordLoginActivity({
              status: UserLoginActivityStatus.FAILED,
              authMethod: UserLoginAuthMethod.CREDENTIALS,
              emailAttempted: email,
              failureReason: "MISSING_CREDENTIALS",
              headers: request?.headers,
            });
          }
          return null;
        }

        const user = await db.user.findUnique({ where: { email } });

        if (!user?.passwordHash) {
          await recordLoginActivity({
            status: UserLoginActivityStatus.FAILED,
            authMethod: UserLoginAuthMethod.CREDENTIALS,
            emailAttempted: email,
            userId: user?.id,
            roleSnapshot: user?.role,
            failureReason: "INVALID_CREDENTIALS",
            headers: request?.headers,
          });
          return null;
        }

        // Security-sensitive: compare hashed password server-side only.
        const isValid = await compare(credentials.password, user.passwordHash);
        if (!isValid) {
          await recordLoginActivity({
            status: UserLoginActivityStatus.FAILED,
            authMethod: UserLoginAuthMethod.CREDENTIALS,
            emailAttempted: email,
            userId: user.id,
            roleSnapshot: user.role,
            failureReason: "INVALID_CREDENTIALS",
            headers: request?.headers,
          });
          return null;
        }

        await recordLoginActivity({
          status: UserLoginActivityStatus.SUCCESS,
          authMethod: UserLoginAuthMethod.CREDENTIALS,
          emailAttempted: email,
          userId: user.id,
          roleSnapshot: user.role,
          headers: request?.headers,
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          locale: await getRequestLocale(user.locale),
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
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials.token) {
          if (credentials?.email) {
            await recordLoginActivity({
              status: UserLoginActivityStatus.FAILED,
              authMethod: UserLoginAuthMethod.MAGIC_LINK,
              emailAttempted: credentials.email,
              failureReason: "MISSING_MAGIC_LINK_TOKEN",
              headers: request?.headers,
            });
          }
          return null;
        }

        // Security-sensitive: this provider only accepts one-time magic links for student, parent, and teacher accounts.
        return consumeMagicLinkToken({
          email: credentials.email,
          token: credentials.token,
          headers: request?.headers,
        });
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.role = (user as { role: Role }).role;
        token.locale = normalizeLocale((user as { locale?: string }).locale);
        token.timezone = (user as { timezone: string }).timezone;
        token.authMethod = account?.provider === "magic-link" ? "magic-link" : "credentials";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role as Role) ?? Role.STUDENT;
        session.user.locale = normalizeLocale(token.locale);
        session.user.timezone = (token.timezone as string) ?? "America/New_York";
        session.user.authMethod = token.authMethod;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
