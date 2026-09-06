import { describe, expect, test } from "bun:test";
import {
  PRODUCT_ATTRIBUTES_VERSION,
  PRODUCT_TYPE_REGISTRY,
  generateSystemSearchKeywords,
  listingMatchesStructuredFilters,
  parseSearchRequestV1,
  transitionProductSelection,
  transitionSearchRequestScope,
  validateProductSelection,
} from "./product-finding-contract";

describe("product finding contract", () => {
  test("accepts the frozen shallow category/product-type registry and legacy null type", () => {
    expect(
      validateProductSelection({ category: "vehicle", productType: "automobile" }).productType,
    ).toBe("automobile");
    expect(
      validateProductSelection({ category: "vehicle", productType: "automobile-part" }).productType,
    ).toBe("automobile-part");
    expect(
      validateProductSelection({ category: "vehicle", productType: "automobile-accessory" })
        .productType,
    ).toBe("automobile-accessory");
    expect(
      validateProductSelection({ category: "real-estate", productType: "housing" }).productType,
    ).toBe("housing");
    expect(
      validateProductSelection({ category: "electronics", productType: "phone" }).productType,
    ).toBe("phone");
    expect(
      validateProductSelection({ category: "home", productType: "wardrobe" }).productType,
    ).toBe("wardrobe");
    expect(
      validateProductSelection({ category: "fashion", productType: "shoes" }).productType,
    ).toBe("shoes");
    expect(
      validateProductSelection({ category: "hobby-sports", productType: "bicycle" }).productType,
    ).toBe("bicycle");
    expect(validateProductSelection({ category: "other", productType: null })).toEqual({
      productType: null,
      productAttributesVersion: null,
      productAttributes: {},
    });
  });

  test("classifies the minimum product roles as main, accessory, or part", () => {
    expect(PRODUCT_TYPE_REGISTRY.automobile.role).toBe("main");
    expect(PRODUCT_TYPE_REGISTRY["automobile-accessory"].role).toBe("accessory");
    expect(PRODUCT_TYPE_REGISTRY["automobile-part"].role).toBe("part");
    expect(PRODUCT_TYPE_REGISTRY["phone-accessory"].role).toBe("accessory");
    expect(PRODUCT_TYPE_REGISTRY["bicycle-part"].role).toBe("part");
  });

  test("rejects incompatible category/product type combinations", () => {
    expect(() => validateProductSelection({ category: "fashion", productType: "phone" })).toThrow();
    expect(() =>
      validateProductSelection({ category: "vehicle", productType: "phone-accessory" }),
    ).toThrow();
  });

  test("strictly validates versioned structured attributes and rejects arbitrary seller JSON", () => {
    expect(
      validateProductSelection({
        category: "vehicle",
        productType: "automobile",
        productAttributesVersion: PRODUCT_ATTRIBUTES_VERSION,
        productAttributes: {
          make: "Toyota",
          model: "Corolla",
          year: 2022,
          km: 31_000,
          transmission: "automatic",
          fuel: "hybrid",
          body_type: "sedan",
        },
      }).productAttributes,
    ).toEqual({
      make: "Toyota",
      model: "Corolla",
      year: 2022,
      km: 31_000,
      transmission: "automatic",
      fuel: "hybrid",
      body_type: "sedan",
    });

    expect(() =>
      validateProductSelection({
        category: "electronics",
        productType: "phone",
        productAttributes: { storage_gb: 123 },
      }),
    ).toThrow();
    expect(() =>
      validateProductSelection({
        category: "fashion",
        productType: "shoes",
        productAttributes: { size_eu: 42, arbitrary: "seller-json" },
      }),
    ).toThrow();
  });

  test("clears incompatible contextual attributes on product/category transition", () => {
    expect(
      transitionProductSelection({
        previousCategory: "electronics",
        previousProductType: "phone",
        previousAttributes: { brand: "Apple", model: "iPhone 15", storage_gb: 256 },
        nextCategory: "electronics",
        nextProductType: "phone-accessory",
      }),
    ).toEqual({
      productType: "phone-accessory",
      productAttributesVersion: PRODUCT_ATTRIBUTES_VERSION,
      productAttributes: {},
      complianceMustBeReevaluated: false,
    });

    const retained = transitionProductSelection({
      previousCategory: "electronics",
      previousProductType: "phone",
      previousAttributes: { brand: "Apple", model: "iPhone 15", storage_gb: 256 },
      nextCategory: "electronics",
      nextProductType: "phone",
    });
    expect(retained.productAttributes).toEqual({
      brand: "Apple",
      model: "iPhone 15",
      storage_gb: 256,
    });
  });

  test("marks regulated category transitions for compliance re-evaluation", () => {
    expect(
      transitionProductSelection({
        previousCategory: "electronics",
        previousProductType: "phone",
        previousAttributes: {},
        nextCategory: "vehicle",
        nextProductType: "automobile",
      }).complianceMustBeReevaluated,
    ).toBe(true);
    expect(
      transitionProductSelection({
        previousCategory: "vehicle",
        previousProductType: "automobile",
        previousAttributes: {},
        nextCategory: "home",
        nextProductType: "wardrobe",
      }).complianceMustBeReevaluated,
    ).toBe(true);
    expect(
      transitionProductSelection({
        previousCategory: "electronics",
        previousProductType: "phone",
        previousAttributes: {},
        nextCategory: "home",
        nextProductType: "wardrobe",
      }).complianceMustBeReevaluated,
    ).toBe(false);
  });

  test("system owns search keywords and derives them only from validated structure plus aliases", () => {
    expect(
      generateSystemSearchKeywords({
        category: "electronics",
        productType: "phone",
        productAttributes: { brand: "Apple", model: "iPhone 15", storage_gb: 256 },
      }),
    ).toEqual([
      "elektronik",
      "telefon",
      "cep telefonu",
      "akıllı telefon",
      "Apple",
      "iPhone 15",
      "256",
    ]);
  });

  test("SearchRequestV1 applies OR within a facet and AND between facets", () => {
    const request = parseSearchRequestV1({
      version: 1,
      q: "",
      category: "vehicle",
      productType: "automobile",
      location: { province: "Tekirdağ", district: null },
      price: { min: 500_000, max: 2_000_000 },
      contextual: {
        fuel: ["gasoline", "hybrid"],
        transmission: ["automatic"],
      },
      sort: "newest",
    });

    const base = {
      category: "vehicle" as const,
      productType: "automobile" as const,
      price: 1_250_000,
      province: "Tekirdağ",
      district: "Çorlu",
    };
    expect(
      listingMatchesStructuredFilters(
        { ...base, productAttributes: { fuel: "hybrid", transmission: "automatic" } },
        request,
      ),
    ).toBe(true);
    expect(
      listingMatchesStructuredFilters(
        { ...base, productAttributes: { fuel: "gasoline", transmission: "manual" } },
        request,
      ),
    ).toBe(false);
    expect(
      listingMatchesStructuredFilters(
        { ...base, productAttributes: { fuel: "diesel", transmission: "automatic" } },
        request,
      ),
    ).toBe(false);
  });

  test("canonical Corolla main-product scope excludes parts and accessories", () => {
    const request = parseSearchRequestV1({
      version: 1,
      q: "corolla",
      category: "vehicle",
      productType: "automobile",
    });
    const common = {
      category: "vehicle" as const,
      price: 1_000,
      province: "Tekirdağ",
      district: "Çorlu",
      productAttributes: {},
    };

    expect(
      listingMatchesStructuredFilters(
        {
          ...common,
          productType: "automobile",
          productAttributes: { make: "Toyota", model: "Corolla" },
        },
        request,
      ),
    ).toBe(true);
    expect(
      listingMatchesStructuredFilters(
        { ...common, productType: "automobile-part" },
        request,
      ),
    ).toBe(false);
    expect(
      listingMatchesStructuredFilters(
        { ...common, productType: "automobile-accessory" },
        request,
      ),
    ).toBe(false);
  });

  test("missing structured values never satisfy an active filter", () => {
    const request = parseSearchRequestV1({
      version: 1,
      category: "electronics",
      productType: "phone",
      contextual: { storage_gb: [128, 256] },
    });
    expect(
      listingMatchesStructuredFilters(
        {
          category: "electronics",
          productType: "phone",
          productAttributes: { brand: "Samsung" },
          price: 20_000,
          province: "Tekirdağ",
          district: "Çorlu",
        },
        request,
      ),
    ).toBe(false);
  });

  test("scope transitions clear incompatible contextual filters but preserve universal location and price", () => {
    const current = parseSearchRequestV1({
      version: 1,
      q: "telefon",
      category: "electronics",
      productType: "phone",
      location: { province: "Tekirdağ", district: "Çorlu" },
      price: { min: 1000, max: 50_000 },
      contextual: { storage_gb: [128, 256] },
      sort: "price_asc",
    });
    const next = transitionSearchRequestScope(current, {
      category: "home",
      productType: "wardrobe",
    });
    expect(next.contextual).toEqual({});
    expect(next.location).toEqual({ province: "Tekirdağ", district: "Çorlu" });
    expect(next.price).toEqual({ min: 1000, max: 50_000 });
  });

  test("invalid explicit hard filters fail instead of being silently relaxed", () => {
    expect(() =>
      parseSearchRequestV1({
        version: 1,
        category: "electronics",
        productType: "phone",
        contextual: { unknown_facet: ["anything"] },
      }),
    ).toThrow();
    expect(() =>
      parseSearchRequestV1({
        version: 1,
        category: "electronics",
        productType: "phone",
        price: { min: 50_000, max: 10_000 },
      }),
    ).toThrow();
  });
});
