import { describe, expect, test } from "bun:test";
import {
  buildPublicSellerContactActions,
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

const syntheticCombinedContact = {
  channel: "phone_whatsapp" as const,
  e164: "+12025550125",
};

describe("public seller contact contract", () => {
  test("derives the WhatsApp target from the canonical E.164 value", () => {
    expect(buildPublicSellerContactHref(syntheticWhatsAppContact)).toBe(
      "https://wa.me/12025550123",
    );
    expect(getPublicSellerContactLabel(syntheticWhatsAppContact)).toBe("WhatsApp’tan yaz");
  });

  test("derives the phone target from the same E.164 representation", () => {
    expect(buildPublicSellerContactHref(syntheticPhoneContact)).toBe("tel:+12025550124");
    expect(getPublicSellerContactLabel(syntheticPhoneContact)).toBe("Ara");
  });

  test("creates both buyer actions without duplicating the seller phone", () => {
    expect(buildPublicSellerContactActions(syntheticCombinedContact)).toEqual([
      { kind: "phone", label: "Ara", href: "tel:+12025550125" },
      {
        kind: "whatsapp",
        label: "WhatsApp’tan yaz",
        href: "https://wa.me/12025550125",
      },
    ]);
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
