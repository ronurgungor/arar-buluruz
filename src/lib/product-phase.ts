export type ProductPhase = "v0" | "pilot-rc";

export function resolveProductPhase(value: string | undefined): ProductPhase {
  return value === "pilot-rc" ? "pilot-rc" : "v0";
}

// Keep the build-time phase check as a direct import.meta.env expression. Vite replaces this value
// before Rollup tree-shaking, allowing profile-inapplicable UI/copy (notably V0 demo/test content)
// to be removed from the pilot-rc client artifact instead of merely hidden at runtime.
export const isPilotReleaseCandidate =
  import.meta.env.VITE_ARAR_PRODUCT_PHASE === "pilot-rc";
export const productPhase: ProductPhase = isPilotReleaseCandidate ? "pilot-rc" : "v0";

export const productPhaseLabel = isPilotReleaseCandidate
  ? "Pilot release candidate"
  : "V0 — UX ve değer önerisi doğrulaması";
