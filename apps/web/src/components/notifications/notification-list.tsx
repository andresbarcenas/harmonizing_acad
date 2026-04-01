"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function NotificationList({
  initial,
}: {
  initial: Array<{ id: string; title: string; body: string; createdAt: string; readAt: string | null; actionUrl: string | null }>;
}) {
  const [items, setItems] = useState(initial);

  async function markRead(id: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId: id }),
    });

    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, readAt: new Date().toISOString() } : item)));
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Card key={item.id}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">{item.title}</p>
              <p className="mt-1 text-sm text-[var(--color-ink-soft)]">{item.body}</p>
              <p className="mt-2 text-xs text-[var(--color-ink-soft)]">
                {new Date(item.createdAt).toLocaleString("es-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </div>
            {item.readAt ? <Badge variant="default">Leída</Badge> : <Badge variant="gold">Nueva</Badge>}
          </div>
          {!item.readAt ? (
            <Button variant="ghost" className="mt-3" onClick={() => markRead(item.id)}>
              Marcar como leída
            </Button>
          ) : null}
        </Card>
      ))}
    </div>
  );
}
