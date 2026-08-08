export const MAX_DEMO_PHOTO_BYTES = 8 * 1024 * 1024;

const DEMO_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function parseDemoPrice(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000_000) return null;
  return amount;
}

export function validateDemoPhoto(file: Pick<File, "size" | "type">): string | null {
  if (!DEMO_IMAGE_TYPES.has(file.type)) {
    return "JPEG, PNG veya WebP biçiminde bir fotoğraf seçin.";
  }
  if (file.size > MAX_DEMO_PHOTO_BYTES) {
    return "Fotoğraf en fazla 8 MB olabilir.";
  }
  return null;
}
