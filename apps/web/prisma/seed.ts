import {
  PrismaClient,
  Role,
  SessionStatus,
  ClassRequestStatus,
  ClassSessionType,
  StudentLevel,
  NotificationType,
  RescheduleStatus,
  VideoStatus,
  TeacherStatus,
  LogEntryType,
  InvoiceContactLinkStrategy,
  InvoiceSyncScope,
  InvoiceSyncStatus,
  PracticeAssignmentStatus,
  ProgressReportStatus,
  RepertoireStatus,
} from "@prisma/client";
import { hash } from "bcryptjs";
import { addDays, addHours, subDays } from "date-fns";

const prisma = new PrismaClient();

async function main() {
  // Security-sensitive: never store plaintext passwords, only bcrypt hashes.
  const passwordHash = await hash("demo123", 12);

  const [adminUser, teacherUser, studentUser, studentTwoUser, tommyUser] = await Promise.all([
    prisma.user.upsert({
      where: { email: "admin@harmonizing.com" },
      update: {},
      create: {
        name: "Sofia Morales",
        email: "admin@harmonizing.com",
        passwordHash,
        role: Role.ADMIN,
        locale: "en",
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
        locale: "en",
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
        locale: "en",
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
        locale: "en",
        timezone: "America/Los_Angeles",
        image: "/demo/student-2.svg",
      },
    }),
    prisma.user.upsert({
      where: { email: "tommy@harmonizing.com" },
      update: {},
      create: {
        name: "Tommy",
        email: "tommy@harmonizing.com",
        passwordHash,
        role: Role.STUDENT,
        locale: "es",
        timezone: "America/New_York",
        image: "/demo/student.svg",
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

  const [studentProfile, studentTwoProfile, tommyProfile] = await Promise.all([
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
    prisma.studentProfile.upsert({
      where: { userId: tommyUser.id },
      update: {},
      create: {
        userId: tommyUser.id,
        phone: "+1 305 555 0140",
        preferredInstrument: "Piano",
        bio: "Cuenta local para importar el consolidado histórico de piano.",
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
    prisma.teacherAssignment.upsert({
      where: { studentId: tommyProfile.id },
      update: { teacherId: teacherProfile.id },
      create: { studentId: tommyProfile.id, teacherId: teacherProfile.id, assignedBy: adminUser.id },
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
    prisma.activeSubscription.upsert({
      where: { id: "sub_tommy_historical" },
      update: { active: true, monthlyClassLimit: 4 },
      create: {
        id: "sub_tommy_historical",
        studentId: tommyProfile.id,
        planId: plan.id,
        startsAt: subDays(new Date(), 365 * 3),
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

  const skillSeed = [
    ["GENERAL", "Rhythm", "Pulso interno, subdivisión y estabilidad rítmica."],
    ["GENERAL", "Ear training", "Escucha activa, afinación relativa y reconocimiento musical."],
    ["GENERAL", "Music theory", "Lenguaje musical, armonía básica y comprensión de estructura."],
    ["GENERAL", "Practice discipline", "Hábitos de estudio, constancia y preparación semanal."],
    ["PIANO", "Timing / metronome", "Uso del metrónomo y precisión de tempo."],
    ["PIANO", "Note reading", "Lectura de notas y reconocimiento en el teclado."],
    ["PIANO", "Sight reading", "Lectura a primera vista."],
    ["PIANO", "Hand coordination", "Coordinación entre manos y control simultáneo."],
    ["PIANO", "Left/right hand independence", "Independencia entre mano izquierda y derecha."],
    ["PIANO", "Scales", "Escalas, digitación y regularidad técnica."],
    ["PIANO", "Chords", "Acordes, inversiones y progresiones."],
    ["PIANO", "Technique", "Control técnico, relajación y articulación."],
    ["PIANO", "Dynamics", "Control de volumen, contraste y matices."],
    ["PIANO", "Expression", "Fraseo, intención musical y sensibilidad."],
    ["PIANO", "Posture", "Postura corporal, manos y ergonomía."],
    ["PIANO", "Repertoire/song mastery", "Dominio de canciones y piezas asignadas."],
    ["VOICE", "Pitch accuracy", "Afinación y precisión melódica."],
    ["VOICE", "Breath control", "Respiración, soporte y control del aire."],
    ["VOICE", "Vocal tone", "Color, claridad y estabilidad del sonido."],
    ["VOICE", "Range", "Extensión vocal cómoda y saludable."],
    ["VOICE", "Support", "Apoyo diafragmático y sostén de frases."],
    ["VOICE", "Diction", "Claridad de pronunciación e intención textual."],
    ["VOICE", "Performance confidence", "Seguridad escénica y presencia."],
    ["VOICE", "Warmup discipline", "Rutina de calentamiento y cuidado vocal."],
    ["VOICE", "Song interpretation", "Interpretación, emoción y narrativa."],
    ["VOICE", "Stage presence", "Comunicación escénica y confianza corporal."],
  ] as const;

  const skillCategories = new Map<string, Awaited<ReturnType<typeof prisma.skillCategory.upsert>>>();
  for (const [index, [instrument, name, description]] of skillSeed.entries()) {
    const category = await prisma.skillCategory.upsert({
      where: { instrument_name: { instrument, name } },
      update: { description, sortOrder: index + 1, active: true },
      create: { instrument, name, description, sortOrder: index + 1 },
    });
    skillCategories.set(`${instrument}:${name}`, category);
  }

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

  const pianoSeries = await prisma.recurringClassSeries.upsert({
    where: { id: "series_isabella_piano_twice_weekly" },
    update: {
      studentId: studentProfile.id,
      teacherId: teacherProfile.id,
      timezone: "America/Chicago",
      weekdays: [1, 3],
      active: true,
    },
    create: {
      id: "series_isabella_piano_twice_weekly",
      studentId: studentProfile.id,
      teacherId: teacherProfile.id,
      timezone: "America/Chicago",
      startsOnDate: addDays(now, 7),
      startTimeLocal: "18:00",
      startMinuteLocal: 18 * 60,
      durationMin: 60,
      intervalWeeks: 1,
      horizonWeeks: 8,
      weekdays: [1, 3],
      meetingUrl: "https://zoom.us/j/1234567890",
      lessonFocus: "Piano: coordinación, repertorio y técnica semanal",
    },
  });

  const recurringClassOne = addDays(now, 8);
  recurringClassOne.setUTCHours(23, 0, 0, 0);
  const recurringClassTwo = addDays(now, 10);
  recurringClassTwo.setUTCHours(23, 0, 0, 0);

  await Promise.all([
    prisma.classSession.upsert({
      where: { id: "session_isabella_recurring_piano_1" },
      update: {
        recurrenceId: pianoSeries.id,
        studentId: studentProfile.id,
        teacherId: teacherProfile.id,
        startsAtUtc: recurringClassOne,
        endsAtUtc: addHours(recurringClassOne, 1),
        type: ClassSessionType.RECURRING,
        timezone: "America/Chicago",
        instrument: "Piano",
      },
      create: {
        id: "session_isabella_recurring_piano_1",
        recurrenceId: pianoSeries.id,
        studentId: studentProfile.id,
        teacherId: teacherProfile.id,
        type: ClassSessionType.RECURRING,
        startsAtUtc: recurringClassOne,
        endsAtUtc: addHours(recurringClassOne, 1),
        timezone: "America/Chicago",
        instrument: "Piano",
        meetingUrl: "https://zoom.us/j/1234567890",
        status: SessionStatus.SCHEDULED,
        lessonFocus: "Lectura rítmica y manos juntas",
      },
    }),
    prisma.classSession.upsert({
      where: { id: "session_isabella_recurring_piano_2" },
      update: {
        recurrenceId: pianoSeries.id,
        studentId: studentProfile.id,
        teacherId: teacherProfile.id,
        startsAtUtc: recurringClassTwo,
        endsAtUtc: addHours(recurringClassTwo, 1),
        type: ClassSessionType.RECURRING,
        timezone: "America/Chicago",
        instrument: "Piano",
      },
      create: {
        id: "session_isabella_recurring_piano_2",
        recurrenceId: pianoSeries.id,
        studentId: studentProfile.id,
        teacherId: teacherProfile.id,
        type: ClassSessionType.RECURRING,
        startsAtUtc: recurringClassTwo,
        endsAtUtc: addHours(recurringClassTwo, 1),
        timezone: "America/Chicago",
        instrument: "Piano",
        meetingUrl: "https://zoom.us/j/1234567890",
        status: SessionStatus.SCHEDULED,
        lessonFocus: "Sección B y metrónomo",
      },
    }),
  ]);

  const trialClassStart = addDays(now, 4);
  trialClassStart.setUTCHours(21, 0, 0, 0);
  const makeupClassStart = addDays(now, 6);
  makeupClassStart.setUTCHours(22, 0, 0, 0);
  const extraPracticeStart = addDays(now, 9);
  extraPracticeStart.setUTCHours(20, 0, 0, 0);
  const acceptedRequestStart = addDays(now, 13);
  acceptedRequestStart.setUTCHours(22, 0, 0, 0);
  const pendingRequestStart = addDays(now, 15);
  pendingRequestStart.setUTCHours(21, 0, 0, 0);
  const rejectedRequestStart = addDays(now, 17);
  rejectedRequestStart.setUTCHours(23, 0, 0, 0);

  await Promise.all([
    prisma.classSession.upsert({
      where: { id: "session_trial_luis_voice" },
      update: {
        studentId: studentTwoProfile.id,
        teacherId: teacherProfile.id,
        type: ClassSessionType.TRIAL,
        startsAtUtc: trialClassStart,
        endsAtUtc: addHours(trialClassStart, 1),
        timezone: "America/Chicago",
        instrument: "Voz",
        locationMode: "ONLINE",
        studentVisibleNote: "Clase de prueba para evaluar respiración y afinación.",
      },
      create: {
        id: "session_trial_luis_voice",
        studentId: studentTwoProfile.id,
        teacherId: teacherProfile.id,
        type: ClassSessionType.TRIAL,
        startsAtUtc: trialClassStart,
        endsAtUtc: addHours(trialClassStart, 1),
        timezone: "America/Chicago",
        instrument: "Voz",
        locationMode: "ONLINE",
        meetingUrl: "https://meet.google.com/harmonizing-class",
        status: SessionStatus.SCHEDULED,
        lessonFocus: "Evaluación inicial de voz",
        studentVisibleNote: "Clase de prueba para evaluar respiración y afinación.",
        internalNote: "Demo: clase única creada por administración.",
      },
    }),
    prisma.classSession.upsert({
      where: { id: "session_makeup_isabella_piano" },
      update: {
        studentId: studentProfile.id,
        teacherId: teacherProfile.id,
        type: ClassSessionType.MAKEUP,
        startsAtUtc: makeupClassStart,
        endsAtUtc: addHours(makeupClassStart, 1),
        timezone: "America/Chicago",
        instrument: "Piano",
      },
      create: {
        id: "session_makeup_isabella_piano",
        studentId: studentProfile.id,
        teacherId: teacherProfile.id,
        type: ClassSessionType.MAKEUP,
        startsAtUtc: makeupClassStart,
        endsAtUtc: addHours(makeupClassStart, 1),
        timezone: "America/Chicago",
        instrument: "Piano",
        locationMode: "ONLINE",
        meetingUrl: "https://zoom.us/j/1234567890",
        status: SessionStatus.SCHEDULED,
        lessonFocus: "Reposición: compases 1-16",
        studentVisibleNote: "Clase de reposición enfocada en repertorio.",
      },
    }),
    prisma.classSession.upsert({
      where: { id: "session_extra_isabella_practice" },
      update: {
        studentId: studentProfile.id,
        teacherId: teacherProfile.id,
        type: ClassSessionType.EXTRA,
        startsAtUtc: extraPracticeStart,
        endsAtUtc: addHours(extraPracticeStart, 1),
        timezone: "America/Chicago",
        instrument: "Piano",
      },
      create: {
        id: "session_extra_isabella_practice",
        studentId: studentProfile.id,
        teacherId: teacherProfile.id,
        type: ClassSessionType.EXTRA,
        startsAtUtc: extraPracticeStart,
        endsAtUtc: addHours(extraPracticeStart, 1),
        timezone: "America/Chicago",
        instrument: "Piano",
        locationMode: "ONLINE",
        meetingUrl: "https://zoom.us/j/1234567890",
        status: SessionStatus.SCHEDULED,
        lessonFocus: "Práctica extra antes de grabar video",
        studentVisibleNote: "Trae dudas sobre manos juntas y metrónomo.",
      },
    }),
  ]);

  const acceptedClassRequest = await prisma.classRequest.upsert({
    where: { id: "class_request_accepted_makeup_isabella" },
    update: {
      studentId: studentProfile.id,
      teacherId: teacherProfile.id,
      requestedByUserId: studentUser.id,
      reviewedByUserId: teacherUser.id,
      type: ClassSessionType.MAKEUP,
      status: ClassRequestStatus.ACCEPTED,
      preferredStartUtc: acceptedRequestStart,
      preferredEndUtc: addHours(acceptedRequestStart, 1),
      timezone: "America/New_York",
      durationMin: 60,
      studentMessage: "Quiero recuperar la clase que perdí la semana pasada.",
      reviewerResponse: "Aprobada. Trabajaremos repertorio y lectura.",
      internalNote: "Solicitud aprobada desde seed demo.",
      rejectionReason: null,
      decidedAt: subDays(now, 1),
    },
    create: {
      id: "class_request_accepted_makeup_isabella",
      studentId: studentProfile.id,
      teacherId: teacherProfile.id,
      requestedByUserId: studentUser.id,
      reviewedByUserId: teacherUser.id,
      type: ClassSessionType.MAKEUP,
      status: ClassRequestStatus.ACCEPTED,
      preferredStartUtc: acceptedRequestStart,
      preferredEndUtc: addHours(acceptedRequestStart, 1),
      timezone: "America/New_York",
      durationMin: 60,
      studentMessage: "Quiero recuperar la clase que perdí la semana pasada.",
      reviewerResponse: "Aprobada. Trabajaremos repertorio y lectura.",
      internalNote: "Solicitud aprobada desde seed demo.",
      decidedAt: subDays(now, 1),
    },
  });

  await prisma.classSession.upsert({
    where: { id: "session_request_accepted_makeup_isabella" },
    update: {
      classRequestId: acceptedClassRequest.id,
      studentId: studentProfile.id,
      teacherId: teacherProfile.id,
      type: ClassSessionType.MAKEUP,
      startsAtUtc: acceptedRequestStart,
      endsAtUtc: addHours(acceptedRequestStart, 1),
      timezone: "America/New_York",
      instrument: "Piano",
    },
    create: {
      id: "session_request_accepted_makeup_isabella",
      classRequestId: acceptedClassRequest.id,
      studentId: studentProfile.id,
      teacherId: teacherProfile.id,
      type: ClassSessionType.MAKEUP,
      startsAtUtc: acceptedRequestStart,
      endsAtUtc: addHours(acceptedRequestStart, 1),
      timezone: "America/New_York",
      instrument: "Piano",
      locationMode: "ONLINE",
      meetingUrl: "https://zoom.us/j/1234567890",
      status: SessionStatus.SCHEDULED,
      lessonFocus: "Reposición aprobada desde solicitud",
      studentVisibleNote: "Solicitud aprobada: trae dudas sobre la sección B.",
    },
  });

  await prisma.classRequest.upsert({
    where: { id: "class_request_pending_extra_isabella" },
    update: {
      studentId: studentProfile.id,
      teacherId: teacherProfile.id,
      requestedByUserId: studentUser.id,
      type: ClassSessionType.EXTRA,
      status: ClassRequestStatus.PENDING,
      preferredStartUtc: pendingRequestStart,
      preferredEndUtc: addHours(pendingRequestStart, 1),
      timezone: "America/New_York",
      durationMin: 60,
      studentMessage: "Me gustaría una práctica extra antes del video semanal.",
      reviewerResponse: null,
      internalNote: null,
      rejectionReason: null,
      reviewedByUserId: null,
      decidedAt: null,
    },
    create: {
      id: "class_request_pending_extra_isabella",
      studentId: studentProfile.id,
      teacherId: teacherProfile.id,
      requestedByUserId: studentUser.id,
      type: ClassSessionType.EXTRA,
      status: ClassRequestStatus.PENDING,
      preferredStartUtc: pendingRequestStart,
      preferredEndUtc: addHours(pendingRequestStart, 1),
      timezone: "America/New_York",
      durationMin: 60,
      studentMessage: "Me gustaría una práctica extra antes del video semanal.",
    },
  });

  await prisma.classRequest.upsert({
    where: { id: "class_request_rejected_evaluation_luis" },
    update: {
      studentId: studentTwoProfile.id,
      teacherId: teacherProfile.id,
      requestedByUserId: studentTwoUser.id,
      reviewedByUserId: teacherUser.id,
      type: ClassSessionType.EVALUATION,
      status: ClassRequestStatus.REJECTED,
      preferredStartUtc: rejectedRequestStart,
      preferredEndUtc: addHours(rejectedRequestStart, 1),
      timezone: "America/Los_Angeles",
      durationMin: 60,
      studentMessage: "Quisiera una evaluación adicional antes de escoger repertorio nuevo.",
      reviewerResponse: null,
      rejectionReason: "Ese horario no está disponible. Propón un bloque dentro de la disponibilidad docente.",
      internalNote: "Demo: solicitud rechazada para mostrar el estado al estudiante.",
      decidedAt: subDays(now, 1),
    },
    create: {
      id: "class_request_rejected_evaluation_luis",
      studentId: studentTwoProfile.id,
      teacherId: teacherProfile.id,
      requestedByUserId: studentTwoUser.id,
      reviewedByUserId: teacherUser.id,
      type: ClassSessionType.EVALUATION,
      status: ClassRequestStatus.REJECTED,
      preferredStartUtc: rejectedRequestStart,
      preferredEndUtc: addHours(rejectedRequestStart, 1),
      timezone: "America/Los_Angeles",
      durationMin: 60,
      studentMessage: "Quisiera una evaluación adicional antes de escoger repertorio nuevo.",
      rejectionReason: "Ese horario no está disponible. Propón un bloque dentro de la disponibilidad docente.",
      internalNote: "Demo: solicitud rechazada para mostrar el estado al estudiante.",
      decidedAt: subDays(now, 1),
    },
  });

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

  const videoFeedback = await prisma.videoFeedback.upsert({
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

  const rhythm = skillCategories.get("GENERAL:Rhythm");
  const practiceDiscipline = skillCategories.get("GENERAL:Practice discipline");
  const handCoordination = skillCategories.get("PIANO:Hand coordination");
  const sightReading = skillCategories.get("PIANO:Sight reading");
  const timing = skillCategories.get("PIANO:Timing / metronome");
  const posture = skillCategories.get("PIANO:Posture");
  const breathControl = skillCategories.get("VOICE:Breath control");
  const pitchAccuracy = skillCategories.get("VOICE:Pitch accuracy");

  if (!rhythm || !practiceDiscipline || !handCoordination || !sightReading || !timing || !posture || !breathControl || !pitchAccuracy) {
    throw new Error("Missing seeded skill categories");
  }

  const lessonNote = await prisma.lessonNote.upsert({
    where: { sessionId: session2.id },
    update: {
      summary: "Isabella consolidó postura, pulso lento y coordinación básica de ambas manos.",
      taughtToday: "Trabajo de postura, respiración antes de tocar, lectura rítmica en negras y corcheas, y manos juntas en compases 1-8.",
      studentDidWell: "Mantuvo mejor relajación de hombros y logró tocar la primera frase con menos pausas.",
      needsImprovement: "Tiende a acelerar las corcheas cuando entra la mano izquierda.",
      homework: "Practicar compases 1-8 a 60 bpm, 12 minutos diarios, primero manos separadas y luego juntas.",
      nextLessonFocus: "Subir a 66 bpm y conectar compases 1-16 sin detenerse.",
      teacherPrivateNote: "Revisar tensión en muñeca derecha si vuelve a aparecer al subir tempo.",
      studentVisibleNote: "Excelente avance de coordinación. Mantén el tempo lento y celebra cada repetición limpia.",
      preparednessRating: 4,
      focusRating: 4,
      effortRating: 5,
      overallLessonRating: 4,
    },
    create: {
      sessionId: session2.id,
      studentId: studentProfile.id,
      teacherId: teacherProfile.id,
      summary: "Isabella consolidó postura, pulso lento y coordinación básica de ambas manos.",
      taughtToday: "Trabajo de postura, respiración antes de tocar, lectura rítmica en negras y corcheas, y manos juntas en compases 1-8.",
      studentDidWell: "Mantuvo mejor relajación de hombros y logró tocar la primera frase con menos pausas.",
      needsImprovement: "Tiende a acelerar las corcheas cuando entra la mano izquierda.",
      homework: "Practicar compases 1-8 a 60 bpm, 12 minutos diarios, primero manos separadas y luego juntas.",
      nextLessonFocus: "Subir a 66 bpm y conectar compases 1-16 sin detenerse.",
      teacherPrivateNote: "Revisar tensión en muñeca derecha si vuelve a aparecer al subir tempo.",
      studentVisibleNote: "Excelente avance de coordinación. Mantén el tempo lento y celebra cada repetición limpia.",
      preparednessRating: 4,
      focusRating: 4,
      effortRating: 5,
      overallLessonRating: 4,
    },
  });

  const voiceLessonNote = await prisma.lessonNote.upsert({
    where: { sessionId: session4.id },
    update: {
      summary: "Luis mejoró el control de aire en frases largas y mantuvo mejor afinación en calentamientos.",
      taughtToday: "Respiración diafragmática, vocalizaciones en terceras y dicción en verso principal.",
      studentDidWell: "Sostuvo frases más largas sin empujar el sonido.",
      needsImprovement: "Necesita preparar el calentamiento antes de clase.",
      homework: "Calentamiento de 8 minutos y práctica lenta del verso con respiraciones marcadas.",
      nextLessonFocus: "Afinación de saltos y soporte en notas largas.",
      studentVisibleNote: "El control del aire está más estable. Practica corto, constante y sin tensión.",
      preparednessRating: 3,
      focusRating: 4,
      effortRating: 4,
      overallLessonRating: 4,
    },
    create: {
      sessionId: session4.id,
      studentId: studentTwoProfile.id,
      teacherId: teacherProfile.id,
      summary: "Luis mejoró el control de aire en frases largas y mantuvo mejor afinación en calentamientos.",
      taughtToday: "Respiración diafragmática, vocalizaciones en terceras y dicción en verso principal.",
      studentDidWell: "Sostuvo frases más largas sin empujar el sonido.",
      needsImprovement: "Necesita preparar el calentamiento antes de clase.",
      homework: "Calentamiento de 8 minutos y práctica lenta del verso con respiraciones marcadas.",
      nextLessonFocus: "Afinación de saltos y soporte en notas largas.",
      studentVisibleNote: "El control del aire está más estable. Practica corto, constante y sin tensión.",
      preparednessRating: 3,
      focusRating: 4,
      effortRating: 4,
      overallLessonRating: 4,
    },
  });

  const lessonRatings = [
    { lessonNoteId: lessonNote.id, skillCategoryId: rhythm.id, rating: 3, note: "Aún acelera las corcheas al unir manos." },
    { lessonNoteId: lessonNote.id, skillCategoryId: handCoordination.id, rating: 4, note: "Mejor control manos juntas en tempo lento." },
    { lessonNoteId: lessonNote.id, skillCategoryId: sightReading.id, rating: 2, note: "Necesita más repetición con notas nuevas." },
    { lessonNoteId: lessonNote.id, skillCategoryId: posture.id, rating: 4, note: "Hombros más relajados y mejor banco." },
    { lessonNoteId: voiceLessonNote.id, skillCategoryId: breathControl.id, rating: 4, note: "Frases más estables y menos aire escapado." },
    { lessonNoteId: voiceLessonNote.id, skillCategoryId: pitchAccuracy.id, rating: 3, note: "Afinación estable en ejercicios, variable en canción." },
  ];

  for (const rating of lessonRatings) {
    await prisma.lessonSkillRating.upsert({
      where: {
        lessonNoteId_skillCategoryId: {
          lessonNoteId: rating.lessonNoteId,
          skillCategoryId: rating.skillCategoryId,
        },
      },
      update: { rating: rating.rating, note: rating.note },
      create: rating,
    });
  }

  const repertoire = await prisma.repertoireItem.upsert({
    where: { id: "rep_isabella_besame_mucho" },
    update: {
      studentId: studentProfile.id,
      teacherId: teacherProfile.id,
      status: RepertoireStatus.IMPROVING,
      masteryPercent: 68,
    },
    create: {
      id: "rep_isabella_besame_mucho",
      studentId: studentProfile.id,
      teacherId: teacherProfile.id,
      title: "Bésame Mucho",
      composerOrArtist: "Consuelo Velázquez",
      instrument: "Piano",
      level: "Intermedio inicial",
      status: RepertoireStatus.IMPROVING,
      startDate: subDays(now, 28),
      targetDate: addDays(now, 21),
      masteryPercent: 68,
      currentFocusSection: "Compases 1-16",
      currentTempo: 60,
      targetTempo: 76,
      teacherNotes: "Priorizar pulso estable antes de subir velocidad.",
      studentVisibleNotes: "Trabaja secciones pequeñas y toca siempre con metrónomo.",
    },
  });

  await prisma.repertoireItem.upsert({
    where: { id: "rep_luis_contigo_distancia" },
    update: {
      studentId: studentTwoProfile.id,
      teacherId: teacherProfile.id,
      status: RepertoireStatus.LEARNING,
      masteryPercent: 42,
    },
    create: {
      id: "rep_luis_contigo_distancia",
      studentId: studentTwoProfile.id,
      teacherId: teacherProfile.id,
      title: "Contigo en la distancia",
      composerOrArtist: "César Portillo de la Luz",
      instrument: "Voz",
      level: "Principiante alto",
      status: RepertoireStatus.LEARNING,
      startDate: subDays(now, 10),
      targetDate: addDays(now, 30),
      masteryPercent: 42,
      currentFocusSection: "Verso principal",
      teacherNotes: "Cuidar respiraciones antes de frases largas.",
      studentVisibleNotes: "Marca dónde respirar y canta sin empujar.",
    },
  });

  const assignment = await prisma.practiceAssignment.upsert({
    where: { id: "assignment_isabella_manos_juntas" },
    update: {
      status: PracticeAssignmentStatus.IN_PROGRESS,
      repertoireItemId: repertoire.id,
      skillCategoryId: handCoordination.id,
    },
    create: {
      id: "assignment_isabella_manos_juntas",
      studentId: studentProfile.id,
      teacherId: teacherProfile.id,
      lessonNoteId: lessonNote.id,
      classSessionId: session2.id,
      repertoireItemId: repertoire.id,
      skillCategoryId: handCoordination.id,
      title: "Compases 1-8 manos juntas",
      instructions: "Practica 3 rondas a 60 bpm. Si puedes tocar dos repeticiones limpias, sube a 63 bpm.",
      assignedDate: subDays(now, 5),
      dueDate: addDays(now, 2),
      status: PracticeAssignmentStatus.IN_PROGRESS,
      expectedMinutes: 12,
      requiresVideo: true,
      teacherReviewNote: "Revisar si mantiene tempo sin mirar demasiado las manos.",
    },
  });

  await prisma.practiceAssignment.upsert({
    where: { id: "assignment_isabella_lectura_ritmica" },
    update: {
      status: PracticeAssignmentStatus.ASSIGNED,
      skillCategoryId: rhythm.id,
    },
    create: {
      id: "assignment_isabella_lectura_ritmica",
      studentId: studentProfile.id,
      teacherId: teacherProfile.id,
      lessonNoteId: lessonNote.id,
      classSessionId: session2.id,
      skillCategoryId: rhythm.id,
      title: "Lectura rítmica con palmas",
      instructions: "Lee y marca negras/corcheas durante 5 minutos antes de tocar la pieza.",
      assignedDate: subDays(now, 5),
      dueDate: addDays(now, 2),
      status: PracticeAssignmentStatus.ASSIGNED,
      expectedMinutes: 5,
      requiresVideo: false,
    },
  });

  await prisma.practiceLog.deleteMany({ where: { studentId: studentProfile.id } });
  await prisma.practiceLog.createMany({
    data: [
      {
        studentId: studentProfile.id,
        assignmentId: assignment.id,
        repertoireItemId: repertoire.id,
        skillCategoryId: handCoordination.id,
        practicedOn: subDays(now, 4),
        minutesPracticed: 18,
        notes: "Manos separadas primero. Me costó mantener el tempo al final.",
        moodRating: 4,
        difficultyRating: 3,
      },
      {
        studentId: studentProfile.id,
        assignmentId: assignment.id,
        repertoireItemId: repertoire.id,
        skillCategoryId: timing.id,
        practicedOn: subDays(now, 2),
        minutesPracticed: 22,
        notes: "Usé metrónomo a 60 bpm y logré tocar dos veces sin parar.",
        moodRating: 5,
        difficultyRating: 2,
      },
    ],
  });

  await prisma.practiceVideo.update({
    where: { id: video.id },
    data: {
      practiceAssignmentId: assignment.id,
      repertoireItemId: repertoire.id,
      skillCategoryId: handCoordination.id,
    },
  });

  await prisma.videoSkillRating.upsert({
    where: {
      videoFeedbackId_skillCategoryId: {
        videoFeedbackId: videoFeedback.id,
        skillCategoryId: handCoordination.id,
      },
    },
    update: { rating: 4, note: "El video confirma mejor control de manos juntas." },
    create: {
      videoFeedbackId: videoFeedback.id,
      skillCategoryId: handCoordination.id,
      rating: 4,
      note: "El video confirma mejor control de manos juntas.",
    },
  });

  const publishedReportStart = subDays(now, 30);
  const publishedReportEnd = now;
  const publishedReportKey = `${studentProfile.id}:${teacherProfile.id}:${publishedReportStart.toISOString()}:${publishedReportEnd.toISOString()}`;
  const reportCategoryScores = {
    attendance: { score: 86, weight: 0.15, explanation: { es: "Buena asistencia en el período.", en: "Good attendance in the period." } },
    practiceConsistency: { score: 72, weight: 0.2, explanation: { es: "Práctica registrada, con espacio para mayor constancia.", en: "Practice was logged, with room for more consistency." } },
    assignmentCompletion: { score: 70, weight: 0.2, explanation: { es: "Tareas en progreso.", en: "Assignments are in progress." } },
    skillProgress: { score: 84, weight: 0.25, explanation: { es: "Mejora clara en coordinación.", en: "Clear improvement in coordination." } },
    repertoireProgress: { score: 78, weight: 0.1, explanation: { es: "Repertorio avanzando por secciones.", en: "Repertoire is moving section by section." } },
    effortFocus: { score: 90, weight: 0.1, explanation: { es: "Muy buena actitud y enfoque.", en: "Very good attitude and focus." } },
  };
  const reportSkillSummary = {
    items: [
      { skillCategoryId: rhythm.id, name: "Rhythm", instrument: "PIANO", latestAverage: 3, firstAverage: 2.5, lastAverage: 3, delta: 0.5, trend: "UP", ratingCount: 2, recentNotes: ["Still rushing eighth notes"] },
      { skillCategoryId: handCoordination.id, name: "Hand coordination", instrument: "PIANO", latestAverage: 4, firstAverage: 3.5, lastAverage: 4, delta: 0.5, trend: "UP", ratingCount: 2, recentNotes: ["Improved hands-together control"] },
      { skillCategoryId: sightReading.id, name: "Sight reading", instrument: "PIANO", latestAverage: 2, firstAverage: 2, lastAverage: 2, delta: 0, trend: "FLAT", ratingCount: 1, recentNotes: ["Needs more repetition"] },
    ],
    strongest: [{ name: "Hand coordination", latestAverage: 4 }],
    needsPractice: [{ name: "Sight reading", latestAverage: 2 }],
    insufficientData: false,
  };

  await prisma.progressReport.upsert({
    where: { id: "report_isabella_april_foundation" },
    update: {
      reportKey: publishedReportKey,
      status: ProgressReportStatus.PUBLISHED,
      generatedAt: publishedReportStart,
      publishedAt: now,
      publishedByUserId: adminUser.id,
      rubricVersion: "default-v1",
      totalScheduledClasses: 2,
      attendanceCount: 1,
      completedLessonsCount: 1,
      missedLessonsCount: 1,
      cancelledLessonsCount: 0,
      missedCancelledCount: 1,
      singleClassesCount: 0,
      recurringClassesCount: 2,
      lessonNotesCompletedCount: 1,
      missingLessonNotesCount: 0,
      totalPracticeMinutes: 40,
      practiceLogCount: 2,
      practiceAssignmentCount: 1,
      completedAssignmentCount: 0,
      practiceAssignmentCompletionRate: 0,
      overdueAssignmentCount: 0,
      videoSubmissionsCount: 1,
      reviewedVideoCount: 1,
      repertoireWorkedCount: 1,
      repertoireCompletedCount: 0,
      averageLessonRating: 4,
      averagePreparednessRating: 4,
      averageFocusRating: 4,
      averageEffortRating: 5,
      averageSkillRatings: {
        Rhythm: 3,
        "Hand coordination": 4,
        "Sight reading": 2,
        Posture: 4,
      },
      categoryScores: reportCategoryScores,
      skillSummary: reportSkillSummary,
      attendanceSummary: { totalScheduled: 2, completed: 1, missed: 1, cancelled: 0, recurring: 2, single: 0, lessonNotesCompleted: 1, missingLessonNotes: 0 },
      practiceSummary: { totalMinutes: 40, logCount: 2, assignmentCount: 1, completedAssignmentCount: 0, overdueAssignmentCount: 0, completionRate: 0, averageMinutesPerWeek: 10 },
      videoSummary: { submitted: 1, reviewed: 1, pending: 0, highlights: [{ comment: videoFeedback.comment, videoId: video.id }] },
      repertoireSummary: { worked: 1, completed: 0, averageMasteryPercent: 68, items: [{ id: repertoire.id, title: repertoire.title, status: repertoire.status, masteryPercent: repertoire.masteryPercent, focus: repertoire.currentFocusSection }] },
      repertoireProgressSummary: {
        activeItems: 1,
        averageMasteryPercent: 68,
        byStatus: { IMPROVING: 1 },
      },
      teacherSummary: "Isabella muestra constancia y mejor coordinación cuando trabaja a tempo lento.",
      strengths: "Disciplina, sensibilidad musical y disposición para repetir con paciencia.",
      improvementAreas: "Lectura a primera vista y estabilidad rítmica con ambas manos.",
      recommendedNextFocus: "Mantener metrónomo y ampliar de compases 1-8 a 1-16.",
      finalGrade: "B+",
      gradeLetter: "B+",
      gradePercentage: 86,
      studentVisibleSummary: "Isabella está avanzando con buen enfoque. Este mes debe mantener metrónomo, reforzar lectura y seguir trabajando coordinación por secciones.",
      adminNote: "Demo publicado para vista de estudiante/familia.",
    },
    create: {
      id: "report_isabella_april_foundation",
      reportKey: publishedReportKey,
      studentId: studentProfile.id,
      teacherId: teacherProfile.id,
      generatedByUserId: teacherUser.id,
      publishedByUserId: adminUser.id,
      startDate: publishedReportStart,
      endDate: publishedReportEnd,
      status: ProgressReportStatus.PUBLISHED,
      generatedAt: publishedReportStart,
      publishedAt: now,
      rubricVersion: "default-v1",
      totalScheduledClasses: 2,
      attendanceCount: 1,
      completedLessonsCount: 1,
      missedLessonsCount: 1,
      cancelledLessonsCount: 0,
      missedCancelledCount: 1,
      singleClassesCount: 0,
      recurringClassesCount: 2,
      lessonNotesCompletedCount: 1,
      missingLessonNotesCount: 0,
      totalPracticeMinutes: 40,
      practiceLogCount: 2,
      practiceAssignmentCount: 1,
      completedAssignmentCount: 0,
      practiceAssignmentCompletionRate: 0,
      overdueAssignmentCount: 0,
      videoSubmissionsCount: 1,
      reviewedVideoCount: 1,
      repertoireWorkedCount: 1,
      repertoireCompletedCount: 0,
      averageLessonRating: 4,
      averagePreparednessRating: 4,
      averageFocusRating: 4,
      averageEffortRating: 5,
      averageSkillRatings: {
        Rhythm: 3,
        "Hand coordination": 4,
        "Sight reading": 2,
        Posture: 4,
      },
      categoryScores: reportCategoryScores,
      skillSummary: reportSkillSummary,
      attendanceSummary: { totalScheduled: 2, completed: 1, missed: 1, cancelled: 0, recurring: 2, single: 0, lessonNotesCompleted: 1, missingLessonNotes: 0 },
      practiceSummary: { totalMinutes: 40, logCount: 2, assignmentCount: 1, completedAssignmentCount: 0, overdueAssignmentCount: 0, completionRate: 0, averageMinutesPerWeek: 10 },
      videoSummary: { submitted: 1, reviewed: 1, pending: 0, highlights: [{ comment: videoFeedback.comment, videoId: video.id }] },
      repertoireSummary: { worked: 1, completed: 0, averageMasteryPercent: 68, items: [{ id: repertoire.id, title: repertoire.title, status: repertoire.status, masteryPercent: repertoire.masteryPercent, focus: repertoire.currentFocusSection }] },
      repertoireProgressSummary: {
        activeItems: 1,
        averageMasteryPercent: 68,
        byStatus: { IMPROVING: 1 },
      },
      teacherSummary: "Isabella muestra constancia y mejor coordinación cuando trabaja a tempo lento.",
      strengths: "Disciplina, sensibilidad musical y disposición para repetir con paciencia.",
      improvementAreas: "Lectura a primera vista y estabilidad rítmica con ambas manos.",
      recommendedNextFocus: "Mantener metrónomo y ampliar de compases 1-8 a 1-16.",
      finalGrade: "B+",
      gradeLetter: "B+",
      gradePercentage: 86,
      studentVisibleSummary: "Isabella está avanzando con buen enfoque. Este mes debe mantener metrónomo, reforzar lectura y seguir trabajando coordinación por secciones.",
      adminNote: "Demo publicado para vista de estudiante/familia.",
    },
  });

  const draftReportStart = subDays(now, 14);
  const draftReportEnd = now;
  await prisma.progressReport.upsert({
    where: { id: "report_isabella_current_draft" },
    update: {
      reportKey: `${studentProfile.id}:${teacherProfile.id}:${draftReportStart.toISOString()}:${draftReportEnd.toISOString()}`,
      status: ProgressReportStatus.DRAFT,
      generatedAt: draftReportStart,
      totalScheduledClasses: 1,
      completedLessonsCount: 1,
      lessonNotesCompletedCount: 1,
      totalPracticeMinutes: 40,
      practiceLogCount: 2,
      practiceAssignmentCount: 1,
      completedAssignmentCount: 0,
      practiceAssignmentCompletionRate: 0,
      videoSubmissionsCount: 1,
      reviewedVideoCount: 1,
      repertoireWorkedCount: 1,
      averageLessonRating: 4,
      averageSkillRatings: { Rhythm: 3, "Hand coordination": 4 },
      categoryScores: reportCategoryScores,
      skillSummary: reportSkillSummary,
      attendanceSummary: { totalScheduled: 1, completed: 1, missed: 0, cancelled: 0, recurring: 1, single: 0, lessonNotesCompleted: 1, missingLessonNotes: 0 },
      practiceSummary: { totalMinutes: 40, logCount: 2, assignmentCount: 1, completedAssignmentCount: 0, overdueAssignmentCount: 0, completionRate: 0, averageMinutesPerWeek: 20 },
      videoSummary: { submitted: 1, reviewed: 1, pending: 0, highlights: [{ comment: videoFeedback.comment, videoId: video.id }] },
      repertoireSummary: { worked: 1, completed: 0, averageMasteryPercent: 68, items: [{ id: repertoire.id, title: repertoire.title, status: repertoire.status, masteryPercent: repertoire.masteryPercent, focus: repertoire.currentFocusSection }] },
      repertoireProgressSummary: { activeItems: 1, averageMasteryPercent: 68, byStatus: { IMPROVING: 1 } },
      teacherSummary: "Borrador para revisión administrativa.",
      strengths: "Buena actitud y progreso técnico.",
      improvementAreas: "Reforzar lectura y pulso interno.",
      recommendedNextFocus: "Preparar un bloque corto de lectura cada día.",
      gradeLetter: "B",
      finalGrade: "B",
      gradePercentage: 84,
      studentVisibleSummary: "Borrador no publicado.",
    },
    create: {
      id: "report_isabella_current_draft",
      reportKey: `${studentProfile.id}:${teacherProfile.id}:${draftReportStart.toISOString()}:${draftReportEnd.toISOString()}`,
      studentId: studentProfile.id,
      teacherId: teacherProfile.id,
      generatedByUserId: teacherUser.id,
      startDate: draftReportStart,
      endDate: draftReportEnd,
      status: ProgressReportStatus.DRAFT,
      generatedAt: draftReportStart,
      totalScheduledClasses: 1,
      completedLessonsCount: 1,
      lessonNotesCompletedCount: 1,
      totalPracticeMinutes: 40,
      practiceLogCount: 2,
      practiceAssignmentCount: 1,
      completedAssignmentCount: 0,
      practiceAssignmentCompletionRate: 0,
      videoSubmissionsCount: 1,
      reviewedVideoCount: 1,
      repertoireWorkedCount: 1,
      averageLessonRating: 4,
      averageSkillRatings: { Rhythm: 3, "Hand coordination": 4 },
      categoryScores: reportCategoryScores,
      skillSummary: reportSkillSummary,
      attendanceSummary: { totalScheduled: 1, completed: 1, missed: 0, cancelled: 0, recurring: 1, single: 0, lessonNotesCompleted: 1, missingLessonNotes: 0 },
      practiceSummary: { totalMinutes: 40, logCount: 2, assignmentCount: 1, completedAssignmentCount: 0, overdueAssignmentCount: 0, completionRate: 0, averageMinutesPerWeek: 20 },
      videoSummary: { submitted: 1, reviewed: 1, pending: 0, highlights: [{ comment: videoFeedback.comment, videoId: video.id }] },
      repertoireSummary: { worked: 1, completed: 0, averageMasteryPercent: 68, items: [{ id: repertoire.id, title: repertoire.title, status: repertoire.status, masteryPercent: repertoire.masteryPercent, focus: repertoire.currentFocusSection }] },
      repertoireProgressSummary: { activeItems: 1, averageMasteryPercent: 68, byStatus: { IMPROVING: 1 } },
      teacherSummary: "Borrador para revisión administrativa.",
      strengths: "Buena actitud y progreso técnico.",
      improvementAreas: "Reforzar lectura y pulso interno.",
      recommendedNextFocus: "Preparar un bloque corto de lectura cada día.",
      gradeLetter: "B",
      finalGrade: "B",
      gradePercentage: 84,
      studentVisibleSummary: "Borrador no publicado.",
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
        userId: studentUser.id,
        type: NotificationType.SYSTEM,
        title: "Tu reporte de progreso está listo",
        body: "Ya puedes revisar tu resumen mensual, calificación y próximo enfoque.",
        actionUrl: "/progress/reports/report_isabella_april_foundation",
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
