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

type SearchPagination = {
  start?: number;
  limit?: number;
};

export type AlegraContactSearchInput = SearchPagination & {
  query?: string;
  identification?: string;
  name?: string;
};

export type AlegraInvoiceSearchInput = SearchPagination & {
  contactId?: string;
  clientName?: string;
  invoiceNumber?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
};

export type AlegraPaymentSearchInput = SearchPagination & {
  contactId?: string;
  paymentId?: string;
  type?: string;
};

export type AlegraLookupContact = {
  id: string;
  name?: string;
  emails: string[];
  identification?: string;
  type?: string;
  phone?: string;
  city?: string;
  raw: Record<string, unknown>;
  rawPreview: Record<string, unknown>;
};

export type AlegraLookupInvoice = {
  id: string;
  number?: string;
  clientId?: string;
  clientName?: string;
  status?: string;
  issueDate?: string;
  dueDate?: string;
  currency?: string;
  total?: number;
  balance?: number;
  viewUrl?: string;
  pdfUrl?: string;
  raw: Record<string, unknown>;
  rawPreview: Record<string, unknown>;
};

export type AlegraLookupPaymentInvoiceRef = {
  id?: string;
  number?: string;
  amount?: number;
};

export type AlegraLookupPayment = {
  id: string;
  number?: string;
  date?: string;
  clientId?: string;
  clientName?: string;
  type?: string;
  amount?: number;
  currency?: string;
  paymentMethod?: string;
  account?: string;
  invoices: AlegraLookupPaymentInvoiceRef[];
  raw: Record<string, unknown>;
  rawPreview: Record<string, unknown>;
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

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function toArray(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.filter((item): item is Record<string, unknown> => !!item && typeof item === "object");
  }

  if (!payload || typeof payload !== "object") return [];

  const objectPayload = payload as Record<string, unknown>;

  // Alegra entity detail responses are plain objects that can include an `items`
  // line-item array. Treat objects with their own id as one entity before trying
  // wrapper keys, otherwise invoice details become the first line item.
  if (readString(objectPayload, "id", "_id")) {
    return [objectPayload];
  }

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

function readNumber(source: Record<string, unknown>, ...paths: string[]): number | undefined {
  for (const path of paths) {
    const value = readString(source, path);
    if (!value) continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
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
        const value = readString(item as Record<string, unknown>, "email", "value", "address");
        if (value) emails.add(value.toLowerCase());
      }
    }
  }

  const contacts = contact.contacts;
  if (Array.isArray(contacts)) {
    for (const item of contacts) {
      const record = asRecord(item);
      if (!record) continue;
      const value = readString(record, "email", "emailAddress");
      if (value) emails.add(value.toLowerCase());
    }
  }

  return Array.from(emails);
}

function buildQuery(params: Record<string, string | number | null | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    query.set(key, String(value));
  }
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

function compactRawPreview(source: Record<string, unknown>) {
  const preview: Record<string, unknown> = {};
  for (const key of Object.keys(source).slice(0, 18)) {
    const value = source[key];
    if (Array.isArray(value)) {
      preview[key] = value.slice(0, 3).map((item) => {
        const record = asRecord(item);
        if (!record) return item;
        return Object.fromEntries(Object.entries(record).slice(0, 8));
      });
      continue;
    }

    const record = asRecord(value);
    if (record) {
      preview[key] = Object.fromEntries(Object.entries(record).slice(0, 8));
      continue;
    }

    preview[key] = value;
  }
  return preview;
}

function normalizeContact(raw: Record<string, unknown>): AlegraLookupContact | null {
  const id = readString(raw, "id", "_id");
  if (!id) return null;

  return {
    id,
    name: readString(raw, "name", "nameObject.name", "fullName"),
    emails: contactEmails(raw),
    identification: readString(raw, "identification", "identificationObject.number", "numberIdentification", "identificationNumber"),
    type: readString(raw, "type", "kind", "contactType"),
    phone: readString(raw, "phonePrimary", "phone", "phone1", "mobile", "cellphone"),
    city: readString(raw, "address.city", "city", "city.name", "address.city.name"),
    raw,
    rawPreview: compactRawPreview(raw),
  };
}

function normalizeInvoice(raw: Record<string, unknown>): AlegraLookupInvoice | null {
  const id = readString(raw, "id", "_id", "invoice.id");
  if (!id) return null;

  return {
    id,
    number: readString(raw, "number", "numberTemplate.fullNumber", "numberTemplate.number", "invoiceNumber"),
    clientId: readString(raw, "client.id", "contact.id", "customer.id", "client._id", "contact._id"),
    clientName: readString(raw, "client.name", "contact.name", "customer.name", "client.nameObject.name"),
    status: readString(raw, "status", "state", "statusInvoice"),
    issueDate: readString(raw, "date", "issueDate", "createdAt"),
    dueDate: readString(raw, "dueDate", "expirationDate", "datePayment"),
    currency: readString(raw, "currency.code", "currency", "currencyCode"),
    total: readNumber(raw, "total", "totalPrice", "totalAmount", "amount"),
    balance: readNumber(raw, "balance", "balanceAmount", "amountDue"),
    viewUrl: readString(raw, "url", "publicUrl", "shareLink", "htmlUrl"),
    pdfUrl: readString(raw, "pdf", "pdfUrl", "pdfURL", "pdf.url"),
    raw,
    rawPreview: compactRawPreview(raw),
  };
}

function normalizePaymentInvoiceRef(value: unknown): AlegraLookupPaymentInvoiceRef | null {
  const raw = asRecord(value);
  if (!raw) return null;
  const invoiceRecord = asRecord(raw.invoice) ?? raw;
  const id = readString(invoiceRecord, "id", "_id");
  const number = readString(invoiceRecord, "number", "numberTemplate.fullNumber", "invoiceNumber");
  const amount = readNumber(raw, "amount", "total", "paidAmount") ?? readNumber(invoiceRecord, "amount", "total", "totalAmount");
  if (!id && !number && amount === undefined) return null;
  return { id, number, amount };
}

function paymentInvoiceRefs(raw: Record<string, unknown>) {
  const candidates = [raw.invoices, raw.bills, raw.items, raw.invoicePayments];
  const refs: AlegraLookupPaymentInvoiceRef[] = [];
  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    for (const item of candidate) {
      const ref = normalizePaymentInvoiceRef(item);
      if (ref) refs.push(ref);
    }
  }
  return refs;
}

function normalizePayment(raw: Record<string, unknown>): AlegraLookupPayment | null {
  const id = readString(raw, "id", "_id");
  if (!id) return null;

  const clientRecord = asRecord(raw.client) ?? asRecord(raw.contact) ?? asRecord(raw.customer);

  return {
    id,
    number: readString(raw, "number", "numberTemplate.fullNumber", "numberTemplate.number", "reference", "receiptNumber"),
    date: readString(raw, "date", "paymentDate", "createdAt"),
    clientId: clientRecord ? readString(clientRecord, "id", "_id") : readString(raw, "client.id", "contact.id", "customer.id"),
    clientName: clientRecord ? readString(clientRecord, "name", "nameObject.name") : readString(raw, "client.name", "contact.name", "customer.name"),
    type: readString(raw, "type", "kind"),
    amount: readNumber(raw, "amount", "total", "totalAmount", "value"),
    currency: readString(raw, "currency.code", "currency", "currencyCode"),
    paymentMethod: readString(raw, "paymentMethod", "paymentMethod.name", "method", "method.name"),
    account: readString(raw, "account.name", "bankAccount.name", "paymentAccount.name"),
    invoices: paymentInvoiceRefs(raw),
    raw,
    rawPreview: compactRawPreview(raw),
  };
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

  async searchContacts(input: AlegraContactSearchInput): Promise<AlegraLookupContact[]> {
    const query = buildQuery({
      query: input.query,
      identification: input.identification,
      name: input.name,
      type: "client",
      mode: "advanced",
      start: input.start ?? 0,
      limit: input.limit ?? 30,
    });
    const payload = await requestAlegra(`/contacts${query}`);
    return toArray(payload).map(normalizeContact).filter((item): item is AlegraLookupContact => Boolean(item));
  },

  async searchInvoices(input: AlegraInvoiceSearchInput): Promise<AlegraLookupInvoice[]> {
    const query = buildQuery({
      client_id: input.contactId,
      client_name: input.clientName,
      numberTemplate_fullNumber: input.invoiceNumber,
      status: input.status,
      startDate: input.startDate,
      endDate: input.endDate,
      start: input.start ?? 0,
      limit: input.limit ?? 30,
    });
    const payload = await requestAlegra(`/invoices${query}`);
    return toArray(payload).map(normalizeInvoice).filter((item): item is AlegraLookupInvoice => Boolean(item));
  },

  async searchPayments(input: AlegraPaymentSearchInput): Promise<AlegraLookupPayment[]> {
    const query = buildQuery({
      client_id: input.contactId,
      type: input.type ?? "in",
      id: input.paymentId,
      start: input.start ?? 0,
      limit: input.limit ?? 30,
    });
    const payload = await requestAlegra(`/payments${query}`);
    return toArray(payload).map(normalizePayment).filter((item): item is AlegraLookupPayment => Boolean(item));
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
