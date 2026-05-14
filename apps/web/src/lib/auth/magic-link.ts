import "server-only";

import { createHash, randomBytes } from "crypto";
import { Role } from "@prisma/client";

import { db } from "@/lib/db";
import { normalizeLocale } from "@/lib/i18n/locales";

const MAGIC_LINK_PREFIX = "magic-link";
export const MAGIC_LINK_MAX_AGE_SECONDS = 15 * 60;

export function normalizeMagicLinkEmail(email: string) {
  return email.trim().toLowerCase();
}

function identifierForEmail(email: string) {
  return `${MAGIC_LINK_PREFIX}:${normalizeMagicLinkEmail(email)}`;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function buildMagicLinkUrl(input: { baseUrl: string; email: string; token: string }) {
  const url = new URL("/magic-link", input.baseUrl);
  url.searchParams.set("email", normalizeMagicLinkEmail(input.email));
  url.searchParams.set("token", input.token);
  return url.toString();
}

export async function createMagicLinkToken(email: string) {
  const normalizedEmail = normalizeMagicLinkEmail(email);
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + MAGIC_LINK_MAX_AGE_SECONDS * 1000);
  const identifier = identifierForEmail(normalizedEmail);

  // Security-sensitive: keep only the latest login link per email and store a hash, never the raw token.
  await db.verificationToken.deleteMany({ where: { identifier } });
  await db.verificationToken.create({
    data: {
      identifier,
      token: hashToken(token),
      expires,
    },
  });

  return { token, expires };
}

export async function consumeMagicLinkToken(input: { email: string; token: string }) {
  const email = normalizeMagicLinkEmail(input.email);
  const tokenHash = hashToken(input.token);
  const identifier = identifierForEmail(email);

  const storedToken = await db.verificationToken.findUnique({ where: { token: tokenHash } });
  if (!storedToken || storedToken.identifier !== identifier) return null;

  if (storedToken.expires < new Date()) {
    await db.verificationToken.deleteMany({ where: { token: tokenHash } });
    return null;
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user || (user.role !== Role.STUDENT && user.role !== Role.TEACHER)) {
    await db.verificationToken.deleteMany({ where: { token: tokenHash } });
    return null;
  }

  await db.verificationToken.deleteMany({ where: { token: tokenHash } });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    role: user.role,
    locale: normalizeLocale(user.locale),
    timezone: user.timezone,
  };
}
