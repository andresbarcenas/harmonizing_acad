import "server-only";

import { getWompiApiBaseUrl, getWompiCheckoutBaseUrl, getWompiPrivateKey } from "@/lib/wompi/config";

type WompiPaymentLinkPayload = {
  name: string;
  description: string;
  single_use: boolean;
  collect_shipping: boolean;
  currency: "COP";
  amount_in_cents: number;
  expires_at?: string;
  redirect_url?: string;
  sku?: string;
};

type WompiPaymentLink = {
  id: string;
  name: string;
  description: string;
  single_use: boolean;
  collect_shipping: boolean;
  currency: string;
  amount_in_cents: number | null;
  sku: string | null;
  expires_at: string | null;
  redirect_url: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type WompiApiResponse<T> = {
  data: T;
  meta?: unknown;
};

export class WompiApiError extends Error {
  constructor(message: string, public status?: number, public payload?: unknown) {
    super(message);
    this.name = "WompiApiError";
  }
}

async function wompiFetch<T>(path: string, init: RequestInit = {}) {
  const privateKey = getWompiPrivateKey();
  if (!privateKey) throw new WompiApiError("WOMPI_PRIVATE_KEY missing");

  const response = await fetch(`${getWompiApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "Authorization": `Bearer ${privateKey}`,
      ...(init.headers ?? {}),
    },
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof payload?.error?.message === "string"
      ? payload.error.message
      : typeof payload?.message === "string"
        ? payload.message
        : `Wompi API request failed with status ${response.status}`;
    throw new WompiApiError(message, response.status, payload);
  }

  return payload as WompiApiResponse<T>;
}

export async function createWompiPaymentLink(payload: WompiPaymentLinkPayload) {
  const response = await wompiFetch<WompiPaymentLink>("/payment_links", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return {
    link: response.data,
    checkoutUrl: `${getWompiCheckoutBaseUrl()}/${response.data.id}`,
    raw: response,
  };
}

export async function getWompiPaymentLink(paymentLinkId: string) {
  const response = await wompiFetch<WompiPaymentLink>(`/payment_links/${encodeURIComponent(paymentLinkId)}`, {
    method: "GET",
  });
  return response.data;
}
