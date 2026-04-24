const DEFAULT_ALEGRA_BASE_URL = "https://api.alegra.com/api/v1";

export type AlegraErrorKind = "auth" | "rate_limit" | "network" | "mapping" | "unknown";

export class AlegraApiError extends Error {
  kind: AlegraErrorKind;
  status?: number;

  constructor(kind: AlegraErrorKind, message: string, status?: number) {
    super(message);
    this.kind = kind;
    this.status = status;
  }
}

type AlegraConfig = {
  baseUrl: string;
  email: string;
  token: string;
};

function getAlegraConfig(): AlegraConfig {
  const baseUrl = (process.env.ALEGRA_API_BASE_URL || DEFAULT_ALEGRA_BASE_URL).replace(/\/$/, "");
  const email = process.env.ALEGRA_API_EMAIL?.trim() ?? "";
  const token = process.env.ALEGRA_API_TOKEN?.trim() ?? "";

  if (!email || !token) {
    throw new AlegraApiError("auth", "Alegra no está configurado. Revisa ALEGRA_API_EMAIL y ALEGRA_API_TOKEN.");
  }

  return { baseUrl, email, token };
}

function parseJsonSafely(value: string) {
  if (!value) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function toArray(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.filter((item): item is Record<string, unknown> => !!item && typeof item === "object");
  }

  if (!payload || typeof payload !== "object") return [];

  const objectPayload = payload as Record<string, unknown>;
  const candidates = [objectPayload.data, objectPayload.results, objectPayload.items];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter((item): item is Record<string, unknown> => !!item && typeof item === "object");
    }
  }

  return [objectPayload];
}

function readString(source: Record<string, unknown>, ...paths: string[]): string | undefined {
  for (const path of paths) {
    const parts = path.split(".");
    let current: unknown = source;
    for (const part of parts) {
      if (!current || typeof current !== "object") {
        current = undefined;
        break;
      }
      current = (current as Record<string, unknown>)[part];
    }

    if (typeof current === "string" && current.trim()) {
      return current.trim();
    }

    if (typeof current === "number") {
      return String(current);
    }
  }

  return undefined;
}

function contactEmails(contact: Record<string, unknown>): string[] {
  const primary = readString(contact, "email", "emailAddress", "email1");
  const emails = new Set<string>();
  if (primary) emails.add(primary.toLowerCase());

  const secondary = contact.emails;
  if (Array.isArray(secondary)) {
    for (const item of secondary) {
      if (typeof item === "string" && item.trim()) emails.add(item.toLowerCase());
      if (item && typeof item === "object") {
        const value = readString(item as Record<string, unknown>, "email", "value");
        if (value) emails.add(value.toLowerCase());
      }
    }
  }

  return Array.from(emails);
}

async function requestAlegra(path: string, init?: RequestInit) {
  const config = getAlegraConfig();
  const basic = Buffer.from(`${config.email}:${config.token}`).toString("base64");

  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${basic}`,
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
  } catch (error) {
    throw new AlegraApiError("network", error instanceof Error ? error.message : "Error de red al consultar Alegra.");
  }

  const text = await response.text();
  const payload = parseJsonSafely(text);

  if (!response.ok) {
    const payloadMessage =
      payload && typeof payload === "object" ? (payload as Record<string, unknown>).message : undefined;
    const message =
      typeof payloadMessage === "string" && payloadMessage.trim()
        ? payloadMessage
        : `Alegra respondió ${response.status}.`;

    if (response.status === 401 || response.status === 403) {
      throw new AlegraApiError("auth", message, response.status);
    }

    if (response.status === 429) {
      throw new AlegraApiError("rate_limit", message, response.status);
    }

    throw new AlegraApiError("unknown", message, response.status);
  }

  return payload;
}

export type AlegraContact = {
  id: string;
  email?: string;
  name?: string;
  raw: Record<string, unknown>;
};

export type AlegraInvoiceRecord = Record<string, unknown>;

export const alegraClient = {
  async findContactByEmail(email: string): Promise<AlegraContact | null> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return null;

    const endpoints = [
      `/contacts?email=${encodeURIComponent(normalizedEmail)}`,
      `/contacts?query=${encodeURIComponent(normalizedEmail)}`,
      "/contacts",
    ];

    const contactsById = new Map<string, AlegraContact>();

    for (const endpoint of endpoints) {
      const payload = await requestAlegra(endpoint);
      const rows = toArray(payload);
      for (const row of rows) {
        const id = readString(row, "id", "_id");
        if (!id) continue;
        const emails = contactEmails(row);
        const emailValue = emails[0];
        contactsById.set(id, {
          id,
          email: emailValue,
          name: readString(row, "name", "nameObject.name"),
          raw: row,
        });
      }

      const exact = Array.from(contactsById.values()).find((contact) => {
        if (!contact.raw) return false;
        return contactEmails(contact.raw).includes(normalizedEmail);
      });

      if (exact) return exact;
    }

    return null;
  },

  async listInvoices(startDate: string, endDate: string): Promise<AlegraInvoiceRecord[]> {
    const endpoints = [
      `/invoices?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
      "/invoices",
    ];

    const rows: AlegraInvoiceRecord[] = [];
    const seen = new Set<string>();

    for (const endpoint of endpoints) {
      const payload = await requestAlegra(endpoint);
      const list = toArray(payload);
      for (const item of list) {
        const id = readString(item, "id", "_id");
        if (!id || seen.has(id)) continue;
        seen.add(id);
        rows.push(item);
      }

      if (rows.length) break;
    }

    return rows;
  },

  async getInvoiceById(invoiceId: string): Promise<AlegraInvoiceRecord | null> {
    if (!invoiceId) return null;
    const payload = await requestAlegra(`/invoices/${encodeURIComponent(invoiceId)}`);
    const rows = toArray(payload);
    return rows[0] ?? null;
  },
};

export function canUseAlegra() {
  return Boolean(process.env.ALEGRA_API_EMAIL?.trim() && process.env.ALEGRA_API_TOKEN?.trim());
}
