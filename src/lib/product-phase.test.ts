import { describe, expect, test } from "bun:test";
import { resolveProductPhase } from "./product-phase";

describe("product phase", () => {
  test("defaults unknown and missing values to V0", () => {
    expect(resolveProductPhase(undefined)).toBe("v0");
    expect(resolveProductPhase("unknown")).toBe("v0");
  });

  test("recognizes the explicit pilot release-candidate phase", () => {
    expect(resolveProductPhase("pilot-rc")).toBe("pilot-rc");
  });
});
