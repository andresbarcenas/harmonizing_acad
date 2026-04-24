import {
  PrismaClient,
  Role,
  SessionStatus,
  StudentLevel,
  NotificationType,
  RescheduleStatus,
  VideoStatus,
  TeacherStatus,
  LogEntryType,
  InvoiceContactLinkStrategy,
  InvoiceSyncScope,
  InvoiceSyncStatus,
} from "@prisma/client";
import { hash } from "bcryptjs";
import { addDays, addHours, subDays } from "date-fns";

const prisma = new PrismaClient();

async function main() {
  // Security-sensitive: never store plaintext passwords, only bcrypt hashes.
  const passwordHash = await hash("demo123", 12);

  const [adminUser, teacherUser, studentUser, studentTwoUser] = await Promise.all([
    prisma.user.upsert({
      where: { email: "admin@harmonizing.com" },
      update: {},
      create: {
        name: "Sofia Morales",
        email: "admin@harmonizing.com",
        passwordHash,
        role: Role.ADMIN,
        locale: "es",
        timezone: "America/New_York",
        image: "/demo/admin.svg",
      },
    }),
    prisma.user.upsert({
      where: { email: "maria@harmonizing.com" },
      update: {},
      create: {
        name: "María Rojas",
        email: "maria@harmonizing.com",
        passwordHash,
        role: Role.TEACHER,
        locale: "es",
        timezone: "America/Chicago",
        image: "/demo/teacher.svg",
      },
    }),
    prisma.user.upsert({
      where: { email: "isabella@harmonizing.com" },
      update: {},
      create: {
        name: "Isabella Herrera",
        email: "isabella@harmonizing.com",
        passwordHash,
        role: Role.STUDENT,
        locale: "es",
        timezone: "America/New_York",
        image: "/demo/student.svg",
      },
    }),
    prisma.user.upsert({
      where: { email: "luis@harmonizing.com" },
      update: {},
      create: {
        name: "Luis Castillo",
        email: "luis@harmonizing.com",
        passwordHash,
        role: Role.STUDENT,
        locale: "es",
        timezone: "America/Los_Angeles",
        image: "/demo/student-2.svg",
      },
    }),
  ]);

  const teacherProfile = await prisma.teacherProfile.upsert({
    where: { userId: teacherUser.id },
    update: {
      status: TeacherStatus.ACTIVE,
      statusUpdatedAt: new Date(),
    },
    create: {
      userId: teacherUser.id,
      specialty: "Técnica vocal y piano contemporáneo",
      bio: "Más de 10 años acompañando estudiantes hispanos en EE.UU.",
      zoomLink: "https://zoom.us/j/1234567890",
      meetLink: "https://meet.google.com/harmonizing-class",
      status: TeacherStatus.ACTIVE,
    },
  });

  const [studentProfile, studentTwoProfile] = await Promise.all([
    prisma.studentProfile.upsert({
      where: { userId: studentUser.id },
      update: {},
      create: {
        userId: studentUser.id,
        phone: "+1 786 555 0101",
        preferredInstrument: "Piano",
        bio: "Me preparo para tocar en mi iglesia local.",
      },
    }),
    prisma.studentProfile.upsert({
      where: { userId: studentTwoUser.id },
      update: {},
      create: {
        userId: studentTwoUser.id,
        phone: "+1 213 555 0110",
        preferredInstrument: "Voz",
        bio: "Busco mejorar respiración y afinación.",
      },
    }),
  ]);

  await Promise.all([
    prisma.teacherAssignment.upsert({
      where: { studentId: studentProfile.id },
      update: { teacherId: teacherProfile.id },
      create: { studentId: studentProfile.id, teacherId: teacherProfile.id, assignedBy: adminUser.id },
    }),
    prisma.teacherAssignment.upsert({
      where: { studentId: studentTwoProfile.id },
      update: { teacherId: teacherProfile.id },
      create: { studentId: studentTwoProfile.id, teacherId: teacherProfile.id, assignedBy: adminUser.id },
    }),
  ]);

  const plan = await prisma.subscriptionPlan.upsert({
    where: { id: "plan_harmonizing_90" },
    update: {},
    create: {
      id: "plan_harmonizing_90",
      name: "Plan Premium 1:1",
      priceUsd: 90,
      monthlyClassCount: 4,
      description: "Incluye 4 clases personalizadas al mes",
    },
  });

  await Promise.all([
    prisma.activeSubscription.upsert({
      where: { id: "sub_student_primary" },
      update: { active: true, monthlyClassLimit: 4 },
      create: {
        id: "sub_student_primary",
        studentId: studentProfile.id,
        planId: plan.id,
        startsAt: subDays(new Date(), 12),
        monthlyClassLimit: 4,
        active: true,
      },
    }),
    prisma.activeSubscription.upsert({
      where: { id: "sub_student_secondary" },
      update: { active: true, monthlyClassLimit: 4 },
      create: {
        id: "sub_student_secondary",
        studentId: studentTwoProfile.id,
        planId: plan.id,
        startsAt: subDays(new Date(), 5),
        monthlyClassLimit: 4,
        active: true,
      },
    }),
  ]);

  await prisma.teacherAvailability.deleteMany({ where: { teacherId: teacherProfile.id } });
  await prisma.teacherAvailability.createMany({
    data: [
      { teacherId: teacherProfile.id, weekday: 1, startMinuteLocal: 17 * 60, endMinuteLocal: 21 * 60, timezone: "America/Chicago" },
      { teacherId: teacherProfile.id, weekday: 3, startMinuteLocal: 17 * 60, endMinuteLocal: 21 * 60, timezone: "America/Chicago" },
      { teacherId: teacherProfile.id, weekday: 5, startMinuteLocal: 16 * 60, endMinuteLocal: 20 * 60, timezone: "America/Chicago" },
    ],
  });

  const now = new Date();
  const nextClassStart = addDays(now, 2);
  nextClassStart.setUTCHours(23, 0, 0, 0);
  const nextClassEnd = addHours(nextClassStart, 1);

  const [session1, session2, session3, session4, session5] = await Promise.all([
    prisma.classSession.upsert({
      where: { id: "session_upcoming" },
      update: {
        startsAtUtc: nextClassStart,
        endsAtUtc: nextClassEnd,
      },
      create: {
        id: "session_upcoming",
        studentId: studentProfile.id,
        teacherId: teacherProfile.id,
        startsAtUtc: nextClassStart,
        endsAtUtc: nextClassEnd,
        meetingUrl: "https://zoom.us/j/1234567890",
        status: SessionStatus.SCHEDULED,
        lessonFocus: "Arpegios y coordinación mano izquierda",
      },
    }),
    prisma.classSession.upsert({
      where: { id: "session_completed_1" },
      update: {},
      create: {
        id: "session_completed_1",
        studentId: studentProfile.id,
        teacherId: teacherProfile.id,
        startsAtUtc: subDays(now, 5),
        endsAtUtc: subDays(addHours(now, 1), 5),
        meetingUrl: "https://zoom.us/j/1234567890",
        status: SessionStatus.COMPLETED,
        lessonFocus: "Postura y respiración",
        lastClassNotes: "Excelente mejora en control de aire. Practicar vocalizaciones 10 min diarios.",
      },
    }),
    prisma.classSession.upsert({
      where: { id: "session_student_two" },
      update: {},
      create: {
        id: "session_student_two",
        studentId: studentTwoProfile.id,
        teacherId: teacherProfile.id,
        startsAtUtc: addDays(now, 1),
        endsAtUtc: addDays(addHours(now, 1), 1),
        meetingUrl: "https://meet.google.com/harmonizing-class",
        status: SessionStatus.SCHEDULED,
        lessonFocus: "Dicción y resonancia",
      },
    }),
    prisma.classSession.upsert({
      where: { id: "session_completed_2" },
      update: {},
      create: {
        id: "session_completed_2",
        studentId: studentTwoProfile.id,
        teacherId: teacherProfile.id,
        startsAtUtc: subDays(now, 3),
        endsAtUtc: subDays(addHours(now, 1), 3),
        meetingUrl: "https://meet.google.com/harmonizing-class",
        status: SessionStatus.COMPLETED,
        lessonFocus: "Respiración diafragmática",
        lastClassNotes: "Mejor control de aire en frases largas.",
      },
    }),
    prisma.classSession.upsert({
      where: { id: "session_cancelled_1" },
      update: {},
      create: {
        id: "session_cancelled_1",
        studentId: studentProfile.id,
        teacherId: teacherProfile.id,
        startsAtUtc: subDays(now, 15),
        endsAtUtc: subDays(addHours(now, 1), 15),
        meetingUrl: "https://zoom.us/j/1234567890",
        status: SessionStatus.CANCELLED,
        lessonFocus: "Revisión de repertorio",
      },
    }),
  ]);

  await prisma.rescheduleRequest.upsert({
    where: { id: "reschedule_pending_1" },
    update: {},
    create: {
      id: "reschedule_pending_1",
      sessionId: session1.id,
      requestedById: studentUser.id,
      proposedStartUtc: addDays(nextClassStart, 1),
      proposedEndUtc: addDays(nextClassEnd, 1),
      studentMessage: "¿Podemos mover la clase al jueves por la tarde?",
      status: RescheduleStatus.PENDING,
    },
  });
  await prisma.rescheduleRequest.upsert({
    where: { id: "reschedule_rejected_1" },
    update: {},
    create: {
      id: "reschedule_rejected_1",
      sessionId: session3.id,
      requestedById: studentTwoUser.id,
      proposedStartUtc: addDays(now, 2),
      proposedEndUtc: addDays(addHours(now, 1), 2),
      studentMessage: "Puedo moverla a esta hora?",
      teacherResponse: "Ese bloque ya está reservado.",
      status: RescheduleStatus.REJECTED,
      decidedAt: subDays(now, 1),
      reviewedById: teacherProfile.id,
    },
  });

  await prisma.progressRecord.deleteMany({ where: { studentId: studentProfile.id } });
  await prisma.progressRecord.createMany({
    data: [
      {
        studentId: studentProfile.id,
        level: StudentLevel.INTERMEDIATE,
        summary: "Mayor precisión rítmica en baladas lentas.",
        updatedByUserId: teacherUser.id,
        updatedAt: subDays(now, 10),
      },
      {
        studentId: studentProfile.id,
        level: StudentLevel.INTERMEDIATE,
        summary: "Buen avance en independencia de manos.",
        updatedByUserId: teacherUser.id,
        updatedAt: subDays(now, 2),
      },
    ],
  });

  await prisma.learnedSong.deleteMany({ where: { studentId: studentProfile.id } });
  await prisma.learnedSong.createMany({
    data: [
      { studentId: studentProfile.id, title: "Bésame Mucho", artist: "Consuelo Velázquez", learnedAt: subDays(now, 20) },
      { studentId: studentProfile.id, title: "La Bikina", artist: "Rubén Fuentes", learnedAt: subDays(now, 7) },
    ],
  });

  await prisma.goal.deleteMany({ where: { studentId: studentProfile.id } });
  await prisma.goal.createMany({
    data: [
      { studentId: studentProfile.id, title: "Memorizar progresión de acordes en Re mayor", targetDate: addDays(now, 12), completed: false },
      { studentId: studentProfile.id, title: "Mejorar control de vibrato", targetDate: addDays(now, 20), completed: false },
    ],
  });

  await prisma.studentLogEntry.deleteMany({
    where: {
      studentId: { in: [studentProfile.id, studentTwoProfile.id] },
    },
  });
  await prisma.studentLogEntry.createMany({
    data: [
      {
        studentId: studentProfile.id,
        authorId: teacherUser.id,
        type: LogEntryType.FEEDBACK,
        title: "Mejor control del aire",
        content: "Aumentó la estabilidad en notas largas. Mantener 10 minutos diarios de respiración guiada.",
        occurredAt: subDays(now, 2),
      },
      {
        studentId: studentProfile.id,
        authorId: teacherUser.id,
        type: LogEntryType.GOAL_UPDATE,
        title: "Meta técnica actualizada",
        content: "Nueva meta semanal enfocada en independencia de manos en compases lentos.",
        occurredAt: subDays(now, 1),
      },
      {
        studentId: studentTwoProfile.id,
        authorId: teacherUser.id,
        type: LogEntryType.ATTENDANCE,
        title: "Asistencia registrada",
        content: "Clase completada y seguimiento de tarea enviado por chat.",
        occurredAt: subDays(now, 3),
      },
    ],
  });

  const thread = await prisma.messageThread.upsert({
    where: { studentId_teacherId: { studentId: studentProfile.id, teacherId: teacherProfile.id } },
    update: {},
    create: {
      studentId: studentProfile.id,
      teacherId: teacherProfile.id,
    },
  });

  await prisma.message.deleteMany({ where: { threadId: thread.id } });
  await prisma.message.createMany({
    data: [
      { threadId: thread.id, senderId: studentUser.id, content: "Hola profe, ¿me recomienda ejercicios para coordinación?" },
      { threadId: thread.id, senderId: teacherUser.id, content: "Claro Camila, te envié una rutina de 12 minutos. La revisamos en clase." },
      { threadId: thread.id, senderId: studentUser.id, content: "Perfecto, gracias. También subiré mi video semanal hoy." },
    ],
  });

  const video = await prisma.practiceVideo.upsert({
    where: { id: "video_seed_1" },
    update: {},
    create: {
      id: "video_seed_1",
      studentId: studentProfile.id,
      teacherId: teacherProfile.id,
      storageKey: "seed/camila-practice.mp4",
      originalName: "camila-practice.mp4",
      durationSec: 122,
      status: VideoStatus.FEEDBACK_GIVEN,
      submittedAt: subDays(now, 4),
      reviewedAt: subDays(now, 3),
    },
  });

  await prisma.videoFeedback.upsert({
    where: { id: "feedback_seed_1" },
    update: { comment: "Muy buen fraseo. En la segunda mitad, relajá hombros para sostener mejor el aire." },
    create: {
      id: "feedback_seed_1",
      videoId: video.id,
      teacherId: teacherProfile.id,
      comment: "Muy buen fraseo. En la segunda mitad, relajá hombros para sostener mejor el aire.",
      reviewedAt: subDays(now, 3),
    },
  });
  await prisma.practiceVideo.upsert({
    where: { id: "video_seed_2_pending" },
    update: {},
    create: {
      id: "video_seed_2_pending",
      studentId: studentTwoProfile.id,
      teacherId: teacherProfile.id,
      storageKey: "seed/luis-practice.mp4",
      originalName: "luis-practice.mp4",
      durationSec: 96,
      status: VideoStatus.PENDING,
      submittedAt: subDays(now, 1),
    },
  });

  await prisma.notification.deleteMany();
  await prisma.notification.createMany({
    data: [
      {
        userId: studentUser.id,
        type: NotificationType.CLASS_REMINDER,
        title: "Tu próxima clase está confirmada",
        body: "Miércoles 7:00 PM (hora local)",
        actionUrl: "/dashboard",
      },
      {
        userId: studentUser.id,
        type: NotificationType.RESCHEDULE_UPDATE,
        title: "Tu solicitud de cambio está pendiente",
        body: "Tu profesora revisará la propuesta en breve.",
        actionUrl: "/schedule",
      },
      {
        userId: teacherUser.id,
        type: NotificationType.VIDEO_REVIEW,
        title: "Nuevo video semanal recibido",
        body: "Camila subió una práctica de 2:02.",
        actionUrl: "/videos",
      },
      {
        userId: teacherUser.id,
        type: NotificationType.MESSAGE,
        title: "Mensaje nuevo",
        body: "Camila te escribió en el chat.",
        actionUrl: "/messages",
      },
      {
        userId: studentTwoUser.id,
        type: NotificationType.CLASS_REMINDER,
        title: "Clase de esta semana",
        body: "Tu clase está confirmada para mañana.",
        actionUrl: "/dashboard",
      },
      {
        userId: adminUser.id,
        type: NotificationType.SYSTEM,
        title: "Estado semanal",
        body: "Actualizamos métricas de ocupación y churn.",
        actionUrl: "/admin/dashboard",
      },
    ],
  });

  await prisma.invitation.upsert({
    where: { token: "invite_student_preview_token" },
    update: {
      email: "nuevo.estudiante@harmonizing.com",
      role: Role.STUDENT,
      invitedByUserId: adminUser.id,
      studentId: studentProfile.id,
      expiresAt: addDays(now, 7),
      revokedAt: null,
    },
    create: {
      token: "invite_student_preview_token",
      email: "nuevo.estudiante@harmonizing.com",
      role: Role.STUDENT,
      invitedByUserId: adminUser.id,
      studentId: studentProfile.id,
      expiresAt: addDays(now, 7),
    },
  });

  const demoInvoiceRows = [
    {
      id: "invoice_camila_2025_11",
      studentId: studentProfile.id,
      alegraInvoiceId: "demo_inv_camila_2025_11",
      invoiceNumber: "HMZ-2025-11-001",
      issueDate: new Date("2025-11-01T12:00:00.000Z"),
      dueDate: new Date("2025-11-10T12:00:00.000Z"),
      status: "PAID",
      totalAmount: 90,
      balanceAmount: 0,
      currency: "USD",
    },
    {
      id: "invoice_camila_2025_12",
      studentId: studentProfile.id,
      alegraInvoiceId: "demo_inv_camila_2025_12",
      invoiceNumber: "HMZ-2025-12-001",
      issueDate: new Date("2025-12-01T12:00:00.000Z"),
      dueDate: new Date("2025-12-10T12:00:00.000Z"),
      status: "PAID",
      totalAmount: 90,
      balanceAmount: 0,
      currency: "USD",
    },
    {
      id: "invoice_camila_2026_01",
      studentId: studentProfile.id,
      alegraInvoiceId: "demo_inv_camila_2026_01",
      invoiceNumber: "HMZ-2026-01-001",
      issueDate: new Date("2026-01-01T12:00:00.000Z"),
      dueDate: new Date("2026-01-10T12:00:00.000Z"),
      status: "PAID",
      totalAmount: 90,
      balanceAmount: 0,
      currency: "USD",
    },
    {
      id: "invoice_camila_2026_02",
      studentId: studentProfile.id,
      alegraInvoiceId: "demo_inv_camila_2026_02",
      invoiceNumber: "HMZ-2026-02-001",
      issueDate: new Date("2026-02-01T12:00:00.000Z"),
      dueDate: new Date("2026-02-10T12:00:00.000Z"),
      status: "PAID",
      totalAmount: 90,
      balanceAmount: 0,
      currency: "USD",
    },
    {
      id: "invoice_camila_2026_03",
      studentId: studentProfile.id,
      alegraInvoiceId: "demo_inv_camila_2026_03",
      invoiceNumber: "HMZ-2026-03-001",
      issueDate: new Date("2026-03-01T12:00:00.000Z"),
      dueDate: new Date("2026-03-10T12:00:00.000Z"),
      status: "PAID",
      totalAmount: 90,
      balanceAmount: 0,
      currency: "USD",
    },
    {
      id: "invoice_camila_2026_04",
      studentId: studentProfile.id,
      alegraInvoiceId: "demo_inv_camila_2026_04",
      invoiceNumber: "HMZ-2026-04-001",
      issueDate: new Date("2026-04-01T12:00:00.000Z"),
      dueDate: new Date("2026-04-10T12:00:00.000Z"),
      status: "PENDING",
      totalAmount: 90,
      balanceAmount: 90,
      currency: "USD",
    },
    {
      id: "invoice_luis_2026_01",
      studentId: studentTwoProfile.id,
      alegraInvoiceId: "demo_inv_luis_2026_01",
      invoiceNumber: "HMZ-2026-01-002",
      issueDate: new Date("2026-01-01T12:00:00.000Z"),
      dueDate: new Date("2026-01-12T12:00:00.000Z"),
      status: "PAID",
      totalAmount: 90,
      balanceAmount: 0,
      currency: "USD",
    },
    {
      id: "invoice_luis_2026_02",
      studentId: studentTwoProfile.id,
      alegraInvoiceId: "demo_inv_luis_2026_02",
      invoiceNumber: "HMZ-2026-02-002",
      issueDate: new Date("2026-02-01T12:00:00.000Z"),
      dueDate: new Date("2026-02-12T12:00:00.000Z"),
      status: "PAID",
      totalAmount: 90,
      balanceAmount: 0,
      currency: "USD",
    },
    {
      id: "invoice_luis_2026_03",
      studentId: studentTwoProfile.id,
      alegraInvoiceId: "demo_inv_luis_2026_03",
      invoiceNumber: "HMZ-2026-03-002",
      issueDate: new Date("2026-03-01T12:00:00.000Z"),
      dueDate: new Date("2026-03-12T12:00:00.000Z"),
      status: "OVERDUE",
      totalAmount: 90,
      balanceAmount: 90,
      currency: "USD",
    },
    {
      id: "invoice_luis_2026_04",
      studentId: studentTwoProfile.id,
      alegraInvoiceId: "demo_inv_luis_2026_04",
      invoiceNumber: "HMZ-2026-04-002",
      issueDate: new Date("2026-04-01T12:00:00.000Z"),
      dueDate: new Date("2026-04-12T12:00:00.000Z"),
      status: "PARTIAL",
      totalAmount: 90,
      balanceAmount: 30,
      currency: "USD",
    },
  ];

  for (const row of demoInvoiceRows) {
    await prisma.invoice.upsert({
      where: { alegraInvoiceId: row.alegraInvoiceId },
      update: {
        studentId: row.studentId,
        invoiceNumber: row.invoiceNumber,
        issueDate: row.issueDate,
        dueDate: row.dueDate,
        status: row.status,
        currency: row.currency,
        totalAmount: row.totalAmount,
        balanceAmount: row.balanceAmount,
        lastSyncedAt: now,
        rawPayload: {
          source: "seed-demo",
          alegraInvoiceId: row.alegraInvoiceId,
          invoiceNumber: row.invoiceNumber,
        },
      },
      create: {
        id: row.id,
        studentId: row.studentId,
        alegraInvoiceId: row.alegraInvoiceId,
        invoiceNumber: row.invoiceNumber,
        issueDate: row.issueDate,
        dueDate: row.dueDate,
        status: row.status,
        currency: row.currency,
        totalAmount: row.totalAmount,
        balanceAmount: row.balanceAmount,
        lastSyncedAt: now,
        rawPayload: {
          source: "seed-demo",
          alegraInvoiceId: row.alegraInvoiceId,
          invoiceNumber: row.invoiceNumber,
        },
      },
    });
  }

  await Promise.all([
    prisma.invoiceContactLink.upsert({
      where: { studentId: studentProfile.id },
      update: {
        strategy: InvoiceContactLinkStrategy.EMAIL_AUTO,
        alegraContactId: "demo_contact_camila",
        lastResolvedAt: now,
        lastError: null,
      },
      create: {
        studentId: studentProfile.id,
        strategy: InvoiceContactLinkStrategy.EMAIL_AUTO,
        alegraContactId: "demo_contact_camila",
        lastResolvedAt: now,
        lastError: null,
      },
    }),
    prisma.invoiceContactLink.upsert({
      where: { studentId: studentTwoProfile.id },
      update: {
        strategy: InvoiceContactLinkStrategy.EMAIL_AUTO,
        alegraContactId: "demo_contact_luis",
        lastResolvedAt: now,
        lastError: null,
      },
      create: {
        studentId: studentTwoProfile.id,
        strategy: InvoiceContactLinkStrategy.EMAIL_AUTO,
        alegraContactId: "demo_contact_luis",
        lastResolvedAt: now,
        lastError: null,
      },
    }),
  ]);

  await prisma.invoiceSyncRun.upsert({
    where: { id: "invoice_sync_demo_all" },
    update: {
      status: InvoiceSyncStatus.SUCCESS,
      scope: InvoiceSyncScope.ALL,
      startedAt: subDays(now, 1),
      finishedAt: subDays(now, 1),
      studentsProcessed: 2,
      studentsFailed: 0,
      invoicesUpserted: demoInvoiceRows.length,
      errorSummary: null,
    },
    create: {
      id: "invoice_sync_demo_all",
      status: InvoiceSyncStatus.SUCCESS,
      scope: InvoiceSyncScope.ALL,
      startedAt: subDays(now, 1),
      finishedAt: subDays(now, 1),
      studentsProcessed: 2,
      studentsFailed: 0,
      invoicesUpserted: demoInvoiceRows.length,
      errorSummary: null,
    },
  });

  await Promise.all([
    prisma.invoiceSyncRun.upsert({
      where: { id: "invoice_sync_demo_student_camila" },
      update: {
        status: InvoiceSyncStatus.SUCCESS,
        scope: InvoiceSyncScope.STUDENT,
        studentId: studentProfile.id,
        startedAt: subDays(now, 1),
        finishedAt: subDays(now, 1),
        studentsProcessed: 1,
        studentsFailed: 0,
        invoicesUpserted: 2,
      },
      create: {
        id: "invoice_sync_demo_student_camila",
        status: InvoiceSyncStatus.SUCCESS,
        scope: InvoiceSyncScope.STUDENT,
        studentId: studentProfile.id,
        startedAt: subDays(now, 1),
        finishedAt: subDays(now, 1),
        studentsProcessed: 1,
        studentsFailed: 0,
        invoicesUpserted: 2,
      },
    }),
    prisma.invoiceSyncRun.upsert({
      where: { id: "invoice_sync_demo_student_luis" },
      update: {
        status: InvoiceSyncStatus.SUCCESS,
        scope: InvoiceSyncScope.STUDENT,
        studentId: studentTwoProfile.id,
        startedAt: subDays(now, 1),
        finishedAt: subDays(now, 1),
        studentsProcessed: 1,
        studentsFailed: 0,
        invoicesUpserted: 1,
      },
      create: {
        id: "invoice_sync_demo_student_luis",
        status: InvoiceSyncStatus.SUCCESS,
        scope: InvoiceSyncScope.STUDENT,
        studentId: studentTwoProfile.id,
        startedAt: subDays(now, 1),
        finishedAt: subDays(now, 1),
        studentsProcessed: 1,
        studentsFailed: 0,
        invoicesUpserted: 1,
      },
    }),
  ]);

  console.log("Seed completed", {
    admin: adminUser.email,
    teacher: teacherUser.email,
    student: studentUser.email,
    student2: studentTwoUser.email,
    sessionIds: [session1.id, session2.id, session3.id, session4.id, session5.id],
  });
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
