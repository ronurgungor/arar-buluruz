import { describe, expect, test } from "bun:test";
import { listingMatchesStructuredFilters, parseSearchRequestV1 } from "./product-finding-contract";

const automobile = (attributes: Record<string, string | number | boolean>) => ({
  category: "vehicle" as const,
  productType: "automobile" as const,
  productAttributes: attributes,
  price: 1_250_000,
  province: "Tekirdağ",
  district: "Çorlu",
});

describe("Product Finding Phase 2 contextual range filters", () => {
  test("supports min-only numeric ranges as hard filters", () => {
    const request = parseSearchRequestV1({
      version: 1,
      category: "vehicle",
      productType: "automobile",
      contextual: { year: { min: 2020 } },
    });

    expect(listingMatchesStructuredFilters(automobile({ year: 2022 }), request)).toBe(true);
    expect(listingMatchesStructuredFilters(automobile({ year: 2019 }), request)).toBe(false);
  });

  test("supports max-only numeric ranges as hard filters", () => {
    const request = parseSearchRequestV1({
      version: 1,
      category: "vehicle",
      productType: "automobile",
      contextual: { km: { max: 50_000 } },
    });

    expect(listingMatchesStructuredFilters(automobile({ km: 31_000 }), request)).toBe(true);
    expect(listingMatchesStructuredFilters(automobile({ km: 75_000 }), request)).toBe(false);
  });

  test("supports bounded numeric ranges deterministically", () => {
    const request = parseSearchRequestV1({
      version: 1,
      category: "vehicle",
      productType: "automobile",
      contextual: {
        year: { min: 2020, max: 2024 },
        km: { min: 10_000, max: 50_000 },
      },
    });

    expect(listingMatchesStructuredFilters(automobile({ year: 2022, km: 31_000 }), request)).toBe(
      true,
    );
    expect(listingMatchesStructuredFilters(automobile({ year: 2025, km: 31_000 }), request)).toBe(
      false,
    );
    expect(listingMatchesStructuredFilters(automobile({ year: 2022, km: 80_000 }), request)).toBe(
      false,
    );
  });

  test("missing listing values fail active ranges", () => {
    const request = parseSearchRequestV1({
      version: 1,
      category: "real-estate",
      productType: "housing",
      contextual: { area_m2: { min: 90, max: 140 } },
    });

    expect(
      listingMatchesStructuredFilters(
        {
          category: "real-estate",
          productType: "housing",
          productAttributes: {},
          price: 4_000_000,
          province: "Tekirdağ",
          district: "Çorlu",
        },
        request,
      ),
    ).toBe(false);
  });

  test("multi facets remain exact OR filters, including discrete numeric values", () => {
    const request = parseSearchRequestV1({
      version: 1,
      category: "fashion",
      productType: "shoes",
      contextual: { size_eu: [41, 42] },
    });

    const shoe = (size: number) => ({
      category: "fashion" as const,
      productType: "shoes" as const,
      productAttributes: { size_eu: size },
      price: 2_000,
      province: "Tekirdağ",
      district: "Çorlu",
    });

    expect(listingMatchesStructuredFilters(shoe(42), request)).toBe(true);
    expect(listingMatchesStructuredFilters(shoe(43), request)).toBe(false);
  });

  test("rejects empty, inverted, out-of-domain, or wrong-mode explicit range filters", () => {
    expect(() =>
      parseSearchRequestV1({
        version: 1,
        category: "vehicle",
        productType: "automobile",
        contextual: { km: { min: null, max: null } },
      }),
    ).toThrow();
    expect(() =>
      parseSearchRequestV1({
        version: 1,
        category: "vehicle",
        productType: "automobile",
        contextual: { year: { min: 2025, max: 2020 } },
      }),
    ).toThrow();
    expect(() =>
      parseSearchRequestV1({
        version: 1,
        category: "vehicle",
        productType: "automobile",
        contextual: { year: { min: 1500 } },
      }),
    ).toThrow();
    expect(() =>
      parseSearchRequestV1({
        version: 1,
        category: "vehicle",
        productType: "automobile",
        contextual: { km: [10_000, 50_000] },
      }),
    ).toThrow();
    expect(() =>
      parseSearchRequestV1({
        version: 1,
        category: "fashion",
        productType: "shoes",
        contextual: { size_eu: { min: 40, max: 43 } },
      }),
    ).toThrow();
  });
});
