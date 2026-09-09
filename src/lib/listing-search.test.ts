import { describe, expect, test } from "bun:test";
import { parseSearchRequestV1, type ProductType } from "./product-finding-contract";
import {
  executeSearchRequestV1,
  getDefaultSearchSort,
  listingMatchesQuery,
  normalizeSearchText,
  resolveSearchIntent,
} from "./listing-search";
import type { ListingView } from "./public-listings";

const searchableListing = (title: string) => ({
  title,
  description: "Temiz kullanılmış ürün.",
  keywords: [] as string[],
});

function listing(input: {
  id: string;
  title: string;
  price: number;
  category: NonNullable<ListingView["category"]>;
  productType: ProductType;
  keywords?: string[];
  productAttributes?: ListingView["productAttributes"];
  createdAt?: string;
}): ListingView {
  return {
    id: input.id,
    title: input.title,
    price: input.price,
    category: input.category,
    productType: input.productType,
    productAttributesVersion: 1,
    productAttributes: input.productAttributes ?? {},
    condition: null,
    city: "Tekirdağ",
    district: "Çorlu",
    seller: "Test Seller",
    description: "Temiz kullanılmış ürün.",
    photos: [],
    createdAt: input.createdAt ?? "2026-09-01T10:00:00.000Z",
    distanceKm: null,
    keywords: input.keywords ?? [],
  };
}

describe("listing search compact model normalization", () => {
  test("normalizes letter-number and number-letter boundaries deterministically", () => {
    expect(normalizeSearchText("Mercedes B150")).toBe("mercedes b 150");
    expect(normalizeSearchText("iPhone15")).toBe("iphone 15");
    expect(normalizeSearchText("BMW 320d")).toBe("bmw 320 d");
    expect(normalizeSearchText("S23 Ultra")).toBe("s 23 ultra");
  });

  test("matches compact and spaced model variants both directions", () => {
    expect(listingMatchesQuery(searchableListing("Mercedes B 150"), "mercedes b150")).toBe(true);
    expect(listingMatchesQuery(searchableListing("Mercedes B150"), "mercedes b 150")).toBe(true);
    expect(listingMatchesQuery(searchableListing("iPhone 15 Pro"), "iphone15")).toBe(true);
    expect(listingMatchesQuery(searchableListing("BMW 320 d"), "320d")).toBe(true);
    expect(listingMatchesQuery(searchableListing("Samsung S23 Ultra"), "s 23 ultra")).toBe(true);
  });

  test("preserves Turkish folding, prefixes and rejects unrelated compact tokens", () => {
    expect(listingMatchesQuery(searchableListing("Çizgisiz çalışma masası"), "calisma mas")).toBe(
      true,
    );
    expect(listingMatchesQuery(searchableListing("Mercedes B 150"), "b250")).toBe(false);
  });
});

describe("Phase 2 deterministic intent and relevant-set ordering", () => {
  const corollaCar = listing({
    id: "00000000-0000-4000-8000-000000000001",
    title: "2022 Toyota Corolla Hybrid",
    price: 1_250_000,
    category: "vehicle",
    productType: "automobile",
    productAttributes: { make: "Toyota", model: "Corolla", year: 2022, fuel: "hybrid" },
    keywords: ["otomobil", "araba", "Toyota", "Corolla"],
  });
  const corollaPart = listing({
    id: "00000000-0000-4000-8000-000000000002",
    title: "Toyota Corolla ön tampon parçası",
    price: 4_000,
    category: "vehicle",
    productType: "automobile-part",
    keywords: ["otomobil parçası", "oto parça", "Corolla"],
  });
  const corollaAccessory = listing({
    id: "00000000-0000-4000-8000-000000000003",
    title: "Corolla bagaj aksesuarı",
    price: 900,
    category: "vehicle",
    productType: "automobile-accessory",
    keywords: ["otomobil aksesuarı", "Corolla"],
  });
  const iphone = listing({
    id: "00000000-0000-4000-8000-000000000004",
    title: "Apple iPhone 13 128 GB",
    price: 24_000,
    category: "electronics",
    productType: "phone",
    productAttributes: { brand: "Apple", model: "iPhone 13", storage_gb: 128 },
    keywords: ["telefon", "akıllı telefon", "Apple", "iPhone 13", "128"],
  });
  const iphoneCase = listing({
    id: "00000000-0000-4000-8000-000000000005",
    title: "iPhone 13 şeffaf kılıf",
    price: 250,
    category: "electronics",
    productType: "phone-accessory",
    keywords: ["telefon aksesuarı", "iPhone 13", "kılıf"],
  });

  test("Corolla price sort never promotes parts or accessories into automobile intent", () => {
    const request = parseSearchRequestV1({ version: 1, q: "Corolla", sort: "price_asc" });
    expect(resolveSearchIntent([corollaPart, corollaCar, corollaAccessory], request)).toMatchObject(
      {
        productType: "automobile",
        confidence: "high",
      },
    );
    expect(
      executeSearchRequestV1([corollaPart, corollaCar, corollaAccessory], request).map(
        (item) => item.id,
      ),
    ).toEqual([corollaCar.id]);
  });

  test("generic part marker changes role only after the automobile family is unambiguous", () => {
    const request = parseSearchRequestV1({ version: 1, q: "Corolla parça", sort: "price_asc" });
    expect(resolveSearchIntent([corollaPart, corollaCar], request)).toMatchObject({
      productType: "automobile-part",
      confidence: "high",
    });
    expect(
      executeSearchRequestV1([corollaPart, corollaCar], request).map((item) => item.id),
    ).toEqual([corollaPart.id]);
  });

  test("iPhone 13 phone intent excludes cases even under ascending price sort", () => {
    const request = parseSearchRequestV1({ version: 1, q: "iPhone 13", sort: "price_asc" });
    expect(resolveSearchIntent([iphoneCase, iphone], request)).toMatchObject({
      productType: "phone",
      confidence: "high",
    });
    expect(executeSearchRequestV1([iphoneCase, iphone], request).map((item) => item.id)).toEqual([
      iphone.id,
    ]);
  });

  test("accessory marker resolves phone accessory without widening the relevant set", () => {
    const request = parseSearchRequestV1({ version: 1, q: "iPhone 13 kılıf", sort: "price_desc" });
    expect(resolveSearchIntent([iphoneCase, iphone], request)).toMatchObject({
      productType: "phone-accessory",
      confidence: "high",
    });
    expect(executeSearchRequestV1([iphoneCase, iphone], request).map((item) => item.id)).toEqual([
      iphoneCase.id,
    ]);
  });

  test("explicit product type beats inferred main-product intent", () => {
    const request = parseSearchRequestV1({
      version: 1,
      q: "Corolla",
      category: "vehicle",
      productType: "automobile-part",
      sort: "price_asc",
    });
    expect(resolveSearchIntent([corollaCar, corollaPart], request)).toMatchObject({
      productType: "automobile-part",
      source: "explicit_filter",
    });
    expect(
      executeSearchRequestV1([corollaCar, corollaPart], request).map((item) => item.id),
    ).toEqual([corollaPart.id]);
  });

  test("ambiguous typed evidence does not silently force a product type", () => {
    const autoX1 = listing({
      id: "00000000-0000-4000-8000-000000000006",
      title: "BMW X1",
      price: 1_700_000,
      category: "vehicle",
      productType: "automobile",
      keywords: ["X1"],
    });
    const phoneX1 = listing({
      id: "00000000-0000-4000-8000-000000000007",
      title: "X1 telefon",
      price: 9_000,
      category: "electronics",
      productType: "phone",
      keywords: ["X1"],
    });
    const request = parseSearchRequestV1({ version: 1, q: "X1", sort: "price_asc" });
    expect(resolveSearchIntent([autoX1, phoneX1], request)).toMatchObject({
      productType: null,
      confidence: "low",
      source: "ambiguous",
    });
    expect(executeSearchRequestV1([autoX1, phoneX1], request).map((item) => item.id)).toEqual([
      phoneX1.id,
      autoX1.id,
    ]);
  });

  test("default sort is relevance for a query and newest for browse", () => {
    expect(getDefaultSearchSort("Corolla")).toBe("relevance");
    expect(getDefaultSearchSort("   ")).toBe("newest");
  });
});
