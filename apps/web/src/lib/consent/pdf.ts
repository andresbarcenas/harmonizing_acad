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

  drawLogo(doc);
  doc.moveDown(1.2);
  title(doc, input.document.titleEs);
  title(doc, input.document.titleEn, true);
  small(doc, `Version: ${input.document.version}`);
  small(doc, `Signed / Firmado: ${formatDateTimeInZone(input.signedAt, input.student.timezone, input.locale)} (${input.student.timezone})`);
  small(doc, `Student / Estudiante: ${input.student.name} <${input.student.email}>`);
  small(doc, `Signer / Firmante: ${input.signer.name} <${input.signer.email}>`);
  small(doc, `Relationship / Relación: ${input.signer.relationship}`);
  small(doc, `Consent hash: ${input.consentTextHash}`);

  divider(doc);
  section(doc, "Consentimiento en español", input.document.bodyEs);
  divider(doc);
  section(doc, "English Consent", input.document.bodyEn);
  divider(doc);
  signatureBlock(doc, input, signatureFont);

  doc.end();
  return finished;
}

function drawLogo(doc: PDFKit.PDFDocument) {
  const x = doc.x;
  const y = doc.y;
  doc.roundedRect(x, y, 52, 52, 14).fillAndStroke("#ffffff", BORDER);
  doc.fillColor(GOLD_DEEP).font("Times-Roman").fontSize(9).text("H", x + 19, y + 8, { width: 16, align: "center" });
  doc.fillColor(GOLD).fontSize(22).text("2", x + 17, y + 21, { width: 18, align: "center" });
  doc.fillColor(INK).font("Times-Roman").fontSize(28).text("harmoni", x + 66, y + 6, { continued: true });
  doc.fillColor(GOLD).text("zing");
  doc.fillColor(SOFT).font("Helvetica").fontSize(7).text("ACADEMIA MUSICAL", x + 69, y + 37);
  doc.moveDown(4.5);
}

function title(doc: PDFKit.PDFDocument, text: string, secondary = false) {
  doc.fillColor(secondary ? SOFT : INK).font("Times-Roman").fontSize(secondary ? 16 : 22).text(text, {
    width: 500,
    lineGap: 2,
  });
  doc.moveDown(0.25);
}

function small(doc: PDFKit.PDFDocument, text: string) {
  doc.fillColor(SOFT).font("Helvetica").fontSize(9).text(text, { width: 500, lineGap: 2 });
}

function divider(doc: PDFKit.PDFDocument) {
  ensureSpace(doc, 42);
  doc.moveDown(0.8);
  const y = doc.y;
  doc.strokeColor(BORDER).lineWidth(1).moveTo(doc.page.margins.left, y).lineTo(doc.page.width - doc.page.margins.right, y).stroke();
  doc.moveDown(1);
}

function section(doc: PDFKit.PDFDocument, heading: string, body: string) {
  ensureSpace(doc, 90);
  doc.fillColor(GOLD_DEEP).font("Helvetica-Bold").fontSize(10).text(heading.toUpperCase(), { width: 500 });
  doc.moveDown(0.55);
  for (const paragraph of body.split(/\n{2,}/)) {
    ensureSpace(doc, 86);
    doc.fillColor(INK).font("Helvetica").fontSize(10.4).text(paragraph, {
      width: 500,
      lineGap: 4,
      align: "left",
    });
    doc.moveDown(0.72);
  }
}

function signatureBlock(doc: PDFKit.PDFDocument, input: ConsentPdfInput, signatureFont: string) {
  ensureSpace(doc, 150);
  doc.roundedRect(doc.x, doc.y, 500, 122, 18).fillAndStroke(PAPER, BORDER);
  const x = doc.x + 20;
  const y = doc.y + 18;
  doc.fillColor(GOLD_DEEP).font("Helvetica-Bold").fontSize(9).text("FIRMA ELECTRÓNICA / ELECTRONIC SIGNATURE", x, y);
  doc.fillColor(INK).font(signatureFont).fontSize(34).text(input.signer.name, x, y + 26, { width: 460 });
  doc.strokeColor(BORDER).moveTo(x, y + 70).lineTo(x + 300, y + 70).stroke();
  doc.fillColor(SOFT).font("Helvetica").fontSize(9).text(`${input.signer.name} · ${input.signer.relationship}`, x, y + 78);
  doc.fillColor(SOFT).fontSize(9).text(`Signed / Firmado: ${input.signedAt.toISOString()}`, x, y + 94);
}

function ensureSpace(doc: PDFKit.PDFDocument, needed: number) {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (doc.y + needed > bottom) {
    doc.addPage();
  }
}
