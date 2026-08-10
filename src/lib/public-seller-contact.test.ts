import { describe, expect, test } from "bun:test";
import {
  buildPublicSellerContactHref,
  getPublicSellerContactLabel,
  publicSellerContactSchema,
} from "./public-seller-contact";

const syntheticWhatsAppContact = {
  channel: "whatsapp" as const,
  e164: "+12025550123",
};

const syntheticPhoneContact = {
  channel: "phone" as const,
  e164: "+12025550124",
};

describe("public seller contact contract", () => {
  test("derives the WhatsApp target from the single E.164 value", () => {
    expect(buildPublicSellerContactHref(syntheticWhatsAppContact)).toBe(
      "https://wa.me/12025550123",
    );
    expect(getPublicSellerContactLabel(syntheticWhatsAppContact)).toBe("WhatsApp’tan yaz");
  });

  test("derives the phone target from the same E.164 representation", () => {
    expect(buildPublicSellerContactHref(syntheticPhoneContact)).toBe("tel:+12025550124");
    expect(getPublicSellerContactLabel(syntheticPhoneContact)).toBe("Satıcıyı ara");
  });

  test("rejects unapproved channels and malformed numbers", () => {
    expect(
      publicSellerContactSchema.safeParse({ channel: "email", e164: "+12025550123" }).success,
    ).toBe(false);
    expect(
      publicSellerContactSchema.safeParse({ channel: "whatsapp", e164: "2025550123" }).success,
    ).toBe(false);
  });
});
