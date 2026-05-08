#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const crypto = require("node:crypto");
const { hash } = require("bcryptjs");
const { PrismaClient, Role } = require("@prisma/client");

const DEFAULT_ADMIN_EMAIL = "admin@harmonizing.app";
const DEFAULT_ADMIN_NAME = "Harmonizing Admin";
const DEFAULT_TIMEZONE = "America/New_York";
const DEFAULT_PLAN_ID = "plan_harmonizing_90";

function readTrimmedEnv(name, fallback) {
  const value = process.env[name]?.trim();
  return value || fallback;
}

function readBooleanEnv(name) {
  const value = process.env[name]?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

function normalizeEmail(value) {
  const email = value.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    throw new Error(`Invalid ADMIN_EMAIL: ${value}`);
  }
  return email;
}

function randomChar(chars) {
  return chars[crypto.randomInt(0, chars.length)];
}

function shuffle(chars) {
  for (let index = chars.length - 1; index > 0; index -= 1) {
    const swapIndex = crypto.randomInt(0, index + 1);
    [chars[index], chars[swapIndex]] = [chars[swapIndex], chars[index]];
  }
  return chars.join("");
}

function generatePassword() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%^&*()-_=+";
  const all = `${upper}${lower}${digits}${symbols}`;
  const chars = [randomChar(upper), randomChar(lower), randomChar(digits), randomChar(symbols)];

  while (chars.length < 28) {
    chars.push(randomChar(all));
  }

  return shuffle(chars);
}

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL is required. Run through `vercel env run -e production -- ...` or set DATABASE_URL directly.");
  }

  const prisma = new PrismaClient();
  const adminEmail = normalizeEmail(readTrimmedEnv("ADMIN_EMAIL", DEFAULT_ADMIN_EMAIL));
  const adminName = readTrimmedEnv("ADMIN_NAME", DEFAULT_ADMIN_NAME);
  const adminTimezone = readTrimmedEnv("ADMIN_TIMEZONE", DEFAULT_TIMEZONE);
  const resetPassword = readBooleanEnv("RESET_ADMIN_PASSWORD");
  const providedPassword = process.env.ADMIN_PASSWORD;

  try {
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail },
      select: { id: true, passwordHash: true },
    });

    const needsPassword = !existingAdmin || resetPassword || !existingAdmin.passwordHash;
    const generatedPassword = needsPassword && !providedPassword ? generatePassword() : null;
    const nextPassword = needsPassword ? providedPassword || generatedPassword : null;
    const passwordHash = nextPassword ? await hash(nextPassword, 12) : null;

    const adminUser = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        name: adminName,
        role: Role.ADMIN,
        locale: "en",
        timezone: adminTimezone,
        ...(passwordHash ? { passwordHash } : {}),
      },
      create: {
        name: adminName,
        email: adminEmail,
        passwordHash,
        role: Role.ADMIN,
        locale: "en",
        timezone: adminTimezone,
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    const plan = await prisma.subscriptionPlan.upsert({
      where: { id: DEFAULT_PLAN_ID },
      update: { active: true },
      create: {
        id: DEFAULT_PLAN_ID,
        name: "Plan Premium 1:1",
        priceUsd: 90,
        monthlyClassCount: 4,
        description: "Incluye 4 clases personalizadas al mes",
        active: true,
      },
      select: {
        id: true,
        name: true,
        active: true,
      },
    });

    console.log("Production bootstrap complete.");
    console.log(`Admin email: ${adminUser.email}`);
    console.log(`Admin role: ${adminUser.role}`);
    console.log(`Default plan: ${plan.id} (${plan.active ? "active" : "inactive"})`);

    if (generatedPassword) {
      console.log("");
      console.log("Temporary admin password:");
      console.log(generatedPassword);
      console.log("");
      console.log("Store this password privately now. It will not be shown again unless you reset it.");
    } else if (needsPassword) {
      console.log("Admin password was set from ADMIN_PASSWORD and was not printed.");
    } else {
      console.log("Existing admin password was left unchanged. Set RESET_ADMIN_PASSWORD=true to rotate it.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
