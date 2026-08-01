declare module "@tanstack/react-router" {
  interface HistoryState {
    fromListingResults?: true;
  }
}

export const LISTING_RESULTS_HISTORY_STATE = {
  fromListingResults: true,
} as const;

export function hasListingResultsHistory(state: unknown): boolean {
  if (typeof state !== "object" || state === null) return false;

  return (state as { fromListingResults?: unknown }).fromListingResults === true;
}
