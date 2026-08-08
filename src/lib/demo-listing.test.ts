import { describe, expect, test } from "bun:test";
import { MAX_DEMO_PHOTO_BYTES, parseDemoPrice, validateDemoPhoto } from "./demo-listing";

describe("demo listing price guard", () => {
  test("accepts finite decimal prices including Turkish comma input", () => {
    expect(parseDemoPrice("1250")).toBe(1250);
    expect(parseDemoPrice("1250.50")).toBe(1250.5);
    expect(parseDemoPrice("1250,50")).toBe(1250.5);
    expect(parseDemoPrice("0")).toBe(0);
  });

  test("rejects malformed, negative and unbounded numeric input", () => {
    expect(parseDemoPrice("12abc")).toBeNull();
    expect(parseDemoPrice("1.2.3")).toBeNull();
    expect(parseDemoPrice("-1")).toBeNull();
    expect(parseDemoPrice("1e309")).toBeNull();
    expect(parseDemoPrice("1000000001")).toBeNull();
  });
});

describe("demo listing local photo guard", () => {
  test("accepts supported local image types within the size cap", () => {
    expect(validateDemoPhoto({ type: "image/jpeg", size: 1024 })).toBeNull();
    expect(validateDemoPhoto({ type: "image/png", size: MAX_DEMO_PHOTO_BYTES })).toBeNull();
    expect(validateDemoPhoto({ type: "image/webp", size: 1024 })).toBeNull();
  });

  test("rejects unsupported types and oversized files before preview creation", () => {
    expect(validateDemoPhoto({ type: "image/svg+xml", size: 1024 })).toContain("JPEG");
    expect(
      validateDemoPhoto({ type: "image/jpeg", size: MAX_DEMO_PHOTO_BYTES + 1 }),
    ).toContain("8 MB");
  });
});
