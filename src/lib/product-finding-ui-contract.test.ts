import { describe, expect, test } from "bun:test";
import { PRODUCT_TYPES, PRODUCT_TYPE_REGISTRY } from "./product-finding-contract";
import {
  getBuyerFacetFields,
  getListingContextFacts,
  getProductTypeUiOptions,
  getSellerProductFields,
} from "./product-finding-ui-contract";

describe("product finding Phase 2 UI contract", () => {
  test("surfaces exactly the frozen compatible product types for each category", () => {
    expect(getProductTypeUiOptions("vehicle").map((item) => item.value)).toEqual([
      "automobile",
      "automobile-part",
      "automobile-accessory",
    ]);
    expect(getProductTypeUiOptions("electronics").map((item) => item.value)).toEqual([
      "phone",
      "phone-accessory",
    ]);
    expect(getProductTypeUiOptions("other")).toEqual([]);
  });

  test("seller UI exposes every validated attribute field and no schema-internal field", () => {
    for (const productType of PRODUCT_TYPES) {
      const schemaKeys = Object.keys(PRODUCT_TYPE_REGISTRY[productType].attributeFields).sort();
      const uiKeys = getSellerProductFields(productType)
        .map((field) => field.key)
        .sort();
      expect(uiKeys).toEqual(schemaKeys);
    }
  });

  test("buyer contextual facet groups remain shallow", () => {
    for (const productType of PRODUCT_TYPES) {
      const facets = getBuyerFacetFields(productType);
      expect(facets.length).toBeLessThanOrEqual(5);
      expect(facets.every((field) => field.buyerFacet)).toBe(true);
    }
    expect(getBuyerFacetFields("automobile").map((field) => field.key)).toEqual([
      "make",
      "year",
      "transmission",
      "fuel",
      "body_type",
    ]);
    expect(getBuyerFacetFields("phone").map((field) => field.key)).toEqual(["brand", "storage_gb"]);
  });

  test("listing-card contextual facts are compact, translated and capped", () => {
    expect(
      getListingContextFacts("automobile", {
        year: 2022,
        km: 31_000,
        transmission: "automatic",
        fuel: "hybrid",
      }),
    ).toEqual(["2022", "31000 km", "Otomatik"]);
    expect(getListingContextFacts("phone", { storage_gb: 256, brand: "Apple" })).toEqual([
      "256 GB",
    ]);
    expect(getListingContextFacts(null, {})).toEqual([]);
  });
});
