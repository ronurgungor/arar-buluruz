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
      priceMin: 500000,
      priceMax: 1500000,
      contextual: {
        km: { min: null, max: 50000 },
        make: ["Toyota"],
        transmission: ["automatic"],
        year: { min: 2020, max: 2024 },
      },
      sort: "price_asc",
    });
  });

  test("preserves router-decoded zero price and contextual hard filters", () => {
    const request = parseSearchRequestV1FromUrl({
      q: "b150",
      category: "vehicle",
      productType: "automobile",
      province: "Tekirdağ",
      district: "Çorlu",
      priceMin: 0,
      priceMax: 5000,
      contextual: {
        year: { min: 2010, max: 2020 },
        km: { min: null, max: 120000 },
        transmission: ["automatic"],
      },
      sort: "price_asc",
    });

    expect(request.price).toEqual({ min: 0, max: 5000 });
    expect(request.contextual.year).toEqual({ min: 2010, max: 2020 });
    expect(request.contextual.km).toEqual({ min: null, max: 120000 });
    expect(request.contextual.transmission).toEqual(["automatic"]);
    expect(serializeSearchRequestV1ToUrl(request)).toEqual({
      q: "b150",
      category: "vehicle",
      productType: "automobile",
      province: "Tekirdağ",
      district: "Çorlu",
      priceMin: 0,
      priceMax: 5000,
      contextual: {
        km: { min: null, max: 120000 },
        transmission: ["automatic"],
        year: { min: 2010, max: 2020 },
      },
      sort: "price_asc",
    });
  });

  test("accepts legacy stringified router values without double-encoding new URLs", () => {
    const request = parseSearchRequestV1FromUrl({
      category: "vehicle",
      productType: "automobile",
      priceMin: '"0"',
      contextual: JSON.stringify(
        JSON.stringify({ year: { min: 2010, max: 2020 }, transmission: ["automatic"] }),
      ),
    });

    expect(request.price.min).toBe(0);
    expect(request.contextual.year).toEqual({ min: 2010, max: 2020 });
    expect(request.contextual.transmission).toEqual(["automatic"]);
    expect(serializeSearchRequestV1ToUrl(request).priceMin).toBe(0);
    expect(serializeSearchRequestV1ToUrl(request).contextual).toEqual({
      transmission: ["automatic"],
      year: { min: 2010, max: 2020 },
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
    expect(() => parseSearchRequestV1FromUrl({ priceMin: {} })).toThrow();
    expect(() => parseSearchRequestV1FromUrl({ contextual: [] })).toThrow();
  });
});
