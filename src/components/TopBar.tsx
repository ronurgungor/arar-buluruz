import { Link } from "@tanstack/react-router";
import { Wordmark } from "@/components/Wordmark";
import { isPilotReleaseCandidate } from "@/lib/product-phase";

export function TopBar() {
  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/95 backdrop-blur">
      <div className="mx-auto grid max-w-3xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
        <Link
          to="/"
          className="inline-flex min-h-11 min-w-0 items-center truncate"
          aria-label="Arar Buluruz ana sayfa"
        >
          <Wordmark />
        </Link>
        <nav className="flex shrink-0 items-center gap-2">
          <Link
            to="/ilan-ver"
            className="inline-flex min-h-11 items-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {isPilotReleaseCandidate ? "İlan Başvurusu" : "İlan Ver"}
          </Link>
          {!isPilotReleaseCandidate && (
            <Link
              to="/giris"
              className="inline-flex min-h-11 items-center rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
            >
              Giriş
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
