import { describe, expect, test } from "bun:test";
import {
  parseSearchRequestV1FromUrl,
  serializeSearchRequestV1ToUrl,
} from "./product-finding-search-url";

describe("Product Finding Phase 2 search URL codec", () => {
  test("round-trips full multi and numeric-range search state", () => {
    const request = parseSearchRequestV1FromUrl({
      q: "corolla",
      category: "vehicle",
      productType: "automobile",
      province: "Tekirdağ",
      district: "Çorlu",
      priceMin: "500000",
      priceMax: "1500000",
      contextual: JSON.stringify({
        make: ["Toyota"],
        year: { min: 2020, max: 2024 },
        km: { min: null, max: 50000 },
        transmission: ["automatic"],
      }),
      sort: "price_asc",
    });

    expect(request.contextual.year).toEqual({ min: 2020, max: 2024 });
    expect(request.contextual.km).toEqual({ min: null, max: 50000 });
    expect(request.contextual.make).toEqual(["Toyota"]);
    expect(serializeSearchRequestV1ToUrl(request)).toEqual({
      q: "corolla",
      category: "vehicle",
      productType: "automobile",
      province: "Tekirdağ",
      district: "Çorlu",
      priceMin: "500000",
      priceMax: "1500000",
      contextual:
        '{"km":{"min":null,"max":50000},"make":["Toyota"],"transmission":["automatic"],"year":{"min":2020,"max":2024}}',
      sort: "price_asc",
    });
  });

  test("uses canonical query-aware sort defaults", () => {
    expect(parseSearchRequestV1FromUrl({ q: "telefon" }).sort).toBe("relevance");
    expect(parseSearchRequestV1FromUrl({ q: "" }).sort).toBe("newest");
  });

  test("fails closed for invalid hard-filter URL state", () => {
    expect(() =>
      parseSearchRequestV1FromUrl({
        category: "vehicle",
        productType: "automobile",
        contextual: JSON.stringify({ year: { min: 2025, max: 2020 } }),
      }),
    ).toThrow();
    expect(() => parseSearchRequestV1FromUrl({ district: "Çorlu" })).toThrow();
    expect(() =>
      parseSearchRequestV1FromUrl({ productType: "automobile", contextual: "not-json" }),
    ).toThrow();
  });
});
