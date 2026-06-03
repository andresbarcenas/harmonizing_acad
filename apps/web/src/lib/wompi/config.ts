import "server-only";

export type WompiEnvironment = "sandbox" | "production";

export const WOMPI_PROVIDER = "WOMPI";

export function isWompiEnabled() {
  return process.env.WOMPI_PAYMENTS_ENABLED === "true";
}

export function getWompiEnvironment(): WompiEnvironment {
  return process.env.WOMPI_ENV === "production" ? "production" : "sandbox";
}

export function getWompiApiBaseUrl() {
  const configured = process.env.WOMPI_API_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return getWompiEnvironment() === "production" ? "https://production.wompi.co/v1" : "https://sandbox.wompi.co/v1";
}

export function getWompiCheckoutBaseUrl() {
  return (process.env.WOMPI_CHECKOUT_BASE_URL?.trim() || "https://checkout.wompi.co/l").replace(/\/$/, "");
}

export function getWompiPrivateKey() {
  return process.env.WOMPI_PRIVATE_KEY?.trim() || "";
}

export function getWompiEventsSecret() {
  return process.env.WOMPI_EVENTS_SECRET?.trim() || "";
}

export function getAppBaseUrl() {
  const configured = process.env.WOMPI_APP_BASE_URL?.trim() || process.env.NEXTAUTH_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (process.env.NODE_ENV !== "production") return "http://localhost:3010";
  return "";
}

export function getWompiConfigurationStatus() {
  const enabled = isWompiEnabled();
  const missing: string[] = [];
  const environment = getWompiEnvironment();
  const privateKey = getWompiPrivateKey();
  const eventsSecret = getWompiEventsSecret();
  if (!isLikelyWompiPrivateKey(privateKey, environment)) missing.push("WOMPI_PRIVATE_KEY");
  if (!isLikelyWompiEventsSecret(eventsSecret, environment)) missing.push("WOMPI_EVENTS_SECRET");
  if (!getAppBaseUrl()) missing.push("WOMPI_APP_BASE_URL or NEXTAUTH_URL");

  const appBaseUrl = getAppBaseUrl();
  return {
    enabled,
    configured: enabled && missing.length === 0,
    environment,
    apiBaseUrl: getWompiApiBaseUrl(),
    checkoutBaseUrl: getWompiCheckoutBaseUrl(),
    webhookUrl: appBaseUrl ? `${appBaseUrl}/api/payments/wompi/webhook` : "",
    returnUrl: appBaseUrl ? `${appBaseUrl}/api/payments/wompi/return` : "",
    missing,
  };
}

function isLikelyWompiPrivateKey(value: string, environment: WompiEnvironment) {
  const expectedPrefix = environment === "production" ? "prv_prod_" : "prv_test_";
  return isLikelyRealSecret(value, expectedPrefix);
}

function isLikelyWompiEventsSecret(value: string, environment: WompiEnvironment) {
  const expectedPrefix = environment === "production" ? "prod_events_" : "test_events_";
  return isLikelyRealSecret(value, expectedPrefix);
}

function isLikelyRealSecret(value: string, expectedPrefix: string) {
  if (!value.startsWith(expectedPrefix)) return false;
  if (value.length < expectedPrefix.length + 12) return false;
  const lower = value.toLowerCase();
  return !lower.includes("...") && !lower.includes("replace") && !lower.includes("real_") && !lower.includes("your_");
}
