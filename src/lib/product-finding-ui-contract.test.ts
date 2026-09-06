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

  test("buyer facets expose explicit multi/range modes and keep the vehicle exception intact", () => {
    expect(
      getBuyerFacetFields("automobile").map((field) => [field.key, field.buyerFacetMode]),
    ).toEqual([
      ["make", "multi"],
      ["year", "range"],
      ["km", "range"],
      ["transmission", "multi"],
      ["fuel", "multi"],
      ["body_type", "multi"],
    ]);

    expect(
      getBuyerFacetFields("housing").map((field) => [field.key, field.buyerFacetMode]),
    ).toEqual([
      ["offer_type", "multi"],
      ["property_type", "multi"],
      ["room_count", "multi"],
      ["area_m2", "range"],
    ]);

    expect(
      getBuyerFacetFields("wardrobe").map((field) => [field.key, field.buyerFacetMode]),
    ).toEqual([
      ["width_cm", "range"],
      ["door_type", "multi"],
    ]);

    expect(getBuyerFacetFields("shoes").map((field) => [field.key, field.buyerFacetMode])).toEqual([
      ["size_eu", "multi"],
      ["target_group", "multi"],
      ["brand", "multi"],
    ]);

    for (const productType of PRODUCT_TYPES.filter((value) => value !== "automobile")) {
      expect(getBuyerFacetFields(productType).length).toBeLessThanOrEqual(5);
    }
    expect(getBuyerFacetFields("automobile")).toHaveLength(6);
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
