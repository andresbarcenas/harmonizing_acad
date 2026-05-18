import { notFound } from "next/navigation";
import { Role } from "@prisma/client";

import { AfterClassWorkflow } from "@/components/teacher/after-class-workflow";
import { AppShell } from "@/components/ui/app-shell";
import { requireViewer } from "@/features/auth/server";
import { getTeacherClassCompletionData } from "@/lib/data";
import { ProgressDataError } from "@/lib/data/progress";
import { formatDateTimeInZone } from "@/lib/i18n";

type PageProps = { params: Promise<{ classId: string }> };

export default async function TeacherClassCompletionPage({ params }: PageProps) {
  const viewer = await requireViewer([Role.TEACHER]);
  const { classId } = await params;

  let data: Awaited<ReturnType<typeof getTeacherClassCompletionData>>;
  try {
    data = await getTeacherClassCompletionData(viewer, classId);
  } catch (error) {
    if (error instanceof ProgressDataError) notFound();
    throw error;
  }

  const { session } = data;
  const classDateLabel = formatDateTimeInZone(session.startsAtUtc, viewer.timezone, viewer.locale);

  return (
    <AppShell role={viewer.role} activePath="/teacher/progress" userName={viewer.name} locale={viewer.locale} selectedTeacherStudentId={session.studentId}>
      <AfterClassWorkflow
        locale={viewer.locale}
        classId={session.id}
        classDateLabel={classDateLabel}
        initialStatus={session.status}
        lessonFocus={session.lessonFocus}
        initialLessonInstrument={session.instrument ?? session.student.preferredInstrument}
        student={{
          id: session.student.id,
          name: session.student.user.name,
          timezone: session.student.user.timezone,
          preferredInstrument: session.student.preferredInstrument,
        }}
        lessonNote={session.lessonNote ? {
          summary: session.lessonNote.summary,
          taughtToday: session.lessonNote.taughtToday ?? "",
          studentDidWell: session.lessonNote.studentDidWell ?? "",
          needsImprovement: session.lessonNote.needsImprovement ?? "",
          homework: session.lessonNote.homework ?? "",
          nextLessonFocus: session.lessonNote.nextLessonFocus ?? "",
          teacherPrivateNote: session.lessonNote.teacherPrivateNote ?? "",
          studentVisibleNote: session.lessonNote.studentVisibleNote ?? "",
          preparednessRating: session.lessonNote.preparednessRating ?? undefined,
          focusRating: session.lessonNote.focusRating ?? undefined,
          effortRating: session.lessonNote.effortRating ?? undefined,
          overallLessonRating: session.lessonNote.overallLessonRating ?? undefined,
          skillRatings: session.lessonNote.skillRatings.map((rating) => ({
            skillCategoryId: rating.skillCategoryId,
            rating: rating.rating,
            note: rating.note,
          })),
          practiceAssignments: session.lessonNote.practiceAssignments.map((assignment) => ({
            id: assignment.id,
            title: assignment.title,
            requiresVideo: assignment.requiresVideo,
          })),
        } : null}
        skillCategories={data.skillCategories.map((skill) => ({ id: skill.id, name: skill.name, instrument: skill.instrument }))}
        attachments={session.attachments.map((attachment) => ({
          id: attachment.id,
          originalName: attachment.originalName,
          sizeBytes: attachment.sizeBytes,
          url: `/api/media/class-attachments/${attachment.id}`,
        }))}
        repertoireItems={data.repertoireItems.map((item) => ({
          id: item.id,
          title: item.title,
          composerOrArtist: item.composerOrArtist,
          instrument: item.instrument,
          status: item.status,
          masteryPercent: item.masteryPercent,
          currentFocusSection: item.currentFocusSection,
          currentTempo: item.currentTempo,
          targetTempo: item.targetTempo,
          teacherNotes: item.teacherNotes,
          studentVisibleNotes: item.studentVisibleNotes,
        }))}
      />
    </AppShell>
  );
}
