export default function GlobalLoading() {
  return (
    <div className="mx-auto min-h-screen w-full max-w-5xl px-4 py-10 md:px-8">
      <div className="animate-pulse space-y-4">
        <div className="h-24 rounded-[1.8rem] border border-[var(--color-border)] bg-white/70" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-56 rounded-[1.5rem] border border-[var(--color-border)] bg-white/70" />
          <div className="h-56 rounded-[1.5rem] border border-[var(--color-border)] bg-white/70" />
        </div>
      </div>
    </div>
  );
}

