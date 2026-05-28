import "server-only";

import { Role, UserLoginActivityStatus, UserLoginAuthMethod, UserLoginDeviceType } from "@prisma/client";

import { db } from "@/lib/db";

type HeaderBag = Headers | Record<string, string | string[] | undefined> | undefined;

type LoginActivityInput = {
  status: UserLoginActivityStatus;
  authMethod: UserLoginAuthMethod;
  emailAttempted: string;
  userId?: string | null;
  roleSnapshot?: Role | null;
  failureReason?: string | null;
  headers?: HeaderBag;
};

function readHeader(headers: HeaderBag, name: string) {
  if (!headers) return null;
  if (headers instanceof Headers) return headers.get(name);
  const value = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function clientIp(headers: HeaderBag) {
  const forwarded = readHeader(headers, "x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  return readHeader(headers, "x-real-ip");
}

function browser(userAgent: string) {
  const checks: Array<[string, RegExp]> = [
    ["Edge", /\bEdg\/([\d.]+)/],
    ["Chrome iOS", /\bCriOS\/([\d.]+)/],
    ["Chrome", /\bChrome\/([\d.]+)/],
    ["Firefox", /\bFirefox\/([\d.]+)/],
    ["Safari", /\bVersion\/([\d.]+).*\bSafari\//],
    ["Samsung Internet", /\bSamsungBrowser\/([\d.]+)/],
  ];
  for (const [name, pattern] of checks) {
    const match = pattern.exec(userAgent);
    if (match) return { browserName: name, browserVersion: match[1] ?? null };
  }
  return { browserName: null, browserVersion: null };
}

function osName(userAgent: string) {
  if (/Windows NT/i.test(userAgent)) return "Windows";
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "iOS";
  if (/Android/i.test(userAgent)) return "Android";
  if (/Mac OS X|Macintosh/i.test(userAgent)) return "macOS";
  if (/Linux/i.test(userAgent)) return "Linux";
  return null;
}

function deviceType(userAgent: string) {
  if (!userAgent) return UserLoginDeviceType.UNKNOWN;
  if (/bot|crawler|spider|crawling|slurp|bingpreview/i.test(userAgent)) return UserLoginDeviceType.BOT;
  if (/iPad|Tablet|Kindle|Silk|PlayBook/i.test(userAgent)) return UserLoginDeviceType.TABLET;
  if (/Android/i.test(userAgent) && !/Mobile/i.test(userAgent)) return UserLoginDeviceType.TABLET;
  if (/Mobi|iPhone|iPod|Android.*Mobile/i.test(userAgent)) return UserLoginDeviceType.MOBILE;
  return UserLoginDeviceType.DESKTOP;
}

function normalizeCountry(value: string | null) {
  const normalized = value?.trim().toUpperCase();
  return normalized && /^[A-Z]{2}$/.test(normalized) ? normalized : null;
}

export async function recordLoginActivity(input: LoginActivityInput) {
  try {
    const userAgent = readHeader(input.headers, "user-agent")?.slice(0, 1000) ?? null;
    const parsedBrowser = browser(userAgent ?? "");

    await db.userLoginActivity.create({
      data: {
        status: input.status,
        authMethod: input.authMethod,
        userId: input.userId ?? undefined,
        emailAttempted: input.emailAttempted.toLowerCase().trim().slice(0, 180) || "unknown",
        roleSnapshot: input.roleSnapshot ?? undefined,
        failureReason: input.failureReason?.slice(0, 120) ?? undefined,
        ipAddress: clientIp(input.headers)?.slice(0, 80) ?? undefined,
        countryCode: normalizeCountry(readHeader(input.headers, "x-vercel-ip-country")) ?? undefined,
        userAgent,
        deviceType: deviceType(userAgent ?? ""),
        browserName: parsedBrowser.browserName,
        browserVersion: parsedBrowser.browserVersion,
        osName: osName(userAgent ?? ""),
      },
    });
  } catch (error) {
    console.error("Login activity audit failed", error);
  }
}
