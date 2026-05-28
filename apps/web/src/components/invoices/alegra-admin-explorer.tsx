"use client";

import { type FormEvent, type ReactNode, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AlegraStudentContext } from "@/lib/alegra/admin-context";
import { intlLocale, type AppLocale } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";

type TabKey = "contacts" | "invoices" | "payments";

type LocalMatch = AlegraStudentContext & {
  matchReason: "manual_link" | "student_email" | "parent_email";
};

type ContactResult = {
  id: string;
  name: string | null;
  emails: string[];
  identification: string | null;
  type: string | null;
  phone: string | null;
  city: string | null;
  rawPreview: Record<string, unknown>;
  localMatches: LocalMatch[];
};

type InvoiceResult = {
  id: string;
  number: string | null;
  clientId: string | null;
  clientName: string | null;
  status: string | null;
  issueDate: string | null;
  dueDate: string | null;
  currency: string | null;
  total: number | null;
  balance: number | null;
  viewUrl: string | null;
  pdfUrl: string | null;
  rawPreview: Record<string, unknown>;
  localMatches: LocalMatch[];
};

type PaymentResult = {
  id: string;
  number: string | null;
  date: string | null;
  clientId: string | null;
  clientName: string | null;
  type: string | null;
  amount: number | null;
  currency: string | null;
  paymentMethod: string | null;
  account: string | null;
  invoices: { id?: string; number?: string; amount?: number }[];
  rawPreview: Record<string, unknown>;
  localMatches: LocalMatch[];
};

type PaginatedResult<T> = {
  items: T[];
  start: number;
  limit: number;
  hasNext: boolean;
  nextStart: number;
};

type SearchState = {
  loading: boolean;
  error: string | null;
};

const initialSearchState: SearchState = { loading: false, error: null };
const selectClassName = "h-[3.35rem] w-full rounded-[1.2rem] border border-[var(--color-border-strong)] bg-white/84 px-4 text-sm text-[var(--color-ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_8px_20px_rgba(90,64,33,0.04)] focus:border-[color-mix(in_srgb,var(--color-gold)_52%,white)] focus:outline-none focus:ring-4 focus:ring-[color-mix(in_srgb,var(--color-gold)_12%,white)]";

export function AlegraAdminExplorer({ locale, students }: { locale: AppLocale; students: AlegraStudentContext[] }) {
  const router = useRouter();
  const isSpanish = locale === "es";
  const copy = getCopy(isSpanish);
  const [activeTab, setActiveTab] = useState<TabKey>("contacts");
  const [state, setState] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [pendingStudentId, setPendingStudentId] = useState<string | null>(null);
  const [selectedStudentByContact, setSelectedStudentByContact] = useState<Record<string, string>>({});
  const [selectedStudentByClient, setSelectedStudentByClient] = useState<Record<string, string>>({});

  const [contactForm, setContactForm] = useState({ query: "", name: "", identification: "" });
  const [contactResults, setContactResults] = useState<PaginatedResult<ContactResult> | null>(null);
  const [contactState, setContactState] = useState<SearchState>(initialSearchState);

  const [invoiceForm, setInvoiceForm] = useState({ contactId: "", clientName: "", invoiceNumber: "", status: "", startDate: "", endDate: "" });
  const [invoiceResults, setInvoiceResults] = useState<PaginatedResult<InvoiceResult> | null>(null);
  const [invoiceState, setInvoiceState] = useState<SearchState>(initialSearchState);

  const [paymentForm, setPaymentForm] = useState({ contactId: "", paymentId: "", type: "in" });
  const [paymentResults, setPaymentResults] = useState<PaginatedResult<PaymentResult> | null>(null);
  const [paymentState, setPaymentState] = useState<SearchState>(initialSearchState);

  const linkedCount = useMemo(() => students.filter((student) => student.existingAlegraContactId).length, [students]);
  const syncIssueCount = useMemo(() => students.filter((student) => student.lastError || student.latestSyncError).length, [students]);

  async function searchContacts(event?: FormEvent<HTMLFormElement>, start = 0) {
    event?.preventDefault();
    setContactState({ loading: true, error: null });
    setState(null);
    const params = toParams({ ...contactForm, start, limit: 30 });
    const result = await fetchJson<PaginatedResult<ContactResult>>(`/api/admin/alegra/contacts?${params}`);
    if ("error" in result) {
      setContactState({ loading: false, error: result.error });
      return;
    }
    setContactResults(result.data);
    setContactState({ loading: false, error: null });
  }

  async function searchInvoices(event?: FormEvent<HTMLFormElement>, start = 0) {
    event?.preventDefault();
    setInvoiceState({ loading: true, error: null });
    setState(null);
    const params = toParams({ ...invoiceForm, start, limit: 30 });
    const result = await fetchJson<PaginatedResult<InvoiceResult>>(`/api/admin/alegra/invoices?${params}`);
    if ("error" in result) {
      setInvoiceState({ loading: false, error: result.error });
      return;
    }
    setInvoiceResults(result.data);
    setInvoiceState({ loading: false, error: null });
  }

  async function searchPayments(event?: FormEvent<HTMLFormElement>, start = 0) {
    event?.preventDefault();
    setPaymentState({ loading: true, error: null });
    setState(null);
    const params = toParams({ ...paymentForm, start, limit: 30 });
    const result = await fetchJson<PaginatedResult<PaymentResult>>(`/api/admin/alegra/payments?${params}`);
    if ("error" in result) {
      setPaymentState({ loading: false, error: result.error });
      return;
    }
    setPaymentResults(result.data);
    setPaymentState({ loading: false, error: null });
  }

  async function saveManualLink(studentId: string, alegraContactId: string) {
    if (!studentId || !alegraContactId) {
      setState({ kind: "error", message: copy.chooseStudentFirst });
      return;
    }

    setPendingStudentId(studentId);
    setState(null);
    const response = await fetch("/api/admin/invoices/contact-link", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, alegraContactId }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setState({ kind: "error", message: payload?.error ?? copy.linkError });
      setPendingStudentId(null);
      return;
    }

    setState({ kind: "success", message: copy.linkSaved });
    setPendingStudentId(null);
    router.refresh();
  }

  async function syncStudent(studentId: string) {
    if (!studentId) {
      setState({ kind: "error", message: copy.chooseStudentFirst });
      return;
    }

    setPendingStudentId(studentId);
    setState(null);
    const response = await fetch("/api/admin/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setState({ kind: "error", message: payload?.error ?? copy.syncError });
      setPendingStudentId(null);
      return;
    }

    setState({ kind: "success", message: copy.syncQueued });
    setPendingStudentId(null);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        <SummaryCard label={copy.localStudents} value={students.length} />
        <SummaryCard label={copy.linkedStudents} value={linkedCount} tone="success" />
        <SummaryCard label={copy.needsAttention} value={syncIssueCount} tone={syncIssueCount ? "warning" : "muted"} />
      </div>

      {state ? (
        <p className={cn("rounded-2xl border px-4 py-3 text-sm", state.kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800")}>{state.message}</p>
      ) : null}

      <Card>
        <div className="flex flex-wrap gap-2">
          <TabButton active={activeTab === "contacts"} onClick={() => setActiveTab("contacts")}>{copy.contacts}</TabButton>
          <TabButton active={activeTab === "invoices"} onClick={() => setActiveTab("invoices")}>{copy.invoices}</TabButton>
          <TabButton active={activeTab === "payments"} onClick={() => setActiveTab("payments")}>{copy.payments}</TabButton>
        </div>
      </Card>

      {activeTab === "contacts" ? (
        <Card>
          <CardTitle>{copy.contactsTitle}</CardTitle>
          <CardDescription>{copy.contactsDescription}</CardDescription>
          <form onSubmit={searchContacts} className="mt-5 grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr_auto]">
            <Field label={copy.searchTerm}><Input value={contactForm.query} onChange={(event) => setContactForm((current) => ({ ...current, query: event.target.value }))} placeholder="Tomas" /></Field>
            <Field label={copy.name}><Input value={contactForm.name} onChange={(event) => setContactForm((current) => ({ ...current, name: event.target.value }))} /></Field>
            <Field label={copy.identification}><Input value={contactForm.identification} onChange={(event) => setContactForm((current) => ({ ...current, identification: event.target.value }))} /></Field>
            <div className="flex items-end"><Button type="submit" variant="gold" disabled={contactState.loading} className="w-full">{contactState.loading ? copy.searching : copy.search}</Button></div>
          </form>
          <ErrorMessage message={contactState.error} />
          <div className="mt-5 grid gap-3">
            {contactResults?.items.map((contact) => {
              const suggestedStudentId = selectedStudentByContact[contact.id] ?? contact.localMatches[0]?.studentId ?? "";
              return (
                <ResultCard key={contact.id}>
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <ResultHeader title={contact.name ?? copy.unnamedContact} subtitle={`${copy.contactId}: ${contact.id}`} />
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="gold">ID {contact.id}</Badge>
                        {contact.identification ? <Badge>{contact.identification}</Badge> : null}
                        {contact.type ? <Badge>{contact.type}</Badge> : null}
                        {contact.city ? <Badge>{contact.city}</Badge> : null}
                      </div>
                      <MetadataGrid rows={[
                        [copy.emails, contact.emails.join(" · ") || copy.none],
                        [copy.phone, contact.phone ?? copy.none],
                      ]} />
                    </div>
                    <LinkTools
                      copy={copy}
                      students={students}
                      selectedStudentId={suggestedStudentId}
                      pending={pendingStudentId === suggestedStudentId}
                      onStudentChange={(studentId) => setSelectedStudentByContact((current) => ({ ...current, [contact.id]: studentId }))}
                      onLink={() => saveManualLink(suggestedStudentId, contact.id)}
                      onSync={() => syncStudent(suggestedStudentId)}
                    />
                  </div>
                  <LocalMatches matches={contact.localMatches} copy={copy} locale={locale} />
                  <RawPreview rawPreview={contact.rawPreview} copy={copy} />
                </ResultCard>
              );
            })}
            <ResultFooter result={contactResults} loading={contactState.loading} onPrevious={() => searchContacts(undefined, Math.max(0, (contactResults?.start ?? 0) - (contactResults?.limit ?? 30)))} onNext={() => searchContacts(undefined, contactResults?.nextStart ?? 0)} copy={copy} />
          </div>
        </Card>
      ) : null}

      {activeTab === "invoices" ? (
        <Card>
          <CardTitle>{copy.invoicesTitle}</CardTitle>
          <CardDescription>{copy.invoicesDescription}</CardDescription>
          <form onSubmit={searchInvoices} className="mt-5 grid gap-3 lg:grid-cols-3 xl:grid-cols-[0.8fr_1fr_1fr_0.8fr_0.8fr_0.8fr_auto]">
            <Field label={copy.contactId}><Input value={invoiceForm.contactId} onChange={(event) => setInvoiceForm((current) => ({ ...current, contactId: event.target.value }))} placeholder="28" /></Field>
            <Field label={copy.clientName}><Input value={invoiceForm.clientName} onChange={(event) => setInvoiceForm((current) => ({ ...current, clientName: event.target.value }))} /></Field>
            <Field label={copy.invoiceNumber}><Input value={invoiceForm.invoiceNumber} onChange={(event) => setInvoiceForm((current) => ({ ...current, invoiceNumber: event.target.value }))} /></Field>
            <Field label={copy.status}><Input value={invoiceForm.status} onChange={(event) => setInvoiceForm((current) => ({ ...current, status: event.target.value }))} /></Field>
            <Field label={copy.startDate}><Input type="date" value={invoiceForm.startDate} onChange={(event) => setInvoiceForm((current) => ({ ...current, startDate: event.target.value }))} /></Field>
            <Field label={copy.endDate}><Input type="date" value={invoiceForm.endDate} onChange={(event) => setInvoiceForm((current) => ({ ...current, endDate: event.target.value }))} /></Field>
            <div className="flex items-end"><Button type="submit" variant="gold" disabled={invoiceState.loading} className="w-full">{invoiceState.loading ? copy.searching : copy.search}</Button></div>
          </form>
          <ErrorMessage message={invoiceState.error} />
          <div className="mt-5 grid gap-3">
            {invoiceResults?.items.map((invoice) => {
              const clientKey = invoice.clientId ?? invoice.id;
              const suggestedStudentId = selectedStudentByClient[clientKey] ?? invoice.localMatches[0]?.studentId ?? "";
              return (
                <ResultCard key={invoice.id}>
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <ResultHeader title={invoice.number ? `${copy.invoice} ${invoice.number}` : `${copy.invoice} ${invoice.id}`} subtitle={`${copy.client}: ${invoice.clientName ?? copy.none}${invoice.clientId ? ` · ID ${invoice.clientId}` : ""}`} />
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="gold">ID {invoice.id}</Badge>
                        {invoice.status ? <Badge variant={invoice.status.toLowerCase().includes("open") || invoice.status.toLowerCase().includes("pending") ? "warning" : "default"}>{invoice.status}</Badge> : null}
                        <Badge>{formatMoney(invoice.total, invoice.currency, locale)}</Badge>
                        <Badge>{copy.balance}: {formatMoney(invoice.balance, invoice.currency, locale)}</Badge>
                      </div>
                      <MetadataGrid rows={[
                        [copy.issueDate, formatMaybeDate(invoice.issueDate, locale)],
                        [copy.dueDate, formatMaybeDate(invoice.dueDate, locale)],
                      ]} />
                      <ExternalLinks viewUrl={invoice.viewUrl} pdfUrl={invoice.pdfUrl} copy={copy} />
                    </div>
                    {invoice.clientId ? (
                      <LinkTools
                        copy={copy}
                        students={students}
                        selectedStudentId={suggestedStudentId}
                        pending={pendingStudentId === suggestedStudentId}
                        onStudentChange={(studentId) => setSelectedStudentByClient((current) => ({ ...current, [clientKey]: studentId }))}
                        onLink={() => saveManualLink(suggestedStudentId, invoice.clientId ?? "")}
                        onSync={() => syncStudent(suggestedStudentId)}
                      />
                    ) : null}
                  </div>
                  <LocalMatches matches={invoice.localMatches} copy={copy} locale={locale} />
                  <RawPreview rawPreview={invoice.rawPreview} copy={copy} />
                </ResultCard>
              );
            })}
            <ResultFooter result={invoiceResults} loading={invoiceState.loading} onPrevious={() => searchInvoices(undefined, Math.max(0, (invoiceResults?.start ?? 0) - (invoiceResults?.limit ?? 30)))} onNext={() => searchInvoices(undefined, invoiceResults?.nextStart ?? 0)} copy={copy} />
          </div>
        </Card>
      ) : null}

      {activeTab === "payments" ? (
        <Card>
          <CardTitle>{copy.paymentsTitle}</CardTitle>
          <CardDescription>{copy.paymentsDescription}</CardDescription>
          <form onSubmit={searchPayments} className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
            <Field label={copy.contactId}><Input value={paymentForm.contactId} onChange={(event) => setPaymentForm((current) => ({ ...current, contactId: event.target.value }))} placeholder="28" /></Field>
            <Field label={copy.paymentId}><Input value={paymentForm.paymentId} onChange={(event) => setPaymentForm((current) => ({ ...current, paymentId: event.target.value }))} /></Field>
            <Field label={copy.paymentType}>
              <select value={paymentForm.type} onChange={(event) => setPaymentForm((current) => ({ ...current, type: event.target.value }))} className={selectClassName}>
                <option value="in">{copy.income}</option>
                <option value="out">{copy.outgoing}</option>
              </select>
            </Field>
            <div className="flex items-end"><Button type="submit" variant="gold" disabled={paymentState.loading} className="w-full">{paymentState.loading ? copy.searching : copy.search}</Button></div>
          </form>
          <ErrorMessage message={paymentState.error} />
          <div className="mt-5 grid gap-3">
            {paymentResults?.items.map((payment) => {
              const clientKey = payment.clientId ?? payment.id;
              const suggestedStudentId = selectedStudentByClient[clientKey] ?? payment.localMatches[0]?.studentId ?? "";
              return (
                <ResultCard key={payment.id}>
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <ResultHeader title={payment.number ? `${copy.payment} ${payment.number}` : `${copy.payment} ${payment.id}`} subtitle={`${copy.client}: ${payment.clientName ?? copy.none}${payment.clientId ? ` · ID ${payment.clientId}` : ""}`} />
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="gold">ID {payment.id}</Badge>
                        {payment.type ? <Badge>{payment.type}</Badge> : null}
                        <Badge>{formatMoney(payment.amount, payment.currency, locale)}</Badge>
                        {payment.paymentMethod ? <Badge>{payment.paymentMethod}</Badge> : null}
                      </div>
                      <MetadataGrid rows={[
                        [copy.paymentDate, formatMaybeDate(payment.date, locale)],
                        [copy.account, payment.account ?? copy.none],
                        [copy.linkedInvoices, payment.invoices.length ? payment.invoices.map((invoice) => invoice.number ?? invoice.id ?? formatMoney(invoice.amount ?? null, payment.currency, locale)).join(" · ") : copy.none],
                      ]} />
                    </div>
                    {payment.clientId ? (
                      <LinkTools
                        copy={copy}
                        students={students}
                        selectedStudentId={suggestedStudentId}
                        pending={pendingStudentId === suggestedStudentId}
                        onStudentChange={(studentId) => setSelectedStudentByClient((current) => ({ ...current, [clientKey]: studentId }))}
                        onLink={() => saveManualLink(suggestedStudentId, payment.clientId ?? "")}
                        onSync={() => syncStudent(suggestedStudentId)}
                      />
                    ) : null}
                  </div>
                  <LocalMatches matches={payment.localMatches} copy={copy} locale={locale} />
                  <RawPreview rawPreview={payment.rawPreview} copy={copy} />
                </ResultCard>
              );
            })}
            <ResultFooter result={paymentResults} loading={paymentState.loading} onPrevious={() => searchPayments(undefined, Math.max(0, (paymentResults?.start ?? 0) - (paymentResults?.limit ?? 30)))} onNext={() => searchPayments(undefined, paymentResults?.nextStart ?? 0)} copy={copy} />
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function SummaryCard({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "success" | "warning" | "muted" }) {
  const color = tone === "success" ? "text-[var(--color-success)]" : tone === "warning" ? "text-[var(--color-warning)]" : tone === "muted" ? "text-[var(--color-ink-soft)]" : "text-[var(--color-ink)]";
  return (
    <Card density="compact">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-gold-deep)]">{label}</p>
      <p className={cn("mt-2 font-display text-4xl tracking-[-0.05em]", color)}>{value}</p>
    </Card>
  );
}

function TabButton({ active, children, onClick }: { active: boolean; children: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-2 text-sm font-semibold transition duration-200 ease-out focus:outline-none focus:ring-4 focus:ring-[var(--focus-ring)]",
        active
          ? "border-[color-mix(in_srgb,var(--color-gold)_30%,white)] bg-[var(--color-gold-soft)] text-[var(--color-gold-deep)] shadow-[var(--shadow-active)]"
          : "border-[var(--color-border)] bg-white/72 text-[var(--color-ink-soft)] hover:border-[color-mix(in_srgb,var(--color-gold)_25%,white)] hover:text-[var(--color-gold-deep)]",
      )}
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-1.5 text-sm font-semibold text-[var(--color-ink-soft)]">
      <span>{label}</span>
      {children}
    </label>
  );
}

function ResultCard({ children }: { children: ReactNode }) {
  return <article className="rounded-[1.35rem] border border-[var(--color-border)] bg-white/72 p-4 shadow-[0_10px_24px_rgba(78,55,30,0.035)] transition duration-200 ease-out hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--color-gold)_22%,white)] hover:shadow-[var(--shadow-card)]">{children}</article>;
}

function ResultHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h3 className="text-base font-semibold tracking-[-0.02em] text-[var(--color-ink)]">{title}</h3>
      <p className="mt-1 text-xs text-[var(--color-ink-soft)]">{subtitle}</p>
    </div>
  );
}

function MetadataGrid({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="mt-3 grid gap-2 text-xs text-[var(--color-ink-soft)] sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-inset)] px-3 py-2">
          <dt className="font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">{label}</dt>
          <dd className="mt-1 break-words text-[var(--color-ink-soft)]">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function LinkTools({
  copy,
  students,
  selectedStudentId,
  pending,
  onStudentChange,
  onLink,
  onSync,
}: {
  copy: ReturnType<typeof getCopy>;
  students: AlegraStudentContext[];
  selectedStudentId: string;
  pending: boolean;
  onStudentChange: (studentId: string) => void;
  onLink: () => void;
  onSync: () => void;
}) {
  return (
    <div className="w-full rounded-[1.2rem] border border-[var(--color-border)] bg-[var(--color-surface-inset)] p-3 xl:max-w-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-gold-deep)]">{copy.linkContact}</p>
      <div className="mt-2 grid gap-2">
        <select value={selectedStudentId} onChange={(event) => onStudentChange(event.target.value)} className={selectClassName}>
          <option value="">{copy.chooseStudent}</option>
          {students.map((student) => (
            <option key={student.studentId} value={student.studentId}>
              {student.name} · {student.email}
            </option>
          ))}
        </select>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          <Button type="button" variant="outline" size="sm" disabled={pending || !selectedStudentId} onClick={onLink}>{pending ? copy.saving : copy.saveLink}</Button>
          <Button type="button" variant="gold" size="sm" disabled={pending || !selectedStudentId} onClick={onSync}>{pending ? copy.syncing : copy.syncInvoices}</Button>
        </div>
      </div>
    </div>
  );
}

function LocalMatches({ matches, copy, locale }: { matches: LocalMatch[]; copy: ReturnType<typeof getCopy>; locale: AppLocale }) {
  if (!matches.length) {
    return <p className="mt-4 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-inset)] px-3 py-2 text-xs text-[var(--color-ink-soft)]">{copy.noLocalMatches}</p>;
  }

  return (
    <div className="mt-4 grid gap-2">
      {matches.map((match) => (
        <div key={`${match.studentId}-${match.matchReason}`} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-inset)] px-3 py-2 text-xs text-[var(--color-ink-soft)]">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={match.matchReason === "manual_link" ? "success" : "gold"}>{matchReasonLabel(match.matchReason, copy)}</Badge>
            <span className="font-semibold text-[var(--color-ink)]">{match.name}</span>
            <span>{match.email}</span>
          </div>
          <p className="mt-1">
            {copy.parents}: {match.parentEmails.join(" · ") || copy.none} · {copy.currentLink}: {match.existingAlegraContactId ?? copy.none} · {copy.lastSync}: {match.latestSyncAt ? formatMaybeDate(match.latestSyncAt, locale) : copy.never}
          </p>
          {match.lastError || match.latestSyncError ? <p className="mt-1 text-rose-700">{match.lastError ?? match.latestSyncError}</p> : null}
        </div>
      ))}
    </div>
  );
}

function RawPreview({ rawPreview, copy }: { rawPreview: Record<string, unknown>; copy: ReturnType<typeof getCopy> }) {
  return (
    <details className="mt-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-inset)] px-3 py-2 text-xs text-[var(--color-ink-soft)]">
      <summary className="cursor-pointer font-semibold text-[var(--color-gold-deep)]">{copy.rawPreview}</summary>
      <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-white/78 p-3 text-[11px] leading-5 text-[var(--color-ink-soft)]">{JSON.stringify(rawPreview, null, 2)}</pre>
    </details>
  );
}

function ExternalLinks({ viewUrl, pdfUrl, copy }: { viewUrl: string | null; pdfUrl: string | null; copy: ReturnType<typeof getCopy> }) {
  if (!viewUrl && !pdfUrl) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {viewUrl ? <a className="text-xs font-semibold text-[var(--color-gold-deep)] underline-offset-4 hover:underline" href={viewUrl} target="_blank" rel="noreferrer">{copy.viewInvoice}</a> : null}
      {pdfUrl ? <a className="text-xs font-semibold text-[var(--color-gold-deep)] underline-offset-4 hover:underline" href={pdfUrl} target="_blank" rel="noreferrer">{copy.openPdf}</a> : null}
    </div>
  );
}

function ErrorMessage({ message }: { message: string | null }) {
  return message ? <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{message}</p> : null;
}

function ResultFooter<T>({ result, loading, onPrevious, onNext, copy }: { result: PaginatedResult<T> | null; loading: boolean; onPrevious: () => void; onNext: () => void; copy: ReturnType<typeof getCopy> }) {
  if (!result) return null;
  return (
    <div className="flex flex-col gap-2 rounded-[1.2rem] border border-[var(--color-border)] bg-[var(--color-surface-inset)] px-4 py-3 text-sm text-[var(--color-ink-soft)] sm:flex-row sm:items-center sm:justify-between">
      <p>{copy.results}: {result.items.length} · {copy.start}: {result.start}</p>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onPrevious} disabled={loading || result.start === 0}>{copy.previous}</Button>
        <Button type="button" variant="outline" size="sm" onClick={onNext} disabled={loading || !result.hasNext}>{copy.next}</Button>
      </div>
    </div>
  );
}

async function fetchJson<T>(url: string): Promise<{ data: T } | { error: string }> {
  const response = await fetch(url, { cache: "no-store" });
  const payload = (await response.json().catch(() => null)) as (T & { error?: unknown }) | null;
  if (!response.ok) {
    return { error: typeof payload?.error === "string" ? payload.error : "Request failed." };
  }
  return { data: payload as T };
}

function toParams(values: Record<string, string | number>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value === "" || value === undefined || value === null) continue;
    params.set(key, String(value));
  }
  return params.toString();
}

function formatMaybeDate(value: string | null, locale: AppLocale) {
  if (!value) return locale === "es" ? "Sin fecha" : "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "medium" }).format(date);
}

function formatMoney(value: number | null | undefined, currency: string | null | undefined, locale: AppLocale) {
  if (value === null || value === undefined) return locale === "es" ? "Sin monto" : "No amount";
  try {
    return new Intl.NumberFormat(intlLocale(locale), { style: "currency", currency: currency || "USD" }).format(value);
  } catch {
    return `${currency ?? "USD"} ${value.toLocaleString(intlLocale(locale))}`;
  }
}

function matchReasonLabel(reason: LocalMatch["matchReason"], copy: ReturnType<typeof getCopy>) {
  if (reason === "manual_link") return copy.manualLink;
  if (reason === "parent_email") return copy.parentEmailMatch;
  return copy.studentEmailMatch;
}

function getCopy(isSpanish: boolean) {
  return isSpanish ? {
    tabsLabel: "Explorador Alegra",
    contacts: "Contactos",
    invoices: "Facturas",
    payments: "Pagos",
    localStudents: "Estudiantes locales",
    linkedStudents: "Con contacto Alegra",
    needsAttention: "Revisar",
    contactsTitle: "Buscar contactos en Alegra",
    contactsDescription: "Busca por nombre, email o identificación para encontrar el ID correcto del contacto y enlazarlo al estudiante local.",
    invoicesTitle: "Buscar facturas en Alegra",
    invoicesDescription: "Filtra por contacto, cliente, número, estado o fechas. Esta vista consulta Alegra en vivo y no cambia datos locales.",
    paymentsTitle: "Buscar pagos en Alegra",
    paymentsDescription: "Consulta pagos de ingreso por contacto y revisa referencias a facturas cuando Alegra las incluya.",
    searchTerm: "Nombre, email o texto",
    name: "Nombre",
    identification: "Identificación",
    contactId: "ID de contacto",
    clientName: "Cliente",
    invoiceNumber: "Número de factura",
    status: "Estado",
    startDate: "Desde",
    endDate: "Hasta",
    paymentId: "ID de pago",
    paymentType: "Tipo de pago",
    income: "Ingresos",
    outgoing: "Egresos",
    search: "Buscar",
    searching: "Buscando...",
    emails: "Emails",
    phone: "Teléfono",
    none: "Sin dato",
    unnamedContact: "Contacto sin nombre",
    linkContact: "Enlazar a estudiante",
    chooseStudent: "Selecciona estudiante",
    chooseStudentFirst: "Selecciona un estudiante antes de guardar o sincronizar.",
    saveLink: "Guardar enlace",
    saving: "Guardando...",
    linkSaved: "Contacto Alegra enlazado al estudiante.",
    linkError: "No se pudo guardar el enlace.",
    syncInvoices: "Sincronizar facturas",
    syncing: "Sincronizando...",
    syncQueued: "Sincronización de facturas finalizada.",
    syncError: "No se pudo sincronizar facturas.",
    noLocalMatches: "No encontramos coincidencias locales por email o enlace manual.",
    parents: "Acudientes",
    currentLink: "Enlace actual",
    lastSync: "Última sync",
    never: "Nunca",
    manualLink: "Enlace manual",
    parentEmailMatch: "Email acudiente",
    studentEmailMatch: "Email estudiante",
    rawPreview: "Vista técnica JSON",
    invoice: "Factura",
    client: "Cliente",
    balance: "Saldo",
    issueDate: "Emisión",
    dueDate: "Vencimiento",
    viewInvoice: "Ver factura",
    openPdf: "Abrir PDF",
    payment: "Pago",
    paymentDate: "Fecha de pago",
    account: "Cuenta",
    linkedInvoices: "Facturas relacionadas",
    results: "Resultados",
    start: "Inicio",
    previous: "Anterior",
    next: "Siguiente",
  } : {
    tabsLabel: "Alegra explorer",
    contacts: "Contacts",
    invoices: "Invoices",
    payments: "Payments",
    localStudents: "Local students",
    linkedStudents: "With Alegra contact",
    needsAttention: "Needs review",
    contactsTitle: "Search Alegra contacts",
    contactsDescription: "Search by name, email, or identification to find the correct contact ID and link it to the local student.",
    invoicesTitle: "Search Alegra invoices",
    invoicesDescription: "Filter by contact, client, number, status, or dates. This view queries Alegra live and does not change local data.",
    paymentsTitle: "Search Alegra payments",
    paymentsDescription: "Look up income payments by contact and review invoice references when Alegra includes them.",
    searchTerm: "Name, email, or text",
    name: "Name",
    identification: "Identification",
    contactId: "Contact ID",
    clientName: "Client",
    invoiceNumber: "Invoice number",
    status: "Status",
    startDate: "From",
    endDate: "To",
    paymentId: "Payment ID",
    paymentType: "Payment type",
    income: "Income",
    outgoing: "Outgoing",
    search: "Search",
    searching: "Searching...",
    emails: "Emails",
    phone: "Phone",
    none: "None",
    unnamedContact: "Unnamed contact",
    linkContact: "Link to student",
    chooseStudent: "Choose student",
    chooseStudentFirst: "Choose a student before saving or syncing.",
    saveLink: "Save link",
    saving: "Saving...",
    linkSaved: "Alegra contact linked to the student.",
    linkError: "Could not save contact link.",
    syncInvoices: "Sync invoices",
    syncing: "Syncing...",
    syncQueued: "Invoice sync completed.",
    syncError: "Could not sync invoices.",
    noLocalMatches: "No local match found by email or manual link.",
    parents: "Guardians",
    currentLink: "Current link",
    lastSync: "Last sync",
    never: "Never",
    manualLink: "Manual link",
    parentEmailMatch: "Guardian email",
    studentEmailMatch: "Student email",
    rawPreview: "Technical JSON preview",
    invoice: "Invoice",
    client: "Client",
    balance: "Balance",
    issueDate: "Issued",
    dueDate: "Due",
    viewInvoice: "View invoice",
    openPdf: "Open PDF",
    payment: "Payment",
    paymentDate: "Payment date",
    account: "Account",
    linkedInvoices: "Linked invoices",
    results: "Results",
    start: "Start",
    previous: "Previous",
    next: "Next",
  };
}
