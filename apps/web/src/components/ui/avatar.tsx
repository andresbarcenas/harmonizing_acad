import Image from "next/image";
import { cn } from "@/lib/utils";

export function Avatar({ src, alt, fallback, className }: { src?: string | null; alt: string; fallback: string; className?: string }) {
  if (src) {
    return (
      <div className={cn("relative h-11 w-11 overflow-hidden rounded-full border border-[var(--color-border)]", className)}>
        <Image fill src={src} alt={alt} className="object-cover" sizes="44px" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-muted)] text-sm font-semibold text-[var(--color-ink)]",
        className,
      )}
    >
      {fallback}
    </div>
  );
}
