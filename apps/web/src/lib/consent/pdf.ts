import "server-only";

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit/js/pdfkit.standalone.js";

import { formatDateTimeInZone } from "@/lib/i18n";
import type { AppLocale } from "@/lib/i18n/locales";

type ConsentPdfInput = {
  document: {
    version: string;
    titleEn: string;
    titleEs: string;
    bodyEn: string;
    bodyEs: string;
  };
  student: {
    name: string;
    email: string;
    timezone: string;
  };
  signer: {
    name: string;
    relationship: string;
    email: string;
  };
  signedAt: Date;
  locale: AppLocale;
  consentTextHash: string;
};

const GOLD = "#d47a00";
const GOLD_DEEP = "#b66200";
const INK = "#211f1c";
const SOFT = "#6d675f";
const BORDER = "#eadfce";
const PAPER = "#fbf8f3";

type PdfLayout = {
  contentX: number;
  contentWidth: number;
  contentRight: number;
};

export async function generateConsentPdf(input: ConsentPdfInput) {
  const doc = new PDFDocument({
    size: "LETTER",
    margin: 54,
    info: {
      Title: input.document.titleEn,
      Author: "Harmonizing Academy",
      Subject: `Consent ${input.document.version}`,
    },
  });

  const signatureFontPath = path.join(process.cwd(), "public", "fonts", "dancing-script", "DancingScript-VariableFont_wght.ttf");
  const signatureFont = existsSync(signatureFontPath) ? "Signature" : "Helvetica-Oblique";
  if (signatureFont === "Signature") {
    doc.registerFont("Signature", readFileSync(signatureFontPath));
  }

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const finished = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const layout = getLayout(doc);
  drawLogo(doc, layout);
  doc.moveDown(1.2);
  title(doc, layout, input.document.titleEs);
  title(doc, layout, input.document.titleEn, true);
  small(doc, layout, `Version: ${input.document.version}`);
  small(doc, layout, `Signed / Firmado: ${formatDateTimeInZone(input.signedAt, input.student.timezone, input.locale)} (${input.student.timezone})`);
  small(doc, layout, `Student / Estudiante: ${input.student.name} <${input.student.email}>`);
  small(doc, layout, `Signer / Firmante: ${input.signer.name} <${input.signer.email}>`);
  small(doc, layout, `Relationship / Relación: ${input.signer.relationship}`);
  small(doc, layout, `Consent hash: ${chunkText(input.consentTextHash, 16)}`);

  divider(doc, layout);
  section(doc, layout, "Consentimiento en español", input.document.bodyEs);
  divider(doc, layout);
  section(doc, layout, "English Consent", input.document.bodyEn);
  divider(doc, layout);
  signatureBlock(doc, layout, input, signatureFont);

  doc.end();
  return finished;
}

function getLayout(doc: PDFKit.PDFDocument): PdfLayout {
  const contentX = doc.page.margins.left;
  const contentRight = doc.page.width - doc.page.margins.right;
  return {
    contentX,
    contentRight,
    contentWidth: contentRight - contentX,
  };
}

function resetCursor(doc: PDFKit.PDFDocument, layout: PdfLayout, y = doc.y) {
  doc.x = layout.contentX;
  doc.y = y;
}

function chunkText(value: string, size: number) {
  return value.match(new RegExp(`.{1,${size}}`, "g"))?.join(" ") ?? value;
}

function wrapLongTokens(value: string, size = 42) {
  return value.split(/(\s+)/).map((part) => {
    if (!part || /^\s+$/.test(part) || part.length <= size) return part;
    return chunkText(part, size);
  }).join("");
}

function drawLogo(doc: PDFKit.PDFDocument, layout: PdfLayout) {
  const x = layout.contentX;
  const y = doc.page.margins.top;
  const brandX = x + 66;
  const brandY = y + 6;
  doc.roundedRect(x, y, 52, 52, 14).fillAndStroke("#ffffff", BORDER);
  doc.fillColor(GOLD_DEEP).font("Times-Roman").fontSize(9).text("H", x + 19, y + 8, { width: 16, align: "center" });
  doc.fillColor(GOLD).fontSize(22).text("2", x + 17, y + 21, { width: 18, align: "center" });
  doc.fillColor(INK).font("Times-Roman").fontSize(28).text("harmoni", brandX, brandY, { width: Math.max(108, layout.contentWidth - 66), lineBreak: false });
  doc.fillColor(GOLD).text("zing", brandX + doc.widthOfString("harmoni") - 1, brandY, { width: Math.max(50, layout.contentWidth - 174), lineBreak: false });
  doc.fillColor(SOFT).font("Helvetica").fontSize(7).text("ACADEMIA MUSICAL", x + 69, y + 37);
  resetCursor(doc, layout, y + 62);
}

function title(doc: PDFKit.PDFDocument, layout: PdfLayout, text: string, secondary = false) {
  resetCursor(doc, layout);
  doc.fillColor(secondary ? SOFT : INK).font("Times-Roman").fontSize(secondary ? 16 : 22).text(wrapLongTokens(text), layout.contentX, doc.y, {
    width: layout.contentWidth,
    lineGap: 2,
  });
  doc.moveDown(0.25);
  resetCursor(doc, layout);
}

function small(doc: PDFKit.PDFDocument, layout: PdfLayout, text: string) {
  resetCursor(doc, layout);
  doc.fillColor(SOFT).font("Helvetica").fontSize(9).text(wrapLongTokens(text, 36), layout.contentX, doc.y, { width: layout.contentWidth, lineGap: 2 });
  resetCursor(doc, layout);
}

function divider(doc: PDFKit.PDFDocument, layout: PdfLayout) {
  ensureSpace(doc, 42);
  doc.moveDown(0.8);
  const y = doc.y;
  doc.strokeColor(BORDER).lineWidth(1).moveTo(layout.contentX, y).lineTo(layout.contentRight, y).stroke();
  doc.moveDown(1);
  resetCursor(doc, layout);
}

function section(doc: PDFKit.PDFDocument, layout: PdfLayout, heading: string, body: string) {
  ensureSpace(doc, 90);
  resetCursor(doc, layout);
  doc.fillColor(GOLD_DEEP).font("Helvetica-Bold").fontSize(10).text(heading.toUpperCase(), layout.contentX, doc.y, { width: layout.contentWidth });
  doc.moveDown(0.55);
  for (const paragraph of body.split(/\n{2,}/)) {
    ensureSpace(doc, 86);
    resetCursor(doc, layout);
    doc.fillColor(INK).font("Helvetica").fontSize(10.4).text(wrapLongTokens(paragraph), layout.contentX, doc.y, {
      width: layout.contentWidth,
      lineGap: 4,
      align: "left",
    });
    doc.moveDown(0.72);
    resetCursor(doc, layout);
  }
}

function signatureBlock(doc: PDFKit.PDFDocument, layout: PdfLayout, input: ConsentPdfInput, signatureFont: string) {
  ensureSpace(doc, 150);
  resetCursor(doc, layout);
  const boxY = doc.y;
  doc.roundedRect(layout.contentX, boxY, layout.contentWidth, 122, 18).fillAndStroke(PAPER, BORDER);
  const x = layout.contentX + 20;
  const y = boxY + 18;
  const innerWidth = layout.contentWidth - 40;
  doc.fillColor(GOLD_DEEP).font("Helvetica-Bold").fontSize(9).text("FIRMA ELECTRÓNICA / ELECTRONIC SIGNATURE", x, y, { width: innerWidth });
  doc.fillColor(INK).font(signatureFont).fontSize(34).text(wrapLongTokens(input.signer.name, 28), x, y + 26, { width: innerWidth });
  doc.strokeColor(BORDER).moveTo(x, y + 70).lineTo(Math.min(x + 300, layout.contentRight - 20), y + 70).stroke();
  doc.fillColor(SOFT).font("Helvetica").fontSize(9).text(wrapLongTokens(`${input.signer.name} · ${input.signer.relationship}`, 36), x, y + 78, { width: innerWidth });
  doc.fillColor(SOFT).fontSize(9).text(`Signed / Firmado: ${input.signedAt.toISOString()}`, x, y + 94, { width: innerWidth });
  resetCursor(doc, layout, boxY + 122);
}

function ensureSpace(doc: PDFKit.PDFDocument, needed: number) {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (doc.y + needed > bottom) {
    doc.addPage();
  }
}
