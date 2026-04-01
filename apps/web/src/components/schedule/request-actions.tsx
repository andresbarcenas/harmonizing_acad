"use client";

import { RescheduleStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";

export function RequestActions({ requestId }: { requestId: string }) {
  async function decide(status: RescheduleStatus) {
    await fetch("/api/reschedules", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId,
        status,
        teacherResponse: status === RescheduleStatus.REJECTED ? "Horario no disponible" : undefined,
      }),
    });
    window.location.reload();
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" variant="gold" onClick={() => decide(RescheduleStatus.ACCEPTED)}>
        Aceptar
      </Button>
      <Button size="sm" variant="outline" onClick={() => decide(RescheduleStatus.REJECTED)}>
        Rechazar
      </Button>
    </div>
  );
}
