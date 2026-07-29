export function Wordmark({ size = "sm" }: { size?: "sm" | "lg" }) {
  const isLarge = size === "lg";

  return (
    <span
      className={`inline-flex items-baseline gap-1.5 font-extrabold tracking-tight text-foreground ${
        isLarge ? "text-5xl sm:text-6xl" : "text-lg"
      }`}
    >
      <span>Arar</span>
      <span
        aria-hidden
        className={`relative inline-block shrink-0 rounded-full border-primary ${
          isLarge ? "h-4 w-4 border-[3px]" : "h-2 w-2 border-2"
        }`}
      >
        <span
          className={`absolute rounded-full bg-primary ${
            isLarge
              ? "-bottom-1 -right-1 h-2 w-[3px] rotate-45"
              : "-bottom-0.5 -right-0.5 h-1 w-0.5 rotate-45"
          }`}
        />
      </span>
      <span className="text-primary">Buluruz</span>
    </span>
  );
}
