"use client";

import Link from "next/link";
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
  const unread = items.filter((item) => !item.readAt).length;

  async function markRead(id: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId: id }),
    });

    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, readAt: new Date().toISOString() } : item)));
  }

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    });
    setItems((prev) => prev.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
  }

  async function simulateReminders() {
    await fetch("/api/notifications", { method: "POST" });
  }

  return (
    <div className="space-y-3">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-[var(--color-ink-soft)]">{unread} notificación(es) sin leer.</p>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button variant="outline" onClick={simulateReminders} className="w-full sm:w-auto">Simular recordatorios</Button>
            <Button variant="ghost" onClick={markAllRead} disabled={!unread} className="w-full sm:w-auto">Marcar todas</Button>
          </div>
        </div>
      </Card>
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
          {!item.readAt || item.actionUrl ? (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              {!item.readAt ? (
                <Button variant="ghost" className="w-full sm:w-auto" onClick={() => markRead(item.id)}>
                  Marcar como leída
                </Button>
              ) : null}
              {item.actionUrl ? (
                <Link href={item.actionUrl}>
                  <Button variant="outline" className="w-full sm:w-auto">Abrir</Button>
                </Link>
              ) : null}
            </div>
          ) : null}
        </Card>
      ))}
    </div>
  );
}
