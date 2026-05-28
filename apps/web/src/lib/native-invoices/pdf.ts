import "server-only";

import { createHash } from "node:crypto";
import PDFDocument from "pdfkit/js/pdfkit.standalone.js";
import { NativeInvoiceStatus } from "@prisma/client";

import { formatCop, sessionCadenceLabel } from "@/lib/native-invoices/shared";

type NativeInvoicePdfInput = {
  invoiceNumber: string;
  status: NativeInvoiceStatus;
  recipientName: string;
  recipientEmail: string;
  studentNameSnapshot: string;
  issueDate: Date;
  dueDate: Date;
  periodStart: Date;
  periodEnd: Date;
  sessionCount: number;
  cadenceLabel: string;
  pricePerClassCop: number;
  subtotalCop: number;
  taxCop: number;
  totalCop: number;
  balanceCop: number;
  legalFooter: string | null;
  notes: string | null;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPriceCop: number;
    totalCop: number;
  }>;
};

const GOLD = "#c87505";
const GOLD_DEEP = "#9f5a00";
const INK = "#211f1c";
const SOFT = "#6d675f";
const BORDER = "#eadfce";
const PAPER = "#fbf8f3";
const WHITE = "#ffffff";

type PdfLayout = {
  contentX: number;
  contentWidth: number;
  contentRight: number;
};

export async function generateNativeInvoicePdf(input: NativeInvoicePdfInput) {
  const doc = new PDFDocument({
    size: "LETTER",
    margin: 52,
    info: {
      Title: `Invoice ${input.invoiceNumber}`,
      Author: "Harmonizing Academy",
      Subject: "Native Harmonizing invoice",
    },
  });

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const finished = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const layout = getLayout(doc);
  drawHeader(doc, layout, input);
  drawRecipientAndPeriod(doc, layout, input);
  drawLineItems(doc, layout, input);
  drawTotals(doc, layout, input);
  drawFooter(doc, layout, input);

  doc.end();
  const bytes = await finished;
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  return { bytes, sha256 };
}

function getLayout(doc: PDFKit.PDFDocument): PdfLayout {
  const contentX = doc.page.margins.left;
  const contentRight = doc.page.width - doc.page.margins.right;
  return { contentX, contentRight, contentWidth: contentRight - contentX };
}

function resetCursor(doc: PDFKit.PDFDocument, layout: PdfLayout, y = doc.y) {
  doc.x = layout.contentX;
  doc.y = y;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("es-CO", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(value);
}

function drawHeader(doc: PDFKit.PDFDocument, layout: PdfLayout, input: NativeInvoicePdfInput) {
  const top = doc.page.margins.top;
  const businessName = process.env.BILLING_BUSINESS_NAME?.trim() || "Harmonizing Academy";
  const businessDetails = [
    process.env.BILLING_TAX_ID?.trim() ? `NIT/ID: ${process.env.BILLING_TAX_ID.trim()}` : null,
    process.env.BILLING_ADDRESS?.trim() || null,
    process.env.BILLING_EMAIL?.trim() || null,
  ].filter(Boolean).join(" · ");
  doc.roundedRect(layout.contentX, top, 58, 58, 16).fillAndStroke(WHITE, BORDER);
  doc.fillColor(GOLD_DEEP).font("Times-Roman").fontSize(10).text("H", layout.contentX + 22, top + 10, { width: 16, align: "center" });
  doc.fillColor(GOLD).fontSize(24).text("2", layout.contentX + 20, top + 25, { width: 18, align: "center" });

  doc.fillColor(INK).font("Times-Roman").fontSize(28).text(businessName, layout.contentX + 76, top + 6, { width: layout.contentWidth - 210, lineBreak: false });
  doc.fillColor(SOFT).font("Helvetica").fontSize(8).text("ACADEMIA MUSICAL", layout.contentX + 78, top + 42, { width: layout.contentWidth - 76 });
  if (businessDetails) {
    doc.fillColor(SOFT).font("Helvetica").fontSize(7).text(businessDetails, layout.contentX + 78, top + 55, { width: layout.contentWidth - 238 });
  }

  doc.fillColor(GOLD_DEEP).font("Helvetica-Bold").fontSize(9).text("FACTURA", layout.contentRight - 142, top + 7, { width: 142, align: "right" });
  doc.fillColor(INK).font("Helvetica-Bold").fontSize(16).text(input.invoiceNumber, layout.contentRight - 180, top + 23, { width: 180, align: "right" });
  doc.fillColor(statusColor(input.status)).font("Helvetica-Bold").fontSize(10).text(statusLabel(input.status), layout.contentRight - 180, top + 45, { width: 180, align: "right" });

  resetCursor(doc, layout, top + 86);
}

function drawRecipientAndPeriod(doc: PDFKit.PDFDocument, layout: PdfLayout, input: NativeInvoicePdfInput) {
  const boxGap = 14;
  const boxWidth = (layout.contentWidth - boxGap) / 2;
  const y = doc.y;
  infoBox(doc, layout.contentX, y, boxWidth, "Cliente", [input.recipientName, input.recipientEmail, `Estudiante: ${input.studentNameSnapshot}`]);
  infoBox(doc, layout.contentX + boxWidth + boxGap, y, boxWidth, "Periodo", [
    `${formatDate(input.periodStart)} - ${formatDate(input.periodEnd)}`,
    `Emisión: ${formatDate(input.issueDate)}`,
    `Vencimiento: ${formatDate(input.dueDate)}`,
  ]);
  resetCursor(doc, layout, y + 108);

  const cadenceY = doc.y;
  doc.roundedRect(layout.contentX, cadenceY, layout.contentWidth, 42, 14).fillAndStroke(PAPER, BORDER);
  doc.fillColor(GOLD_DEEP).font("Helvetica-Bold").fontSize(9).text("PLAN DE CLASES", layout.contentX + 16, cadenceY + 12, { width: 130 });
  doc.fillColor(INK).font("Helvetica").fontSize(10).text(`${input.sessionCount} sesiones · ${input.cadenceLabel || sessionCadenceLabel(input.sessionCount, "es")}`, layout.contentX + 150, cadenceY + 11, { width: layout.contentWidth - 166 });
  resetCursor(doc, layout, cadenceY + 58);
}

function infoBox(doc: PDFKit.PDFDocument, x: number, y: number, width: number, heading: string, lines: string[]) {
  doc.roundedRect(x, y, width, 90, 16).fillAndStroke(WHITE, BORDER);
  doc.fillColor(GOLD_DEEP).font("Helvetica-Bold").fontSize(8).text(heading.toUpperCase(), x + 14, y + 14, { width: width - 28 });
  let lineY = y + 33;
  for (const line of lines) {
    doc.fillColor(lineY === y + 33 ? INK : SOFT).font(lineY === y + 33 ? "Helvetica-Bold" : "Helvetica").fontSize(9.5).text(line, x + 14, lineY, { width: width - 28 });
    lineY += 17;
  }
}

function drawLineItems(doc: PDFKit.PDFDocument, layout: PdfLayout, input: NativeInvoicePdfInput) {
  ensureSpace(doc, 190);
  doc.fillColor(INK).font("Helvetica-Bold").fontSize(12).text("Detalle", layout.contentX, doc.y, { width: layout.contentWidth });
  doc.moveDown(0.6);
  const tableY = doc.y;
  const widths = [layout.contentWidth - 220, 52, 84, 84];
  const starts = [layout.contentX, layout.contentX + widths[0], layout.contentX + widths[0] + widths[1], layout.contentX + widths[0] + widths[1] + widths[2]];
  doc.roundedRect(layout.contentX, tableY, layout.contentWidth, 30, 10).fillAndStroke(PAPER, BORDER);
  headerCell(doc, "Descripción", starts[0] + 10, tableY + 10, widths[0] - 20, "left");
  headerCell(doc, "Cant.", starts[1], tableY + 10, widths[1] - 8, "right");
  headerCell(doc, "Valor", starts[2], tableY + 10, widths[2] - 8, "right");
  headerCell(doc, "Total", starts[3], tableY + 10, widths[3] - 10, "right");
  let y = tableY + 40;
  for (const item of input.lineItems) {
    ensureSpace(doc, 44);
    doc.strokeColor(BORDER).lineWidth(0.7).moveTo(layout.contentX, y - 8).lineTo(layout.contentRight, y - 8).stroke();
    doc.fillColor(INK).font("Helvetica").fontSize(10).text(item.description, starts[0] + 10, y, { width: widths[0] - 20 });
    doc.fillColor(SOFT).font("Helvetica").fontSize(10).text(String(item.quantity), starts[1], y, { width: widths[1] - 8, align: "right" });
    doc.text(formatCop(item.unitPriceCop, "es"), starts[2], y, { width: widths[2] - 8, align: "right" });
    doc.fillColor(INK).font("Helvetica-Bold").fontSize(10).text(formatCop(item.totalCop, "es"), starts[3], y, { width: widths[3] - 10, align: "right" });
    y += 34;
  }
  resetCursor(doc, layout, y + 10);
}

function headerCell(doc: PDFKit.PDFDocument, text: string, x: number, y: number, width: number, align: "left" | "right") {
  doc.fillColor(GOLD_DEEP).font("Helvetica-Bold").fontSize(8).text(text.toUpperCase(), x, y, { width, align });
}

function drawTotals(doc: PDFKit.PDFDocument, layout: PdfLayout, input: NativeInvoicePdfInput) {
  ensureSpace(doc, 125);
  const boxWidth = 245;
  const x = layout.contentRight - boxWidth;
  const y = doc.y;
  doc.roundedRect(x, y, boxWidth, 112, 16).fillAndStroke(WHITE, BORDER);
  totalRow(doc, x, y + 18, boxWidth, "Subtotal", input.subtotalCop, false);
  totalRow(doc, x, y + 42, boxWidth, "Impuestos", input.taxCop, false);
  doc.strokeColor(BORDER).lineWidth(1).moveTo(x + 16, y + 64).lineTo(x + boxWidth - 16, y + 64).stroke();
  totalRow(doc, x, y + 76, boxWidth, "Total", input.totalCop, true);

  if (input.notes) {
    doc.fillColor(SOFT).font("Helvetica").fontSize(9).text(input.notes, layout.contentX, y + 14, { width: layout.contentWidth - boxWidth - 24, lineGap: 3 });
  }
  resetCursor(doc, layout, y + 134);
}

function totalRow(doc: PDFKit.PDFDocument, x: number, y: number, width: number, label: string, amount: number, strong: boolean) {
  doc.fillColor(strong ? INK : SOFT).font(strong ? "Helvetica-Bold" : "Helvetica").fontSize(strong ? 14 : 10).text(label, x + 16, y, { width: 80 });
  doc.fillColor(strong ? GOLD_DEEP : INK).font(strong ? "Helvetica-Bold" : "Helvetica").fontSize(strong ? 14 : 10).text(formatCop(amount, "es"), x + 96, y, { width: width - 112, align: "right" });
}

function drawFooter(doc: PDFKit.PDFDocument, layout: PdfLayout, input: NativeInvoicePdfInput) {
  ensureSpace(doc, 90);
  const footerY = doc.y;
  doc.roundedRect(layout.contentX, footerY, layout.contentWidth, 72, 16).fillAndStroke(PAPER, BORDER);
  doc.fillColor(GOLD_DEEP).font("Helvetica-Bold").fontSize(8).text("PAGOS", layout.contentX + 16, footerY + 14, { width: 80 });
  doc.fillColor(SOFT).font("Helvetica").fontSize(9).text("Pago externo/manual por ahora. Integración con proveedor de pagos próximamente.", layout.contentX + 92, footerY + 13, { width: layout.contentWidth - 108 });
  doc.fillColor(SOFT).font("Helvetica").fontSize(8).text(input.legalFooter || "Documento interno de cobro.", layout.contentX + 16, footerY + 42, { width: layout.contentWidth - 32 });
}

function statusLabel(status: NativeInvoiceStatus) {
  const labels: Record<NativeInvoiceStatus, string> = {
    DRAFT: "BORRADOR",
    OPEN: "ABIERTA",
    PAID: "PAGADA",
    CLOSED: "CERRADA",
    VOID: "ANULADA",
  };
  return labels[status];
}

function statusColor(status: NativeInvoiceStatus) {
  if (status === NativeInvoiceStatus.PAID) return "#177a50";
  if (status === NativeInvoiceStatus.VOID) return "#a43838";
  if (status === NativeInvoiceStatus.OPEN) return GOLD_DEEP;
  return SOFT;
}

function ensureSpace(doc: PDFKit.PDFDocument, needed: number) {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (doc.y + needed > bottom) doc.addPage();
}
