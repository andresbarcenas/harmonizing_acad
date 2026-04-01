"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function MessagesPanel({
  threadId,
  messages,
  currentUserId,
}: {
  threadId: string;
  messages: Array<{ id: string; content: string; createdAt: string; sender: { id: string; name: string | null } }>;
  currentUserId: string;
}) {
  const [draft, setDraft] = useState("");
  const [localMessages, setLocalMessages] = useState(messages);

  async function send() {
    if (!draft.trim()) return;

    const response = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threadId, content: draft }),
    });

    if (!response.ok) return;

    const { message } = (await response.json()) as {
      message: { id: string; content: string; createdAt: string; sender: { id: string; name: string | null } };
    };
    setLocalMessages((prev) => [...prev, message]);
    setDraft("");
  }

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-paper)] p-4">
      <div className="max-h-[360px] space-y-3 overflow-y-auto">
        {localMessages.map((message) => {
          const own = message.sender.id === currentUserId;
          return (
            <div
              key={message.id}
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                own ? "ml-auto bg-[var(--color-ink)] text-[var(--color-paper)]" : "bg-[var(--color-muted)]"
              }`}
            >
              <p>{message.content}</p>
              <p className={`mt-1 text-[10px] ${own ? "text-[var(--color-paper)]/70" : "text-[var(--color-ink-soft)]"}`}>
                {message.sender.name} · {new Date(message.createdAt).toLocaleTimeString("es-US", { hour: "numeric", minute: "2-digit" })}
              </p>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex gap-2">
        <Input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Escribe un mensaje" />
        <Button onClick={send}>Enviar</Button>
      </div>
    </div>
  );
}
