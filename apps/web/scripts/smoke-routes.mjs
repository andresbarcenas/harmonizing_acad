#!/usr/bin/env node

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3010";

const routes = [
  "/",
  "/sign-in",
  "/forgot-password",
  "/student",
  "/dashboard",
  "/schedule",
  "/videos",
  "/messages",
  "/invoices",
  "/teacher",
  "/teacher/dashboard",
  "/teacher/requests",
  "/teacher/videos",
  "/admin",
  "/admin/dashboard",
  "/admin/students",
  "/admin/teachers",
  "/admin/assignments",
  "/admin/availability",
  "/admin/invoices",
  "/settings",
  "/notifications",
];

const failures = [];

for (const route of routes) {
  const url = new URL(route, baseUrl);
  try {
    const response = await fetch(url, { redirect: "manual" });
    const ok = response.status >= 200 && response.status < 400;
    const expectedRedirect = route !== "/sign-in" && [401, 403].includes(response.status);
    const passed = ok || expectedRedirect;
    console.log(`${passed ? "PASS" : "FAIL"} ${route} -> ${response.status}`);
    if (!passed) failures.push(`${route} returned ${response.status}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`FAIL ${route} -> ${message}`);
    failures.push(`${route} failed: ${message}`);
  }
}

if (failures.length) {
  console.error("\nSmoke route check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`\nSmoke route check passed for ${routes.length} routes at ${baseUrl}.`);
