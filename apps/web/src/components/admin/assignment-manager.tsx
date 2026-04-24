"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type AssignmentRow = {
  id: string;
  studentId: string;
  studentName: string;
  assignedAt: string;
  teacherId: string;
};

type TeacherOption = {
  id: string;
  name: string;
};

export function AssignmentManager({
  assignments,
  teachers,
}: {
  assignments: AssignmentRow[];
  teachers: TeacherOption[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Record<string, string>>(
    Object.fromEntries(assignments.map((item) => [item.studentId, item.teacherId])),
  );
  const [pendingStudentId, setPendingStudentId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");

  async function reassign(studentId: string) {
    const teacherId = selected[studentId];
    if (!teacherId) return;
    setPendingStudentId(studentId);
    setStatus("");

    const response = await fetch("/api/admin/assignments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, teacherId }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setStatus(payload?.error ?? "No se pudo actualizar la asignación.");
      setPendingStudentId(null);
      return;
    }

    setStatus("Asignación actualizada.");
    setPendingStudentId(null);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      {assignments.map((assignment) => (
        <div key={assignment.id} className="flex flex-col gap-2 rounded-[1.2rem] border border-[var(--color-border)] bg-white/68 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium">{assignment.studentName}</p>
            <p className="text-xs text-[var(--color-ink-soft)]">
              Asignado: {new Date(assignment.assignedAt).toLocaleDateString("es-US")}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <label className="sr-only" htmlFor={`teacher-${assignment.studentId}`}>
              Docente para {assignment.studentName}
            </label>
            <select
              id={`teacher-${assignment.studentId}`}
              value={selected[assignment.studentId] ?? assignment.teacherId}
              onChange={(event) =>
                setSelected((previous) => ({
                  ...previous,
                  [assignment.studentId]: event.target.value,
                }))
              }
              className="h-10 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm sm:w-auto"
            >
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="gold"
              onClick={() => reassign(assignment.studentId)}
              disabled={pendingStudentId === assignment.studentId}
              className="w-full sm:w-auto"
            >
              {pendingStudentId === assignment.studentId ? "Guardando..." : "Reasignar"}
            </Button>
          </div>
        </div>
      ))}
      {status ? <p className="text-xs text-[var(--color-ink-soft)]">{status}</p> : null}
    </div>
  );
}
