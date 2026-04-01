import { PrismaClient, Role, SessionStatus, StudentLevel, NotificationType, RescheduleStatus, VideoStatus } from "@prisma/client";
import { hash } from "bcryptjs";
import { addDays, addHours, subDays } from "date-fns";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await hash("Harmonizing123!", 10);

  const [adminUser, teacherUser, studentUser, studentTwoUser] = await Promise.all([
    prisma.user.upsert({
      where: { email: "admin@harmonizing.app" },
      update: {},
      create: {
        name: "Sofia Morales",
        email: "admin@harmonizing.app",
        passwordHash,
        role: Role.ADMIN,
        locale: "es",
        timezone: "America/New_York",
        image: "/demo/admin.svg",
      },
    }),
    prisma.user.upsert({
      where: { email: "teacher@harmonizing.app" },
      update: {},
      create: {
        name: "Daniela Rojas",
        email: "teacher@harmonizing.app",
        passwordHash,
        role: Role.TEACHER,
        locale: "es",
        timezone: "America/Chicago",
        image: "/demo/teacher.svg",
      },
    }),
    prisma.user.upsert({
      where: { email: "student@harmonizing.app" },
      update: {},
      create: {
        name: "Camila Herrera",
        email: "student@harmonizing.app",
        passwordHash,
        role: Role.STUDENT,
        locale: "es",
        timezone: "America/New_York",
        image: "/demo/student.svg",
      },
    }),
    prisma.user.upsert({
      where: { email: "student2@harmonizing.app" },
      update: {},
      create: {
        name: "Luis Castillo",
        email: "student2@harmonizing.app",
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
    update: {},
    create: {
      userId: teacherUser.id,
      specialty: "Técnica vocal y piano contemporáneo",
      bio: "Más de 10 años acompañando estudiantes hispanos en EE.UU.",
      zoomLink: "https://zoom.us/j/1234567890",
      meetLink: "https://meet.google.com/harmonizing-class",
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

  const [session1, session2, session3] = await Promise.all([
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
    ],
  });

  console.log("Seed completed", {
    admin: adminUser.email,
    teacher: teacherUser.email,
    student: studentUser.email,
    student2: studentTwoUser.email,
    sessionIds: [session1.id, session2.id, session3.id],
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
