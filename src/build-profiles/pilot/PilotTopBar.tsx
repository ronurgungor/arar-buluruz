import { Link } from "@tanstack/react-router";
import { Wordmark } from "@/components/Wordmark";

type PilotTopBarProps = {
  hidePostAction?: boolean;
};

export function PilotTopBar({ hidePostAction = false }: PilotTopBarProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/95 backdrop-blur">
      <div className="mx-auto grid max-w-3xl grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-4 py-2.5 sm:gap-4">
        <Link
          to="/"
          className="inline-flex min-h-11 min-w-0 items-center truncate"
          aria-label="Arar Buluruz ana sayfa"
        >
          <Wordmark />
        </Link>
        <nav
          aria-label="Ana gezinme"
          className="flex shrink-0 items-center gap-1 text-sm sm:gap-2"
        >
          <a
            href="/ara"
            className="inline-flex min-h-11 items-center rounded-full px-3 py-2 font-semibold text-foreground transition-colors hover:bg-accent"
          >
            Ara
          </a>
          <a
            href="/ilanlarim"
            className="inline-flex min-h-11 items-center rounded-full px-3 py-2 font-semibold text-foreground transition-colors hover:bg-accent"
          >
            İlanlarım
          </a>
          {!hidePostAction && (
            <Link
              to="/ilan-ver"
              className="inline-flex min-h-11 items-center rounded-full bg-primary px-4 py-2 font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              İlan Ver
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
