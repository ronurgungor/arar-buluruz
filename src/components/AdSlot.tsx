export function AdSlot({ label = "Reklam alanı" }: { label?: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/40 px-4 py-4">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        Reklam
      </span>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
