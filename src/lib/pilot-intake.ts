const E164_PATTERN = /^\+[1-9][0-9]{7,14}$/;

export function buildPilotIntakeWhatsAppHref(e164: string, message: string): string | null {
  const normalized = e164.trim();
  if (!E164_PATTERN.test(normalized)) return null;
  return `https://wa.me/${normalized.slice(1)}?text=${encodeURIComponent(message)}`;
}

export function isPilotIntakeConfigured(e164: string | undefined): boolean {
  return typeof e164 === "string" && E164_PATTERN.test(e164.trim());
}
