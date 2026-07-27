export function AdSlot({ label = "Reklam alanı" }: { label?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/60 px-4 py-6 text-center">
      <span className="inline-block rounded-full bg-background px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Reklam
      </span>
      <p className="mt-2 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
