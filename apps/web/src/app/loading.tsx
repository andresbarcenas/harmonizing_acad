export default function GlobalLoading() {
  return (
    <div className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8 md:px-8">
      <div className="space-y-4">
        <div className="skeleton-warm h-20 rounded-[1.8rem] border border-[var(--color-border)]" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="skeleton-warm h-52 rounded-[1.5rem] border border-[var(--color-border)]" />
          <div className="skeleton-warm h-52 rounded-[1.5rem] border border-[var(--color-border)]" />
        </div>
      </div>
    </div>
  );
}
