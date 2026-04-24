import { InvoiceSyncScope } from "@prisma/client";

import { db } from "@/lib/db";
import { isInvoiceDataStale } from "@/lib/invoices/sync";
import { canUseAlegra } from "@/lib/alegra/client";

export async function getStudentInvoicesView(studentProfileId: string) {
  const [invoices, link, latestRun, aggregates] = await Promise.all([
    db.invoice.findMany({
      where: { studentId: studentProfileId },
      orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
      take: 60,
    }),
    db.invoiceContactLink.findUnique({ where: { studentId: studentProfileId } }),
    db.invoiceSyncRun.findFirst({
      where: {
        scope: InvoiceSyncScope.STUDENT,
        studentId: studentProfileId,
      },
      orderBy: { startedAt: "desc" },
    }),
    db.invoice.aggregate({
      where: { studentId: studentProfileId },
      _max: { lastSyncedAt: true },
      _count: { id: true },
    }),
  ]);

  const lastSyncedAt = aggregates._max.lastSyncedAt;

  return {
    invoices,
    link,
    latestRun,
    totalInvoices: aggregates._count.id,
    lastSyncedAt,
    isStale: isInvoiceDataStale(lastSyncedAt),
    isDemoMode: !canUseAlegra(),
  };
}

export async function getAdminInvoicesOverview() {
  const students = await db.studentProfile.findMany({
    include: {
      user: true,
      assignment: {
        include: {
          teacher: {
            include: { user: true },
          },
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  const studentIds = students.map((student) => student.id);

  const [invoiceStats, links, latestRuns, latestAllRun] = await Promise.all([
    db.invoice.groupBy({
      by: ["studentId"],
      where: { studentId: { in: studentIds } },
      _count: { id: true },
      _max: { lastSyncedAt: true },
    }),
    db.invoiceContactLink.findMany({
      where: { studentId: { in: studentIds } },
    }),
    db.invoiceSyncRun.findMany({
      where: {
        scope: InvoiceSyncScope.STUDENT,
        studentId: { in: studentIds },
      },
      orderBy: { startedAt: "desc" },
    }),
    db.invoiceSyncRun.findFirst({
      where: { scope: InvoiceSyncScope.ALL },
      orderBy: { startedAt: "desc" },
    }),
  ]);

  const statsMap = new Map(invoiceStats.map((stat) => [stat.studentId, stat]));
  const linkMap = new Map(links.map((link) => [link.studentId, link]));
  const latestRunMap = new Map<string, (typeof latestRuns)[number]>();
  for (const run of latestRuns) {
    if (!run.studentId || latestRunMap.has(run.studentId)) continue;
    latestRunMap.set(run.studentId, run);
  }

  const rows = students.map((student) => {
    const stats = statsMap.get(student.id);
    const link = linkMap.get(student.id) ?? null;
    const latestRun = latestRunMap.get(student.id) ?? null;

    return {
      studentId: student.id,
      userId: student.user.id,
      name: student.user.name,
      email: student.user.email,
      image: student.user.image,
      teacherName: student.assignment?.teacher.user.name ?? "Sin asignar",
      invoiceCount: stats?._count.id ?? 0,
      lastSyncedAt: stats?._max.lastSyncedAt ?? null,
      isStale: isInvoiceDataStale(stats?._max.lastSyncedAt ?? null),
      link,
      latestRun,
    };
  });

  return {
    rows,
    latestAllRun,
    isDemoMode: !canUseAlegra(),
  };
}
