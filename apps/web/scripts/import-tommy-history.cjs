#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
const { createHash } = require('node:crypto');
const { existsSync } = require('node:fs');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const { PrismaClient, Role } = require('@prisma/client');
const { hash } = require('bcryptjs');

const prisma = new PrismaClient();

const DEFAULT_PDF_PATH = '/Users/andresbarcenas/Downloads/Consolidado Tommy.pdf';
const CONTAINER_PDF_FALLBACK_PATH = '/imports/Consolidado Tommy.pdf';
const DEFAULT_STUDENT_EMAIL = 'tommy@harmonizing.com';
const DEFAULT_STUDENT_NAME = 'Tommy';
const DEFAULT_INSTRUMENT = 'Piano';
const DEFAULT_TIMEZONE = 'America/New_York';
const DEFAULT_LOCALE = 'es';
const DEFAULT_CREATED_BY_EMAIL = 'admin@harmonizing.com';
const DEFAULT_TEACHER_EMAIL = 'maria@harmonizing.com';

const KNOWN_REPERTOIRE = [
  'Believer',
  'Para Elisa',
  'Jurassic Park',
  'Jurassic World',
  'Titanic',
  'Allegretto 1',
  'Allegretto',
  'Jingle Bells',
  'Whirling Leaves',
  'Minuet in G',
  'Minuet',
  'Hello',
  'Aleluya',
  'Hallelujah',
  'Stereo Madness',
  'Tommy Song',
  'Someone like you',
  'Nubole Bianche',
  'Nuvole Bianche',
  'Worlds Smallest Violin',
  "World's Smallest Violin",
  'Sobre Las olas',
  'Sobre las olas',
  'Vuelta de Blues',
  'Another Love',
  'Burrito Sabanero',
  'Experience',
  'Moonlight',
];

function parseArgs(argv) {
  const args = {
    pdf: DEFAULT_PDF_PATH,
    studentEmail: DEFAULT_STUDENT_EMAIL,
    studentName: DEFAULT_STUDENT_NAME,
    instrument: DEFAULT_INSTRUMENT,
    timezone: DEFAULT_TIMEZONE,
    locale: DEFAULT_LOCALE,
    phone: '+1 305 555 0140',
    bio: 'Cuenta creada para importar historial musical previo.',
    createdByEmail: DEFAULT_CREATED_BY_EMAIL,
    teacherEmail: DEFAULT_TEACHER_EMAIL,
    dryRun: false,
    environmentNote: 'Historical PDF import. Review staged rows before applying to progress records.',
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--pdf') args.pdf = argv[++index];
    else if (arg === '--student-email') args.studentEmail = argv[++index];
    else if (arg === '--student-name') args.studentName = argv[++index];
    else if (arg === '--instrument') args.instrument = argv[++index];
    else if (arg === '--timezone') args.timezone = argv[++index];
    else if (arg === '--locale') args.locale = argv[++index];
    else if (arg === '--phone') args.phone = argv[++index];
    else if (arg === '--bio') args.bio = argv[++index];
    else if (arg === '--created-by-email') args.createdByEmail = argv[++index];
    else if (arg === '--teacher-email') args.teacherEmail = argv[++index];
    else if (arg === '--note') args.environmentNote = argv[++index];
  }

  return args;
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function normalizeText(text) {
  return String(text ?? '')
    .replace(/\u0000/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractDate(text) {
  const numeric = text.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/);
  if (numeric) {
    const day = Number(numeric[1]);
    const month = Number(numeric[2]) - 1;
    const year = Number(numeric[3].length === 2 ? `20${numeric[3]}` : numeric[3]);
    return new Date(Date.UTC(year, month, day, 12, 0, 0, 0)).toISOString();
  }

  const spanishMonth = text.match(/\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)(?:\s+de\s+(\d{4}))?/i);
  if (spanishMonth) {
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const day = Number(spanishMonth[1]);
    const month = months.indexOf(spanishMonth[2].toLowerCase());
    const year = spanishMonth[3] ? Number(spanishMonth[3]) : null;
    return year ? new Date(Date.UTC(year, month, day, 12, 0, 0, 0)).toISOString() : null;
  }

  return null;
}

function extractGrade(text) {
  const total = text.match(/Total:\s*([0-9]+(?:[.,][0-9]+)?)/i);
  if (total) return Number(total[1].replace(',', '.'));

  const numbers = [...text.matchAll(/\b(100|[1-9][0-9](?:[.,][0-9]+)?)\b/g)].map((match) => Number(match[1].replace(',', '.')));
  const plausible = numbers.filter((number) => number >= 50 && number <= 100);
  return plausible.length >= 3 ? plausible[plausible.length - 1] : null;
}

function gradeLetterFromPercent(percent) {
  if (percent == null) return null;
  if (percent >= 97) return 'A+';
  if (percent >= 93) return 'A';
  if (percent >= 90) return 'A-';
  if (percent >= 87) return 'B+';
  if (percent >= 83) return 'B';
  if (percent >= 80) return 'B-';
  if (percent >= 77) return 'C+';
  if (percent >= 73) return 'C';
  if (percent >= 70) return 'C-';
  if (percent >= 60) return 'D';
  return 'F';
}

function extractKnownRepertoire(text) {
  const lower = text.toLowerCase();
  const found = [];
  for (const name of KNOWN_REPERTOIRE) {
    if (lower.includes(name.toLowerCase()) && !found.some((item) => item.toLowerCase() === name.toLowerCase())) {
      found.push(name);
    }
  }
  return found;
}

function classifyPage(pageNumber, text, sourceFilename) {
  const rawText = normalizeText(text);
  const date = extractDate(rawText);
  const songs = extractKnownRepertoire(rawText);
  const gradePercentage = extractGrade(rawText);
  const commonPayload = {
    sourcePage: pageNumber,
    extractedDate: date,
    source: sourceFilename,
    songs,
  };

  if (!rawText) {
    return {
      suggestedType: 'SOURCE_ONLY',
      confidence: 0.1,
      suggestedPayload: { ...commonPayload, reason: 'No extractable text. OCR or visual review may be needed.' },
    };
  }

  if (/\bexamen\b/i.test(rawText)) {
    return {
      suggestedType: 'PROGRESS_REPORT',
      confidence: gradePercentage != null ? 0.95 : 0.72,
      suggestedPayload: {
        ...commonPayload,
        title: date ? `Examen histórico ${date.slice(0, 10)}` : `Examen histórico página ${pageNumber}`,
        gradePercentage,
        gradeLetter: gradeLetterFromPercent(gradePercentage),
        reportSummary: rawText,
      },
    };
  }

  if (/^\s*(tarea|rutina)\s*:/i.test(rawText) || /\btocar\b/i.test(rawText) && /\bveces?\b/i.test(rawText)) {
    return {
      suggestedType: 'PRACTICE_ASSIGNMENT',
      confidence: 0.86,
      suggestedPayload: {
        ...commonPayload,
        title: /^\s*Rutina\s*:/i.test(rawText) ? `Rutina histórica página ${pageNumber}` : `Tarea histórica página ${pageNumber}`,
        instructions: rawText,
        expectedMinutes: null,
        requiresVideo: false,
        historicalStatus: 'REVIEWED',
      },
    };
  }

  if (/\bcanciones\s*:/i.test(rawText) || songs.length >= 3) {
    return {
      suggestedType: 'REPERTOIRE',
      confidence: songs.length ? 0.82 : 0.62,
      suggestedPayload: {
        ...commonPayload,
        title: `Repertorio histórico página ${pageNumber}`,
        notes: rawText,
      },
    };
  }

  if (/escala|acorde|digitaci[oó]n|ritmo|metr[oó]nomo|armon[ií]a|lectura|gram[aá]tica|entrenamiento auditivo|dictados r[ií]tmicos|sostenido|bemol/i.test(rawText)) {
    return {
      suggestedType: 'SKILL_EVIDENCE',
      confidence: 0.74,
      suggestedPayload: {
        ...commonPayload,
        title: `Evidencia técnica página ${pageNumber}`,
        skillHints: inferSkillHints(rawText),
      },
    };
  }

  if (/clase|piano|notas musicales|primeras canciones/i.test(rawText)) {
    return {
      suggestedType: 'STUDENT_LOG',
      confidence: 0.68,
      suggestedPayload: {
        ...commonPayload,
        title: `Nota histórica página ${pageNumber}`,
      },
    };
  }

  return {
    suggestedType: 'UNKNOWN',
    confidence: 0.35,
    suggestedPayload: { ...commonPayload, title: `Página histórica ${pageNumber}` },
  };
}

function inferSkillHints(text) {
  const hints = [];
  const checks = [
    ['Scales', /escala/i],
    ['Chords', /acorde/i],
    ['Note reading', /notas?|lectura|gram[aá]tica/i],
    ['Rhythm', /ritmo|dictados r[ií]tmicos/i],
    ['Timing / metronome', /metr[oó]nomo|tiempo/i],
    ['Hand coordination', /dos manos|mano izquierda|mano derecha|coordinaci[oó]n/i],
    ['Music theory', /armon[ií]a|tonalidad|sostenido|bemol/i],
  ];
  for (const [label, regex] of checks) if (regex.test(text)) hints.push(label);
  return hints;
}

async function ensureImportStudent({
  studentEmail,
  studentName,
  teacherEmail,
  createdByEmail,
  instrument,
  timezone,
  locale,
  phone,
  bio,
}) {
  const [teacherUser, adminUser] = await Promise.all([
    prisma.user.findUnique({ where: { email: teacherEmail }, include: { teacherProfile: true } }),
    prisma.user.findUnique({ where: { email: createdByEmail } }),
  ]);

  if (!teacherUser?.teacherProfile) throw new Error(`Teacher ${teacherEmail} was not found. Run npm run db:seed first.`);
  if (!adminUser) throw new Error(`Admin ${createdByEmail} was not found. Run npm run db:seed first.`);

  const normalizedEmail = studentEmail.trim().toLowerCase();
  const resolvedStudentName = studentName?.trim() || normalizedEmail.split('@')[0] || 'Historical Student';
  const passwordHash = await hash('demo123', 12);
  const user = await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: {
      name: resolvedStudentName,
      role: Role.STUDENT,
      locale,
      timezone,
    },
    create: {
      name: resolvedStudentName,
      email: normalizedEmail,
      passwordHash,
      role: Role.STUDENT,
      locale,
      timezone,
      image: '/demo/student.svg',
    },
  });

  const student = await prisma.studentProfile.upsert({
    where: { userId: user.id },
    update: {
      phone,
      preferredInstrument: instrument,
      bio,
    },
    create: {
      userId: user.id,
      phone,
      preferredInstrument: instrument,
      bio,
    },
  });

  await prisma.teacherAssignment.upsert({
    where: { studentId: student.id },
    update: { teacherId: teacherUser.teacherProfile.id },
    create: { studentId: student.id, teacherId: teacherUser.teacherProfile.id, assignedBy: adminUser.id },
  });

  const plan = await prisma.subscriptionPlan.upsert({
    where: { id: 'plan_harmonizing_90' },
    update: {},
    create: {
      id: 'plan_harmonizing_90',
      name: 'Plan Premium 1:1',
      priceUsd: 90,
      monthlyClassCount: 4,
      description: 'Incluye 4 clases personalizadas al mes',
    },
  });

  await prisma.activeSubscription.upsert({
    where: { id: `sub_historical_${sha256(normalizedEmail).slice(0, 16)}` },
    update: { active: true, monthlyClassLimit: 4 },
    create: {
      id: `sub_historical_${sha256(normalizedEmail).slice(0, 16)}`,
      studentId: student.id,
      planId: plan.id,
      startsAt: new Date(Date.UTC(2022, 0, 1, 12, 0, 0, 0)),
      monthlyClassLimit: 4,
      active: true,
    },
  });

  return { student, adminUser, teacher: teacherUser.teacherProfile };
}

async function assertImportUsersExist({ teacherEmail, createdByEmail }) {
  const [teacherUser, adminUser, availableTeachers] = await Promise.all([
    prisma.user.findUnique({ where: { email: teacherEmail }, include: { teacherProfile: true } }),
    prisma.user.findUnique({ where: { email: createdByEmail } }),
    prisma.user.findMany({
      where: { role: Role.TEACHER, teacherProfile: { isNot: null } },
      select: { email: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  if (!adminUser) throw new Error(`Admin ${createdByEmail} was not found. Run npm run db:seed first.`);
  if (!teacherUser?.teacherProfile) {
    const teacherList = availableTeachers.length
      ? ` Available teachers: ${availableTeachers.map((teacher) => `${teacher.name} <${teacher.email}>`).join(', ')}.`
      : ' No teacher accounts were found.';
    throw new Error(`Teacher ${teacherEmail} was not found.${teacherList}`);
  }
}

async function extractPdfPages(pdfPath) {
  let PDFParse;
  try {
    PDFParse = require('pdf-parse').PDFParse;
  } catch {
    throw new Error('Missing dependency "pdf-parse" inside the web container. Run "docker compose exec web npm install" once, or restart with "docker compose up --build" so the entrypoint refreshes node_modules.');
  }

  const buffer = await readFile(pdfPath);
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return {
      pageCount: result.total,
      pages: result.pages.map((page, index) => ({ pageNumber: page.num ?? index + 1, text: normalizeText(page.text) })),
      sourceSha256: sha256(buffer),
    };
  } finally {
    await parser.destroy();
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const requestedPdfPath = path.resolve(args.pdf);
  const importedBasenamePath = path.resolve('/imports', path.basename(args.pdf));
  const shouldUseTommyFallback = args.pdf === DEFAULT_PDF_PATH;
  const pdfPath = existsSync(requestedPdfPath)
    ? requestedPdfPath
    : existsSync(importedBasenamePath)
      ? importedBasenamePath
      : shouldUseTommyFallback && existsSync(CONTAINER_PDF_FALLBACK_PATH)
        ? path.resolve(CONTAINER_PDF_FALLBACK_PATH)
      : requestedPdfPath;
  if (!existsSync(pdfPath)) throw new Error(`PDF not found: ${pdfPath}`);

  const extracted = await extractPdfPages(pdfPath);
  const sourceFilename = path.basename(pdfPath);
  const classifiedPages = extracted.pages.map((page) => {
    const classification = classifyPage(page.pageNumber, page.text, sourceFilename);
    return {
      sourcePage: page.pageNumber,
      rowHash: sha256(`${page.pageNumber}:${classification.suggestedType}:${page.text}`),
      rawText: page.text || null,
      suggestedType: classification.suggestedType,
      suggestedPayload: classification.suggestedPayload,
      confidence: classification.confidence,
    };
  });

  const counts = classifiedPages.reduce((acc, row) => {
    acc[row.suggestedType] = (acc[row.suggestedType] ?? 0) + 1;
    return acc;
  }, {});

  if (args.dryRun) {
    let userCheck = { ok: true };
    try {
      await assertImportUsersExist(args);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'User validation failed.';
      userCheck = {
        ok: false,
        warning: message.includes('DATABASE_URL')
          ? 'Skipped database user validation because DATABASE_URL is not available in this shell. The check will run inside Docker.'
          : message,
      };
    }
    console.log(JSON.stringify({ dryRun: true, sourceFilename, resolvedPdfPath: pdfPath, pageCount: extracted.pageCount, rowCount: classifiedPages.length, counts, userCheck }, null, 2));
    return;
  }

  const { student, adminUser } = await ensureImportStudent(args);
  const rows = classifiedPages.map((row) => ({ ...row, studentId: student.id }));

  const batch = await prisma.historicalImportBatch.upsert({
    where: {
      studentId_sourceFilename_sourceSha256: {
        studentId: student.id,
        sourceFilename,
        sourceSha256: extracted.sourceSha256,
      },
    },
    update: {
      sourcePath: pdfPath,
      pageCount: extracted.pageCount,
      rowCount: rows.length,
      status: 'STAGED',
      environmentNote: args.environmentNote,
      dryRun: false,
      createdByUserId: adminUser.id,
    },
    create: {
      studentId: student.id,
      createdByUserId: adminUser.id,
      sourceFilename,
      sourcePath: pdfPath,
      sourceSha256: extracted.sourceSha256,
      sourceType: 'PDF',
      pageCount: extracted.pageCount,
      rowCount: rows.length,
      status: 'STAGED',
      environmentNote: args.environmentNote,
      dryRun: false,
    },
  });

  let upserted = 0;
  for (const row of rows) {
    await prisma.historicalImportRow.upsert({
      where: {
        batchId_sourcePage_rowHash: {
          batchId: batch.id,
          sourcePage: row.sourcePage,
          rowHash: row.rowHash,
        },
      },
      update: {
        studentId: row.studentId,
        rawText: row.rawText,
        suggestedType: row.suggestedType,
        suggestedPayload: row.suggestedPayload,
        confidence: row.confidence,
      },
      create: {
        batchId: batch.id,
        ...row,
      },
    });
    upserted += 1;
  }

  console.log(JSON.stringify({ batchId: batch.id, sourceFilename, pageCount: extracted.pageCount, rowCount: rows.length, upserted, counts }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
