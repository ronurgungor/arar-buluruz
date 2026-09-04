import { describe, expect, test } from "bun:test";
import {
  STAGE1_RECOVERY_PREFIX,
  createOpaqueSellerSessionToken,
  createSellerRecoveryCode,
  createSellerRecoveryCredential,
  parseSellerRecoveryCode,
  sha256Hex,
} from "./stage1-seller-credentials";

describe("Stage 1 seller credentials", () => {
  test("creates high-entropy opaque session tokens with stable digests", async () => {
    const first = createOpaqueSellerSessionToken();
    const second = createOpaqueSellerSessionToken();
    expect(first).not.toBe(second);
    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(await sha256Hex(first)).toMatch(/^[0-9a-f]{64}$/);
  });

  test("creates browser-safe high-entropy recovery candidates and parses only the canonical form", async () => {
    const browserCandidate = createSellerRecoveryCode();
    expect(browserCandidate).toMatch(/^ABR1\.[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{32}$/);

    const credential = await createSellerRecoveryCredential();
    expect(credential.code.startsWith(`${STAGE1_RECOVERY_PREFIX}.`)).toBe(true);
    expect(credential.selector).toMatch(/^[A-Za-z0-9_-]{16}$/);
    expect(credential.digest).toMatch(/^[0-9a-f]{64}$/);
    expect(await parseSellerRecoveryCode(credential.code)).toEqual({
      selector: credential.selector,
      digest: credential.digest,
    });
    expect(await parseSellerRecoveryCode("ABR1.short.invalid")).toBeNull();
    expect(await parseSellerRecoveryCode(credential.code + "x")).toBeNull();
  });
});
