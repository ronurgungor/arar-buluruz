export const STAGE1_RECOVERY_PREFIX = "ABR1";
export const STAGE1_SESSION_TOKEN_BYTES = 32;
export const STAGE1_RECOVERY_SELECTOR_BYTES = 12;
export const STAGE1_RECOVERY_SECRET_BYTES = 24;

const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

function randomBase64Url(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function createOpaqueSellerSessionToken(): string {
  return randomBase64Url(STAGE1_SESSION_TOKEN_BYTES);
}

export type SellerRecoveryCredential = {
  code: string;
  selector: string;
  digest: string;
};

export async function createSellerRecoveryCredential(): Promise<SellerRecoveryCredential> {
  const selector = randomBase64Url(STAGE1_RECOVERY_SELECTOR_BYTES);
  const secret = randomBase64Url(STAGE1_RECOVERY_SECRET_BYTES);
  const code = `${STAGE1_RECOVERY_PREFIX}.${selector}.${secret}`;
  return { code, selector, digest: await sha256Hex(code) };
}

export async function parseSellerRecoveryCode(
  raw: string,
): Promise<{ selector: string; digest: string } | null> {
  const code = raw.trim();
  const parts = code.split(".");
  if (parts.length !== 3 || parts[0] !== STAGE1_RECOVERY_PREFIX) return null;
  const selector = parts[1] ?? "";
  const secret = parts[2] ?? "";
  if (
    selector.length !== 16 ||
    secret.length !== 32 ||
    !BASE64URL_PATTERN.test(selector) ||
    !BASE64URL_PATTERN.test(secret)
  ) {
    return null;
  }
  return { selector, digest: await sha256Hex(code) };
}
