import "server-only";

import PDFDocument from "pdfkit/js/pdfkit.standalone.js";
import { StudentExamArea } from "@prisma/client";

import { formatDate } from "@/lib/i18n";
import type { StudentExamAssessmentWithScores } from "@/lib/exam-assessments";

type ExamPdfInput = StudentExamAssessmentWithScores;

type Layout = { contentX: number; contentWidth: number; contentRight: number };

const GOLD = "#ef8f00";
const GOLD_SOFT = "#f8cfad";
const INK = "#111111";
const SOFT = "#555555";
const BORDER = "#646464";
const WHITE = "#ffffff";

export async function generateExamAssessmentPdf(input: ExamPdfInput) {
  const doc = new PDFDocument({ size: "LETTER", margin: 52, info: { Title: input.title, Author: "Harmonizing Academy", Subject: "Examen de piano" } });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const finished = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  const layout = getLayout(doc);
  drawHeader(doc, layout, input);
  drawRepertoire(doc, layout, input);
  drawArea(doc, layout, "2.  Armonía:", input.areaScores.filter((row) => row.area === StudentExamArea.HARMONY));
  drawArea(doc, layout, "3.  Lectura musical:", input.areaScores.filter((row) => row.area === StudentExamArea.MUSIC_READING));
  drawOverall(doc, layout, input);

  doc.end();
  return finished;
}

function getLayout(doc: PDFKit.PDFDocument): Layout {
  const contentX = doc.page.margins.left;
  const contentRight = doc.page.width - doc.page.margins.right;
  return { contentX, contentRight, contentWidth: contentRight - contentX };
}

function drawHeader(doc: PDFKit.PDFDocument, layout: Layout, input: ExamPdfInput) {
  const top = doc.page.margins.top + 10;
  const logoX = layout.contentX + 22;
  doc.roundedRect(logoX, top + 18, 54, 54, 8).fill(GOLD);
  doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(30).text("h", logoX + 10, top + 27, { width: 15, align: "center" });
  doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(30).text("a", logoX + 27, top + 27, { width: 18, align: "center" });

  const textX = logoX + 92;
  doc.fillColor(INK).font("Helvetica").fontSize(11).text(`Fecha: ${formatDate(input.examDate, "es")}`, textX, top + 8, { width: layout.contentRight - textX });
  doc.text(`Estudiante: ${input.student.user.name}`, textX, top + 34, { width: layout.contentRight - textX });
  doc.text(input.title, textX, top + 62, { width: layout.contentRight - textX });
  doc.fillColor(SOFT).fontSize(8).text(`Docente: ${input.teacher.user.name}`, textX, top + 86, { width: layout.contentRight - textX });
  setY(doc, top + 150);
}

function drawRepertoire(doc: PDFKit.PDFDocument, layout: Layout, input: ExamPdfInput) {
  ensureSpace(doc, 140);
  doc.fillColor(INK).font("Helvetica").fontSize(11).text("1.    Repertorio:", layout.contentX + 20, doc.y);
  setY(doc, doc.y + 48);

  const columns = [142, 108, 78, 78, layout.contentWidth - 406];
  const headers = ["Canciones:", "Interpretación", "Ejecución", "Puntaje", "Comentarios"];
  drawTableHeader(doc, layout, columns, headers);

  for (const row of input.repertoireScores) {
    const values = [row.titleSnapshot, `${formatScore(row.interpretationScore)}/10`, `${formatScore(row.executionScore)}/10`, `${formatScore(row.overallScore)}/10`, row.comments ?? ""];
    drawTableRow(doc, layout, columns, values);
  }

  const total = average(input.repertoireScores.map((row) => row.overallScore));
  doc.fillColor(INK).font("Helvetica").fontSize(10).text("Total:", layout.contentX, doc.y + 6, { width: 42 });
  doc.font("Helvetica-Bold").text(total ? formatScore(total, true) : "-", layout.contentX + 50, doc.y - 11, { width: 60 });
  setY(doc, doc.y + 30);
}

function drawArea(doc: PDFKit.PDFDocument, layout: Layout, title: string, rows: ExamPdfInput["areaScores"]) {
  ensureSpace(doc, 110);
  doc.fillColor(INK).font("Helvetica").fontSize(11).text(title, layout.contentX + 20, doc.y + 8);
  setY(doc, doc.y + 42);
  const columns = [130, 170, 74, layout.contentWidth - 374];
  drawTableHeader(doc, layout, columns, ["Tema", "Objetivo", "Puntaje", "Comentarios"]);
  for (const row of rows) {
    drawTableRow(doc, layout, columns, [row.topic, row.objective, `${formatScore(row.score)}/10`, row.comments ?? ""]);
  }
  const total = average(rows.map((row) => row.score));
  doc.fillColor(INK).font("Helvetica").fontSize(10).text("Total:", layout.contentX, doc.y + 6, { width: 42 });
  doc.font("Helvetica-Bold").text(total ? formatScore(total, true) : "-", layout.contentX + 50, doc.y - 11, { width: 60 });
  setY(doc, doc.y + 30);
}

function drawOverall(doc: PDFKit.PDFDocument, layout: Layout, input: ExamPdfInput) {
  const repertoire = average(input.repertoireScores.map((row) => row.overallScore));
  const harmony = average(input.areaScores.filter((row) => row.area === StudentExamArea.HARMONY).map((row) => row.score));
  const reading = average(input.areaScores.filter((row) => row.area === StudentExamArea.MUSIC_READING).map((row) => row.score));
  const total = average([repertoire, harmony, reading].filter((value): value is number => value !== null));
  ensureSpace(doc, 80);
  doc.roundedRect(layout.contentX, doc.y + 8, layout.contentWidth, 52, 12).fillAndStroke("#fbf8f3", "#eadfce");
  doc.fillColor(INK).font("Helvetica-Bold").fontSize(12).text("Total general:", layout.contentX + 18, doc.y + 26, { width: 130 });
  doc.fillColor(GOLD).font("Helvetica-Bold").fontSize(16).text(total ? `${formatScore(total, true)}/10` : "-", layout.contentX + 145, doc.y - 18, { width: 120 });
  if (input.notes) doc.fillColor(SOFT).font("Helvetica").fontSize(9).text(input.notes, layout.contentX + 260, doc.y - 18, { width: layout.contentWidth - 278, lineGap: 2 });
}

function drawTableHeader(doc: PDFKit.PDFDocument, layout: Layout, columns: number[], headers: string[]) {
  ensureSpace(doc, 34);
  const y = doc.y;
  doc.rect(layout.contentX, y, layout.contentWidth, 20).fillAndStroke(GOLD_SOFT, BORDER);
  let x = layout.contentX;
  headers.forEach((header, index) => {
    doc.fillColor(INK).font("Helvetica").fontSize(9).text(header, x + 4, y + 5, { width: columns[index] - 8 });
    if (index > 0) doc.strokeColor(BORDER).lineWidth(0.6).moveTo(x, y).lineTo(x, y + 20).stroke();
    x += columns[index];
  });
  setY(doc, y + 20);
}

function drawTableRow(doc: PDFKit.PDFDocument, layout: Layout, columns: number[], values: string[]) {
  const fontSize = 9.5;
  const heights = values.map((value, index) => doc.heightOfString(value || "-", { width: columns[index] - 8, lineGap: 2 }));
  const rowHeight = Math.max(22, Math.max(...heights) + 10);
  ensureSpace(doc, rowHeight + 12);
  const y = doc.y;
  doc.rect(layout.contentX, y, layout.contentWidth, rowHeight).fillAndStroke(WHITE, BORDER);
  let x = layout.contentX;
  values.forEach((value, index) => {
    if (index > 0) doc.strokeColor(BORDER).lineWidth(0.6).moveTo(x, y).lineTo(x, y + rowHeight).stroke();
    doc.fillColor(INK).font("Helvetica").fontSize(fontSize).text(value || "-", x + 4, y + 6, { width: columns[index] - 8, lineGap: 2 });
    x += columns[index];
  });
  setY(doc, y + rowHeight);
}

function ensureSpace(doc: PDFKit.PDFDocument, needed: number) {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (doc.y + needed > bottom) doc.addPage();
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
