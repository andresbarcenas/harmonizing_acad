"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

type AvatarProps = {
  src?: string | null;
  alt: string;
  fallback: string;
  className?: string;
  zoomable?: boolean;
};

export function Avatar({ src, alt, fallback, className, zoomable = true }: AvatarProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (src) {
    return (
      <>
        {zoomable ? (
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setOpen(true)}
            aria-label={`Ampliar foto de ${alt}`}
            className={cn(
              "relative h-12 w-12 cursor-zoom-in overflow-hidden rounded-full border border-white/80 shadow-[0_10px_26px_rgba(78,55,30,0.12)] ring-1 ring-[var(--color-border)] outline-none transition hover:brightness-[1.02] focus-visible:ring-2 focus-visible:ring-[var(--color-gold)] focus-visible:ring-offset-2",
              className,
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={alt} className="h-full w-full object-cover" />
          </button>
        ) : (
          <div
            className={cn(
              "relative h-12 w-12 overflow-hidden rounded-full border border-white/80 shadow-[0_10px_26px_rgba(78,55,30,0.12)] ring-1 ring-[var(--color-border)]",
              className,
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={alt} className="h-full w-full object-cover" />
          </div>
        )}

        {open && typeof document !== "undefined"
          ? createPortal(
              <div
                role="dialog"
                aria-modal="true"
                aria-label={`Vista ampliada: ${alt}`}
                className="fixed inset-0 z-[120] flex items-center justify-center bg-black/82 p-4 sm:p-6"
                onClick={() => {
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
              >
                <button
                  type="button"
                  aria-label="Cerrar vista ampliada"
                  onClick={() => {
                    setOpen(false);
                    triggerRef.current?.focus();
                  }}
                  className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/35 bg-black/45 text-white transition hover:bg-black/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/90 sm:right-6 sm:top-6"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="max-h-[92vh] max-w-[92vw]" onClick={(event) => event.stopPropagation()}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={alt}
                    className="max-h-[92vh] max-w-[92vw] rounded-[1.6rem] border border-white/30 bg-black/15 object-contain shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
                  />
                </div>
              </div>,
              document.body,
            )
          : null}
      </>
    );
  }

  return (
    <div
      className={cn(
        "flex h-12 w-12 items-center justify-center rounded-full border border-white/80 bg-[linear-gradient(145deg,#fff8f1,#f3e8d8)] text-sm font-semibold text-[var(--color-gold-deep)] shadow-[0_10px_26px_rgba(78,55,30,0.12)] ring-1 ring-[var(--color-border)]",
        className,
      )}
    >
      {fallback}
    </div>
  );
}
