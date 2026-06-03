import "server-only";

import crypto from "crypto";

import { getWompiEventsSecret } from "@/lib/wompi/config";

export type WompiTransactionStatus = "PENDING" | "APPROVED" | "DECLINED" | "VOIDED" | "ERROR" | string;

export type WompiTransactionPayload = {
  id: string;
  amount_in_cents: number;
  reference: string;
  customer_email?: string | null;
  currency: string;
  payment_method_type?: string | null;
  status: WompiTransactionStatus;
  payment_link_id?: string | null;
  finalized_at?: string | null;
  created_at?: string | null;
};

export type WompiWebhookPayload = {
  event: string;
  data?: {
    transaction?: WompiTransactionPayload;
    [key: string]: unknown;
  };
  environment?: string;
  signature?: {
    properties?: string[];
    checksum?: string;
  };
  timestamp?: number;
  sent_at?: string;
};

export function verifyWompiWebhookChecksum(payload: WompiWebhookPayload, headerChecksum?: string | null) {
  const received = (headerChecksum || payload.signature?.checksum || "").trim();
  const secret = getWompiEventsSecret();
  if (!received || !secret || !payload.signature?.properties?.length || typeof payload.timestamp !== "number") {
    return false;
  }

  const values = payload.signature.properties.map((propertyPath) => {
    const value = getDataPath(payload.data ?? {}, propertyPath);
    return value == null ? "" : String(value);
  });
  const checksumInput = `${values.join("")}${payload.timestamp}${secret}`;
  const expected = crypto.createHash("sha256").update(checksumInput).digest("hex");
  return timingSafeEqualHex(expected, received);
}

function getDataPath(source: Record<string, unknown>, path: string) {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (current && typeof current === "object" && segment in current) {
      return (current as Record<string, unknown>)[segment];
    }
    return undefined;
  }, source);
}

function timingSafeEqualHex(expected: string, received: string) {
  const normalizedExpected = expected.toUpperCase();
  const normalizedReceived = received.toUpperCase();
  const expectedBuffer = Buffer.from(normalizedExpected, "utf8");
  const receivedBuffer = Buffer.from(normalizedReceived, "utf8");
  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}
