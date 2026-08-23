import { describe, expect, test } from "bun:test";
import { buildPilotIntakeWhatsAppHref, isPilotIntakeConfigured } from "./pilot-intake";

describe("pilot intake contact", () => {
  test("builds a WhatsApp target from an explicit E.164 intake number", () => {
    const href = buildPilotIntakeWhatsAppHref(
      "+12025550199",
      "Merhaba, sentetik ilan başvurusu.",
    );
    expect(href).toBe(
      "https://wa.me/12025550199?text=Merhaba%2C%20sentetik%20ilan%20ba%C5%9Fvurusu.",
    );
  });

  test("fails closed on missing or malformed intake contact", () => {
    expect(buildPilotIntakeWhatsAppHref("", "test")).toBeNull();
    expect(buildPilotIntakeWhatsAppHref("05551234567", "test")).toBeNull();
    expect(buildPilotIntakeWhatsAppHref("+0", "test")).toBeNull();
    expect(isPilotIntakeConfigured(undefined)).toBeFalse();
    expect(isPilotIntakeConfigured("+12025550199")).toBeTrue();
  });
});
