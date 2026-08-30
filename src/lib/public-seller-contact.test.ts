import { describe, expect, test } from "bun:test";
import {
  buildPublicSellerContactActions,
  buildPublicSellerContactHref,
  getPublicSellerContactLabel,
  publicSellerContactSchema,
} from "./public-seller-contact";

const syntheticLegacyWhatsAppContact = {
  channel: "whatsapp" as const,
  e164: "+12025550123",
};

const syntheticLegacyPhoneContact = {
  channel: "phone" as const,
  e164: "+12025550124",
};

const syntheticCombinedContact = {
  channel: "phone_whatsapp" as const,
  e164: "+12025550125",
};

describe("public seller contact contract", () => {
  test("derives both buyer actions from one intentionally public phone", () => {
    for (const contact of [
      syntheticLegacyWhatsAppContact,
      syntheticLegacyPhoneContact,
      syntheticCombinedContact,
    ]) {
      expect(buildPublicSellerContactActions(contact)).toEqual([
        { kind: "phone", label: "Ara", href: `tel:${contact.e164}` },
        {
          kind: "whatsapp",
          label: "WhatsApp’tan yaz",
          href: `https://wa.me/${contact.e164.slice(1)}`,
        },
      ]);
    }
  });

  test("keeps the primary legacy helper deterministic without treating channel as preference", () => {
    expect(buildPublicSellerContactHref(syntheticLegacyWhatsAppContact)).toBe("tel:+12025550123");
    expect(getPublicSellerContactLabel(syntheticLegacyWhatsAppContact)).toBe("Ara");
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
