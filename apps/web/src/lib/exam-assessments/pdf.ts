import "server-only";

import PDFDocument from "pdfkit/js/pdfkit.standalone.js";
import { StudentExamArea } from "@prisma/client";

import { formatDate } from "@/lib/i18n";
import type { StudentExamAssessmentWithScores } from "@/lib/exam-assessments";

type ExamPdfInput = StudentExamAssessmentWithScores;

type Layout = {
  contentX: number;
  contentWidth: number;
  contentRight: number;
  bottom: number;
};

type TableRow = {
  values: string[];
  scoreColumns?: number[];
};

const CANVAS = "#f6efe6";
const PAPER = "#fffdf8";
const PAPER_SOFT = "#fbf6ee";
const GOLD = "#b7792c";
const GOLD_DEEP = "#6f4219";
const GOLD_SOFT = "#f4dfc4";
const INK = "#211a14";
const SOFT = "#6e645b";
const MUTED = "#9a8b7a";
const BORDER_LIGHT = "#eadfce";
const WHITE = "#ffffff";

export async function generateExamAssessmentPdf(input: ExamPdfInput) {
  const doc = new PDFDocument({
    size: "LETTER",
    margin: 46,
    bufferPages: true,
    info: { Title: input.title, Author: "Harmonizing Academy", Subject: "Informe de examen de piano" },
  });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const finished = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  const layout = getLayout(doc);
  drawPageBackground(doc);
  drawHeader(doc, layout, input);
  drawSummary(doc, layout, input);
  drawRepertoire(doc, layout, input);
  drawArea(doc, layout, {
    number: "2",
    title: "Armonía",
    description: "Temas, objetivos y observaciones trabajadas durante la evaluación.",
    rows: input.areaScores.filter((row) => row.area === StudentExamArea.HARMONY),
  });
  drawArea(doc, layout, {
    number: "3",
    title: "Lectura musical",
    description: "Lectura, comprensión y aplicación musical observada en el examen.",
    rows: input.areaScores.filter((row) => row.area === StudentExamArea.MUSIC_READING),
  });
  drawNotesAndOverall(doc, layout, input);
  drawFooters(doc, layout);

  doc.end();
  return finished;
}

function getLayout(doc: PDFKit.PDFDocument): Layout {
  const contentX = doc.page.margins.left;
  const contentRight = doc.page.width - doc.page.margins.right;
  const bottom = doc.page.height - doc.page.margins.bottom;
  return { contentX, contentRight, contentWidth: contentRight - contentX, bottom };
}

function drawPageBackground(doc: PDFKit.PDFDocument) {
  doc.save();
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(CANVAS);
  doc.restore();
}

function drawHeader(doc: PDFKit.PDFDocument, layout: Layout, input: ExamPdfInput) {
  const top = doc.page.margins.top;
  const paddingX = 18;
  const logoCenterX = layout.contentX + 42;
  const logoCenterY = top + 42;
  const brandX = layout.contentX + 78;
  const metaWidth = 168;
  const metaX = layout.contentRight - paddingX - metaWidth;
  const titleWidth = Math.max(186, metaX - brandX - 24);
  const titleY = top + 42;
  const subtitle = "Resultados académicos internos y familiares";

  doc.font("Helvetica-Bold").fontSize(20);
  const titleHeight = doc.heightOfString("Informe de examen de piano", { width: titleWidth, lineGap: 1 });
  doc.font("Helvetica").fontSize(9.5);
  const subtitleHeight = doc.heightOfString(subtitle, { width: titleWidth });
  const leftBlockBottom = titleY + titleHeight + 7 + subtitleHeight;
  const metaBlockBottom = top + 94;
  const pillY = Math.max(leftBlockBottom, metaBlockBottom, logoCenterY + 24) + 16;
  const cardHeight = Math.max(124, pillY + 26 - top + 14);

  doc.roundedRect(layout.contentX, top, layout.contentWidth, cardHeight, 20).fillAndStroke(PAPER, BORDER_LIGHT);

  doc.circle(logoCenterX, logoCenterY, 24).fill(GOLD);
  doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(20).text("ha", layout.contentX + 25, top + 29, { width: 34, align: "center" });
  doc.fillColor(GOLD_DEEP).font("Helvetica-Bold").fontSize(9).text("HARMONIZING ACADEMY", brandX, top + 24, { width: titleWidth, characterSpacing: 1.6 });
  doc.fillColor(INK).font("Helvetica-Bold").fontSize(20).text("Informe de examen de piano", brandX, titleY, { width: titleWidth, lineGap: 1 });
  doc.fillColor(SOFT).font("Helvetica").fontSize(9.5).text(subtitle, brandX, titleY + titleHeight + 7, { width: titleWidth });

  doc.roundedRect(metaX - 10, top + 18, metaWidth + 10, 86, 14).fill(PAPER_SOFT);
  drawMetaLine(doc, metaX, top + 24, metaWidth, "Fecha", formatDate(input.examDate, "es"));
  drawMetaLine(doc, metaX, top + 49, metaWidth, "Estudiante", input.student.user.name);
  drawMetaLine(doc, metaX, top + 74, metaWidth, "Docente", input.teacher.user.name);

  doc.roundedRect(layout.contentX + paddingX, pillY, layout.contentWidth - paddingX * 2, 22, 11).fill(PAPER_SOFT);
  doc.fillColor(INK).font("Helvetica-Bold").fontSize(10).text(input.title, layout.contentX + 32, pillY + 6, { width: layout.contentWidth - 64, ellipsis: true });
  setY(doc, top + cardHeight + 20);
}

function drawMetaLine(doc: PDFKit.PDFDocument, x: number, y: number, width: number, label: string, value: string) {
  doc.fillColor(MUTED).font("Helvetica-Bold").fontSize(6.8).text(label.toUpperCase(), x, y, { width, characterSpacing: 1 });
  doc.fillColor(INK).font("Helvetica").fontSize(9.2).text(value, x, y + 9, { width, ellipsis: true });
}

function drawSummary(doc: PDFKit.PDFDocument, layout: Layout, input: ExamPdfInput) {
  const repertoire = average(input.repertoireScores.map((row) => row.overallScore));
  const harmony = average(input.areaScores.filter((row) => row.area === StudentExamArea.HARMONY).map((row) => row.score));
  const reading = average(input.areaScores.filter((row) => row.area === StudentExamArea.MUSIC_READING).map((row) => row.score));
  const total = average([repertoire, harmony, reading].filter((value): value is number => value !== null));
  const cards = [
    { label: "Repertorio", value: repertoire },
    { label: "Armonía", value: harmony },
    { label: "Lectura musical", value: reading },
    { label: "Total general", value: total, featured: true },
  ];
  const gap = 10;
  const width = (layout.contentWidth - gap * 3) / 4;
  const y = doc.y;
  ensureSpace(doc, 76);
  cards.forEach((card, index) => {
    const x = layout.contentX + index * (width + gap);
    doc.roundedRect(x, y, width, 62, 14).fillAndStroke(card.featured ? GOLD : PAPER, card.featured ? GOLD_DEEP : BORDER_LIGHT);
    doc.fillColor(card.featured ? WHITE : MUTED).font("Helvetica-Bold").fontSize(7).text(card.label.toUpperCase(), x + 10, y + 12, { width: width - 20, characterSpacing: 0.8 });
    doc.fillColor(card.featured ? WHITE : INK).font("Helvetica-Bold").fontSize(18).text(card.value ? `${formatScore(card.value, true)}/10` : "-", x + 10, y + 28, { width: width - 20 });
  });
  setY(doc, y + 82);
}

function drawRepertoire(doc: PDFKit.PDFDocument, layout: Layout, input: ExamPdfInput) {
  const rows = input.repertoireScores.map((row) => ({
    values: [
      [row.titleSnapshot, row.composerSnapshot].filter(Boolean).join("\n"),
      `${formatScore(row.interpretationScore)}/10`,
      `${formatScore(row.executionScore)}/10`,
      `${formatScore(row.overallScore)}/10`,
      row.comments ?? "",
    ],
    scoreColumns: [1, 2, 3],
  }));
  drawSection(doc, layout, {
    number: "1",
    title: "Repertorio",
    description: "Interpretación, ejecución y resultado general por obra evaluada.",
    columns: [150, 86, 74, 72, layout.contentWidth - 382],
    headers: ["Canción", "Interpretación", "Ejecución", "Puntaje", "Comentarios"],
    rows,
    totalLabel: "Promedio repertorio",
    total: average(input.repertoireScores.map((row) => row.overallScore)),
  });
}

function drawArea(doc: PDFKit.PDFDocument, layout: Layout, input: { number: string; title: string; description: string; rows: ExamPdfInput["areaScores"] }) {
  drawSection(doc, layout, {
    number: input.number,
    title: input.title,
    description: input.description,
    columns: [126, 160, 66, layout.contentWidth - 352],
    headers: ["Tema", "Objetivo", "Puntaje", "Comentarios"],
    rows: input.rows.map((row) => ({ values: [row.topic, row.objective, `${formatScore(row.score)}/10`, row.comments ?? ""], scoreColumns: [2] })),
    totalLabel: `Promedio ${input.title.toLowerCase()}`,
    total: average(input.rows.map((row) => row.score)),
  });
}

function drawSection(doc: PDFKit.PDFDocument, layout: Layout, input: { number: string; title: string; description: string; columns: number[]; headers: string[]; rows: TableRow[]; totalLabel: string; total: number | null }) {
  ensureSpace(doc, 118);
  const y = doc.y;
  doc.roundedRect(layout.contentX, y, layout.contentWidth, 54, 16).fillAndStroke(PAPER, BORDER_LIGHT);
  doc.circle(layout.contentX + 25, y + 27, 14).fill(GOLD_SOFT);
  doc.fillColor(GOLD_DEEP).font("Helvetica-Bold").fontSize(11).text(input.number, layout.contentX + 20, y + 20, { width: 10, align: "center" });
  doc.fillColor(INK).font("Helvetica-Bold").fontSize(14).text(input.title, layout.contentX + 50, y + 12, { width: 220 });
  doc.fillColor(SOFT).font("Helvetica").fontSize(8.8).text(input.description, layout.contentX + 50, y + 31, { width: layout.contentWidth - 166 });
  doc.fillColor(GOLD_DEEP).font("Helvetica-Bold").fontSize(11).text(input.total ? `${formatScore(input.total, true)}/10` : "-", layout.contentRight - 84, y + 18, { width: 66, align: "right" });
  setY(doc, y + 68);

  if (!input.rows.length) {
    drawEmptyState(doc, layout, "Sin filas registradas para esta sección.");
    return;
  }

  drawTableHeader(doc, layout, input.columns, input.headers);
  input.rows.forEach((row, index) => drawTableRow(doc, layout, input.columns, row, index));
  drawSectionTotal(doc, layout, input.totalLabel, input.total);
}

function drawEmptyState(doc: PDFKit.PDFDocument, layout: Layout, text: string) {
  ensureSpace(doc, 42);
  const y = doc.y;
  doc.roundedRect(layout.contentX, y, layout.contentWidth, 32, 12).fillAndStroke(PAPER_SOFT, BORDER_LIGHT);
  doc.fillColor(SOFT).font("Helvetica").fontSize(9).text(text, layout.contentX + 14, y + 10, { width: layout.contentWidth - 28 });
  setY(doc, y + 46);
}

function drawTableHeader(doc: PDFKit.PDFDocument, layout: Layout, columns: number[], headers: string[]) {
  const paddingX = 8;
  const fontSize = 6.7;
  const lineGap = 1;
  doc.font("Helvetica-Bold").fontSize(fontSize);
  const heights = headers.map((header, index) =>
    doc.heightOfString(header.toUpperCase(), {
      width: columns[index] - paddingX * 2,
      characterSpacing: 0.15,
      lineGap,
    }),
  );
  const headerHeight = Math.max(26, Math.max(...heights) + 15);
  ensureSpace(doc, headerHeight + 14);
  const y = doc.y;
  doc.roundedRect(layout.contentX, y, layout.contentWidth, headerHeight, 10).fillAndStroke(GOLD_DEEP, GOLD_DEEP);
  let x = layout.contentX;
  headers.forEach((header, index) => {
    const textHeight = heights[index];
    doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(fontSize).text(header.toUpperCase(), x + paddingX, y + (headerHeight - textHeight) / 2, {
      width: columns[index] - paddingX * 2,
      characterSpacing: 0.15,
      lineGap,
    });
    x += columns[index];
  });
  setY(doc, y + headerHeight);
}

function drawTableRow(doc: PDFKit.PDFDocument, layout: Layout, columns: number[], row: TableRow, index: number) {
  const paddingX = 7;
  const lineGap = 2;
  const heights = row.values.map((value, cellIndex) => doc.heightOfString(value || "-", { width: columns[cellIndex] - paddingX * 2, lineGap }));
  const rowHeight = Math.max(34, Math.max(...heights) + 15);
  ensureSpace(doc, rowHeight + 20);
  const y = doc.y;
  doc.rect(layout.contentX, y, layout.contentWidth, rowHeight).fillAndStroke(index % 2 === 0 ? PAPER : PAPER_SOFT, BORDER_LIGHT);
  let x = layout.contentX;
  row.values.forEach((value, cellIndex) => {
    if (cellIndex > 0) doc.strokeColor(BORDER_LIGHT).lineWidth(0.45).moveTo(x, y).lineTo(x, y + rowHeight).stroke();
    if (row.scoreColumns?.includes(cellIndex)) {
      drawScorePill(doc, x + 8, y + 9, columns[cellIndex] - 16, value || "-");
    } else {
      const lines = value.split("\n");
      doc.fillColor(INK).font("Helvetica-Bold").fontSize(8.8).text(lines[0] || "-", x + paddingX, y + 8, { width: columns[cellIndex] - paddingX * 2, lineGap });
      if (lines.length > 1) {
        doc.fillColor(SOFT).font("Helvetica").fontSize(8).text(lines.slice(1).join("\n"), x + paddingX, doc.y + 1, { width: columns[cellIndex] - paddingX * 2, lineGap });
      }
    }
    x += columns[cellIndex];
  });
  setY(doc, y + rowHeight);
}

function drawScorePill(doc: PDFKit.PDFDocument, x: number, y: number, width: number, value: string) {
  doc.roundedRect(x, y, width, 20, 10).fillAndStroke(GOLD_SOFT, "#e4c79d");
  doc.fillColor(GOLD_DEEP).font("Helvetica-Bold").fontSize(8.8).text(value, x, y + 6, { width, align: "center" });
}

function drawSectionTotal(doc: PDFKit.PDFDocument, layout: Layout, label: string, value: number | null) {
  ensureSpace(doc, 48);
  const y = doc.y + 8;
  const width = 188;
  doc.roundedRect(layout.contentRight - width, y, width, 30, 15).fillAndStroke(PAPER, BORDER_LIGHT);
  doc.fillColor(SOFT).font("Helvetica-Bold").fontSize(7).text(label.toUpperCase(), layout.contentRight - width + 14, y + 10, { width: 110, characterSpacing: 0.4 });
  doc.fillColor(GOLD_DEEP).font("Helvetica-Bold").fontSize(11).text(value ? `${formatScore(value, true)}/10` : "-", layout.contentRight - 60, y + 8, { width: 46, align: "right" });
  setY(doc, y + 48);
}

function drawNotesAndOverall(doc: PDFKit.PDFDocument, layout: Layout, input: ExamPdfInput) {
  const repertoire = average(input.repertoireScores.map((row) => row.overallScore));
  const harmony = average(input.areaScores.filter((row) => row.area === StudentExamArea.HARMONY).map((row) => row.score));
  const reading = average(input.areaScores.filter((row) => row.area === StudentExamArea.MUSIC_READING).map((row) => row.score));
  const total = average([repertoire, harmony, reading].filter((value): value is number => value !== null));
  ensureSpace(doc, input.notes ? 118 : 82);
  const y = doc.y;
  doc.roundedRect(layout.contentX, y, layout.contentWidth, input.notes ? 104 : 68, 18).fillAndStroke(GOLD_DEEP, GOLD_DEEP);
  doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(8).text("CIERRE DE EVALUACIÓN", layout.contentX + 18, y + 17, { characterSpacing: 1.1 });
  doc.font("Helvetica-Bold").fontSize(22).text(total ? `${formatScore(total, true)}/10` : "-", layout.contentX + 18, y + 35, { width: 120 });
  doc.font("Helvetica").fontSize(10).text("Total general", layout.contentX + 126, y + 42, { width: 120 });
  if (input.notes) {
    doc.fillColor("#fff2df").font("Helvetica-Bold").fontSize(8).text("Notas generales", layout.contentX + 262, y + 18, { width: layout.contentWidth - 284 });
    doc.fillColor(WHITE).font("Helvetica").fontSize(8.5).text(input.notes, layout.contentX + 262, y + 32, { width: layout.contentWidth - 284, lineGap: 2 });
  }
  setY(doc, y + (input.notes ? 126 : 90));
}

function drawFooters(doc: PDFKit.PDFDocument, layout: Layout) {
  const range = doc.bufferedPageRange();
  for (let pageIndex = range.start; pageIndex < range.start + range.count; pageIndex += 1) {
    doc.switchToPage(pageIndex);
    const footerY = doc.page.height - 34;
    doc.strokeColor(BORDER_LIGHT).lineWidth(0.6).moveTo(layout.contentX, footerY - 10).lineTo(layout.contentRight, footerY - 10).stroke();
    doc.fillColor(MUTED).font("Helvetica").fontSize(7.5).text("Harmonizing Academy · Informe académico confidencial", layout.contentX, footerY, { width: 280 });
    doc.text(`Página ${pageIndex + 1} de ${range.count}`, layout.contentRight - 90, footerY, { width: 90, align: "right" });
  }
}

function ensureSpace(doc: PDFKit.PDFDocument, needed: number) {
  const bottom = doc.page.height - doc.page.margins.bottom - 18;
  if (doc.y + needed <= bottom) return;
  doc.addPage();
  drawPageBackground(doc);
  setY(doc, doc.page.margins.top);
}

function setY(doc: PDFKit.PDFDocument, y: number) {
  doc.x = doc.page.margins.left;
  doc.y = y;
}

function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function formatScore(value: number, comma = false) {
  const formatted = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return comma ? formatted.replace(".", ",") : formatted;
}
