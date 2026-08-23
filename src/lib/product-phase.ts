export type ProductPhase = "v0" | "pilot-rc";

export function resolveProductPhase(value: string | undefined): ProductPhase {
  return value === "pilot-rc" ? "pilot-rc" : "v0";
}

export const productPhase = resolveProductPhase(import.meta.env.VITE_ARAR_PRODUCT_PHASE);
export const isPilotReleaseCandidate = productPhase === "pilot-rc";

export const productPhaseLabel = isPilotReleaseCandidate
  ? "Pilot release candidate"
  : "V0 — UX ve değer önerisi doğrulaması";
