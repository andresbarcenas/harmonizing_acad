"use client";

import { useEffect, useState } from "react";

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
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const interval = window.setInterval(async () => {
      const response = await fetch(`/api/messages?threadId=${threadId}`);
      if (!response.ok) return;
      const payload = (await response.json()) as {
        messages: Array<{ id: string; content: string; createdAt: string; sender: { id: string; name: string | null } }>;
      };
      setLocalMessages((previous) => {
        if (!payload.messages?.length) return previous;
        if (payload.messages[payload.messages.length - 1]?.id === previous[previous.length - 1]?.id) return previous;
        return payload.messages;
      });
    }, 10000);

    return () => window.clearInterval(interval);
  }, [threadId]);

  async function send() {
    if (!draft.trim()) return;
    setSending(true);
    const optimisticId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: optimisticId,
      content: draft.trim(),
      createdAt: new Date().toISOString(),
      sender: { id: currentUserId, name: "Tú" },
    };
    setLocalMessages((prev) => [...prev, optimisticMessage]);
    setDraft("");

    const response = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threadId, content: optimisticMessage.content }),
    });

    if (!response.ok) {
      setLocalMessages((prev) => prev.filter((message) => message.id !== optimisticId));
      setSending(false);
      return;
    }

    const { message } = (await response.json()) as {
      message: { id: string; content: string; createdAt: string; sender: { id: string; name: string | null } };
    };
    setLocalMessages((prev) => prev.map((item) => (item.id === optimisticId ? message : item)));
    setSending(false);
  }

  return (
    <div className="rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-[var(--color-paper-elevated)] p-4 shadow-[var(--shadow-card)] backdrop-blur-[14px] md:p-6">
      <div className="max-h-[360px] space-y-3 overflow-y-auto">
        {localMessages.map((message) => {
          const own = message.sender.id === currentUserId;
          return (
            <div
              key={message.id}
              className={`max-w-[85%] rounded-[1.35rem] px-4 py-3 text-sm shadow-[0_10px_26px_rgba(78,55,30,0.04)] ${
                own ? "ml-auto bg-[var(--color-gold)] text-white" : "border border-[var(--color-border)] bg-white/76 text-[var(--color-ink)]"
              }`}
            >
              <p>{message.content}</p>
              <p className={`mt-1 text-[10px] ${own ? "text-white/72" : "text-[var(--color-ink-soft)]"}`}>
                {message.sender.name} · {new Date(message.createdAt).toLocaleTimeString("es-US", { hour: "numeric", minute: "2-digit" })}
              </p>
            </div>
          );
        })}
      </div>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Escribe un mensaje" />
        <Button variant="gold" onClick={send} disabled={sending || !draft.trim()} className="w-full sm:w-auto">
          {sending ? "Enviando..." : "Enviar"}
        </Button>
      </div>
    </div>
  );
}
