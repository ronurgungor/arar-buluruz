declare module "@tanstack/react-router" {
  interface HistoryState {
    fromListingResults?: true;
  }
}

export const LISTING_RESULTS_HISTORY_STATE = {
  fromListingResults: true,
} as const;

const LISTING_RESULTS_SCROLL_PREFIX = "arar-buluruz:listing-results-scroll:";

export function hasListingResultsHistory(state: unknown): boolean {
  if (typeof state !== "object" || state === null) return false;

  return (state as { fromListingResults?: unknown }).fromListingResults === true;
}

export function rememberListingResultsScroll(url: string, scrollY: number): void {
  if (typeof window === "undefined" || !Number.isFinite(scrollY) || scrollY < 0) return;
  try {
    window.sessionStorage.setItem(`${LISTING_RESULTS_SCROLL_PREFIX}${url}`, String(scrollY));
  } catch {
    // Session storage is only a navigation convenience; browser history remains the safe fallback.
  }
}

export function restoreListingResultsScroll(url: string): void {
  if (typeof window === "undefined") return;
  let raw: string | null = null;
  try {
    raw = window.sessionStorage.getItem(`${LISTING_RESULTS_SCROLL_PREFIX}${url}`);
  } catch {
    return;
  }
  if (raw === null) return;
  const scrollY = Number(raw);
  if (!Number.isFinite(scrollY) || scrollY < 0) return;
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => window.scrollTo({ top: scrollY, left: 0, behavior: "auto" }));
  });
}
