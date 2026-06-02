"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button, type ButtonProps } from "@/components/ui/button";
import type { AppLocale } from "@/lib/i18n/locales";

type ButtonSize = ButtonProps["size"];
type ButtonVariant = ButtonProps["variant"];

type JoinClassButtonProps = {
  classId: string;
  meetingUrl: string;
  locale: AppLocale;
  label: string;
  teacherCanStart?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

type MarkClassStartedButtonProps = {
  classId: string;
  locale: AppLocale;
  label: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

function copy(locale: AppLocale) {
  return locale === "es"
    ? {
        starting: "Iniciando...",
        error: "No se pudo marcar la clase como iniciada.",
        started: "Clase iniciada.",
      }
    : {
        starting: "Starting...",
        error: "Could not mark the class as started.",
        started: "Class started.",
      };
}

export function JoinClassButton({
  classId,
  meetingUrl,
  locale,
  label,
  teacherCanStart = false,
  size = "sm",
  variant = "gold",
}: JoinClassButtonProps) {
  const router = useRouter();
  const c = copy(locale);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [, startTransition] = useTransition();

  if (!teacherCanStart) {
    return (
      <a href={meetingUrl} target="_blank" rel="noreferrer">
        <Button variant={variant} size={size}>{label}</Button>
      </a>
    );
  }

  async function joinAndStart() {
    setPending(true);
    setMessage("");
    const meetingWindow = window.open("about:blank", "_blank");
    if (meetingWindow) meetingWindow.opener = null;
    const ok = await startClass(classId);
    setPending(false);

    if (!ok) {
      meetingWindow?.close();
      setMessage(c.error);
      return;
    }

    if (meetingWindow) {
      meetingWindow.location.href = meetingUrl;
    } else {
      window.open(meetingUrl, "_blank", "noopener,noreferrer");
    }
    startTransition(() => router.refresh());
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <Button type="button" variant={variant} size={size} disabled={pending} onClick={joinAndStart}>
        {pending ? c.starting : label}
      </Button>
      {message ? <span className="text-xs text-rose-700">{message}</span> : null}
    </span>
  );
}

export function MarkClassStartedButton({
  classId,
  locale,
  label,
  size = "sm",
  variant = "outline",
}: MarkClassStartedButtonProps) {
  const router = useRouter();
  const c = copy(locale);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [, startTransition] = useTransition();

  async function markStarted() {
    setPending(true);
    setMessage("");
    const ok = await startClass(classId);
    setPending(false);
    setMessage(ok ? c.started : c.error);
    if (ok) startTransition(() => router.refresh());
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <Button type="button" variant={variant} size={size} disabled={pending} onClick={markStarted}>
        {pending ? c.starting : label}
      </Button>
      {message ? <span className={`text-xs ${message === c.started ? "text-emerald-700" : "text-rose-700"}`}>{message}</span> : null}
    </span>
  );
}

async function startClass(classId: string) {
  const response = await fetch(`/api/teacher/classes/${classId}/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  return response.ok;
}
