import { describe, expect, test } from "bun:test";
import {
  executeProductFindingCandidatesV1,
  ingestSyntheticProductOffer,
  PHASE3_SEARCH_PIPELINE_ORDER,
  projectExternalOfferCandidate,
  projectNativeListingCandidate,
  type SyntheticProductOfferInput,
} from "./external-supply-phase3";
import { executeSearchRequestV1 } from "./listing-search";
import {
  parseSearchRequestV1,
  resolveProductComplianceScope,
  type ProductType,
} from "./product-finding-contract";
import type { ListingView } from "./public-listings";

function syntheticInput(): SyntheticProductOfferInput {
  return {
    source: {
      id: "e3000000-0000-4000-8000-000000000001",
      displayName: "Synthetic Merchant",
      canonicalDomain: "phase3-merchant.invalid",
      eligibilityState: "synthetic_only",
    },
    product: {
      "@type": "Product",
      name: "Apple iPhone 13 128 GB",
      category: "electronics",
      productType: "phone",
      productAttributesVersion: 1,
      productAttributes: { brand: "Apple", model: "iPhone 13", storage_gb: 128 },
      itemCondition: "https://schema.org/NewCondition",
      extractionConfidence: "deterministic",
    },
    offer: {
      "@type": "Offer",
      id: "e3100000-0000-4000-8000-000000000001",
      sourceOfferKey: "synthetic-iphone-13-128",
      url: "https://phase3-merchant.invalid/products/iphone-13-128",
      price: "19999.90",
      priceCurrency: "TRY",
      priceObservedAt: "2026-09-10T11:30:00.000Z",
      priceValidUntil: "2026-09-10T14:00:00.000Z",
      availability: "in_stock",
      availabilityObservedAt: "2026-09-10T11:30:00.000Z",
    },
    observation: {
      firstSeenAt: "2026-09-10T11:00:00.000Z",
      lastSeenAt: "2026-09-10T11:30:00.000Z",
      lastCheckedAt: "2026-09-10T11:30:00.000Z",
      freshUntil: "2026-09-10T16:00:00.000Z",
    },
  };
}

function nativeListing(input: {
  id: string;
  title: string;
  price: number;
  productType?: ProductType;
  productAttributes?: ListingView["productAttributes"];
  description?: string;
  keywords?: string[];
  createdAt?: string;
}): ListingView {
  return {
    id: input.id,
    title: input.title,
    price: input.price,
    category: "electronics",
    productType: input.productType ?? "phone",
    productAttributesVersion: 1,
    productAttributes: input.productAttributes ?? {
      brand: "Apple",
      model: "iPhone 13",
      storage_gb: 128,
    },
    condition: "used",
    city: "Tekirdağ",
    district: "Çorlu",
    seller: "Native Seller",
    description: input.description ?? "Native seller description",
    photos: [],
    createdAt: input.createdAt ?? "2026-09-10T10:00:00.000Z",
    distanceKm: null,
    keywords: input.keywords ?? ["telefon", "Apple", "iPhone 13", "128"],
  };
}

describe("Phase 3.0 synthetic ingestion boundary", () => {
  test("creates separate source/offer persistence facts with explicit new condition and provenance", () => {
    const { source, offer } = ingestSyntheticProductOffer(syntheticInput());

    expect(source).toMatchObject({
      sourceMode: "synthetic_fixture",
      eligibilityClass: "synthetic",
      eligibilityState: "synthetic_only",
      targetCountry: "TR",
    });
    expect(offer).toMatchObject({
      sourceId: source.id,
      condition: "new",
      provenance: "external_source_extracted",
      structuredConfidence: "deterministic",
      productType: "phone",
      productAttributes: { brand: "Apple", model: "iPhone 13", storage_gb: 128 },
      priceCurrency: "TRY",
      listingLocation: null,
    });
    expect("ownerUserId" in offer).toBe(false);
    expect("sellerId" in offer).toBe(false);
    expect("sessionId" in offer).toBe(false);
    expect("recoveryCode" in offer).toBe(false);
    expect("phone" in offer).toBe(false);
  });

  test("refuses real merchant domains and non-new Product evidence in the synthetic-only slice", () => {
    const realDomain = syntheticInput();
    realDomain.source.canonicalDomain = "merchant.example.com";
    expect(() => ingestSyntheticProductOffer(realDomain)).toThrow(
      "synthetic .invalid sources only",
    );

    const usedCondition = {
      ...syntheticInput(),
      product: {
        ...syntheticInput().product,
        itemCondition: "https://schema.org/UsedCondition",
      },
    } as unknown as SyntheticProductOfferInput;
    expect(() => ingestSyntheticProductOffer(usedCondition)).toThrow();
  });

  test("low-confidence extraction cannot populate product type or hard-filter attributes", () => {
    const input = syntheticInput();
    input.product.extractionConfidence = "low";
    const { offer } = ingestSyntheticProductOffer(input);

    expect(offer.structuredConfidence).toBe("insufficient");
    expect(offer.productType).toBeNull();
    expect(offer.productAttributesVersion).toBeNull();
    expect(offer.productAttributes).toEqual({});
  });

  test("rejects an external URL that escapes its approved synthetic source domain", () => {
    const input = syntheticInput();
    input.offer.url = "https://other.invalid/products/iphone-13-128";
    expect(() => ingestSyntheticProductOffer(input)).toThrow(
      "Synthetic Offer URL must stay on its HTTPS .invalid source domain",
    );
  });
});

describe("Phase 3.0 common search candidate projection", () => {
  test("preserves native and external lifecycle/provenance identity end-to-end", () => {
    const native = nativeListing({
      id: "e3200000-0000-4000-8000-000000000001",
      title: "Apple iPhone 13 128 GB kullanılmış",
      price: 24_000,
    });
    const { source, offer } = ingestSyntheticProductOffer(syntheticInput());
    const candidates = [
      projectNativeListingCandidate(native),
      projectExternalOfferCandidate(source, offer, new Date("2026-09-10T12:00:00.000Z")),
    ];
    const request = parseSearchRequestV1({
      version: 1,
      q: "iPhone 13",
      category: "electronics",
      productType: "phone",
      sort: "price_asc",
    });

    const results = executeProductFindingCandidatesV1(candidates, request);
    expect(results.map((candidate) => candidate.recordKind)).toEqual([
      "external_offer",
      "native_listing",
    ]);
    expect(results.map((candidate) => candidate.provenance)).toEqual([
      "external_source_extracted",
      "native_seller_declared",
    ]);
    expect(results[0]?.condition).toBe("new");
    expect(results[1]?.condition).toBe("used");
  });

  test("fresh external TRY price participates in current price filters and sorting", () => {
    const native = projectNativeListingCandidate(
      nativeListing({
        id: "e3200000-0000-4000-8000-000000000002",
        title: "Apple iPhone 13 128 GB ikinci el",
        price: 24_000,
      }),
    );
    const { source, offer } = ingestSyntheticProductOffer(syntheticInput());
    const external = projectExternalOfferCandidate(
      source,
      offer,
      new Date("2026-09-10T12:00:00.000Z"),
    );
    const request = parseSearchRequestV1({
      version: 1,
      q: "iPhone 13",
      category: "electronics",
      productType: "phone",
      price: { min: 19_000, max: 25_000 },
      sort: "price_asc",
    });

    expect(external.currentPrice).toBe(19_999.9);
    expect(external.freshness).toBe("fresh");
    expect(
      executeProductFindingCandidatesV1([native, external], request).map((item) => item.recordKind),
    ).toEqual(["external_offer", "native_listing"]);
  });

  test("future last check is stale and cannot project current price", () => {
    const { source, offer } = ingestSyntheticProductOffer(syntheticInput());
    const futureChecked = projectExternalOfferCandidate(
      source,
      {
        ...offer,
        lastCheckedAt: "2026-09-10T12:30:00.000Z",
      },
      new Date("2026-09-10T12:00:00.000Z"),
    );

    expect(futureChecked.freshness).toBe("stale");
    expect(futureChecked.currentPrice).toBeNull();
    expect(futureChecked.currentPriceCurrency).toBeNull();
  });

  test("future price observation cannot become current truth early", () => {
    const { source, offer } = ingestSyntheticProductOffer(syntheticInput());
    const futurePrice = projectExternalOfferCandidate(
      source,
      {
        ...offer,
        priceObservedAt: "2026-09-10T12:30:00.000Z",
      },
      new Date("2026-09-10T12:00:00.000Z"),
    );

    expect(futurePrice.freshness).toBe("fresh");
    expect(futurePrice.currentPrice).toBeNull();
    expect(futurePrice.currentPriceCurrency).toBeNull();
  });

  test("future availability observation cannot make price current early", () => {
    const { source, offer } = ingestSyntheticProductOffer(syntheticInput());
    const futureAvailability = projectExternalOfferCandidate(
      source,
      {
        ...offer,
        availabilityObservedAt: "2026-09-10T12:30:00.000Z",
      },
      new Date("2026-09-10T12:00:00.000Z"),
    );

    expect(futureAvailability.freshness).toBe("fresh");
    expect(futureAvailability.currentPrice).toBeNull();
    expect(futureAvailability.currentPriceCurrency).toBeNull();
  });

  test("fresh observation with expired price stays fresh but fails closed for price use", () => {
    const native = projectNativeListingCandidate(
      nativeListing({
        id: "e3200000-0000-4000-8000-000000000003",
        title: "Apple iPhone 13 128 GB ikinci el",
        price: 24_000,
      }),
    );
    const { source, offer } = ingestSyntheticProductOffer(syntheticInput());
    const expiredPrice = projectExternalOfferCandidate(
      source,
      offer,
      new Date("2026-09-10T14:30:00.000Z"),
    );

    expect(expiredPrice.currentPrice).toBeNull();
    expect(expiredPrice.currentPriceCurrency).toBeNull();
    expect(expiredPrice.freshness).toBe("fresh");

    const hardPrice = parseSearchRequestV1({
      version: 1,
      q: "iPhone 13",
      price: { min: null, max: 30_000 },
      sort: "relevance",
    });
    expect(
      executeProductFindingCandidatesV1([native, expiredPrice], hardPrice).map(
        (item) => item.recordKind,
      ),
    ).toEqual(["native_listing"]);

    const priceSort = parseSearchRequestV1({ version: 1, q: "iPhone 13", sort: "price_asc" });
    expect(
      executeProductFindingCandidatesV1([native, expiredPrice], priceSort).map(
        (item) => item.recordKind,
      ),
    ).toEqual(["native_listing"]);
  });

  test("fresh out-of-stock observation stays fresh without current price truth", () => {
    const { source, offer } = ingestSyntheticProductOffer(syntheticInput());
    const outOfStock = projectExternalOfferCandidate(
      source,
      { ...offer, availabilityState: "out_of_stock" },
      new Date("2026-09-10T12:00:00.000Z"),
    );

    expect(outOfStock.freshness).toBe("fresh");
    expect(outOfStock.currentPrice).toBeNull();
    expect(outOfStock.currentPriceCurrency).toBeNull();
  });

  test("external offer without genuine listing-location semantics fails an active native location filter", () => {
    const native = projectNativeListingCandidate(
      nativeListing({
        id: "e3200000-0000-4000-8000-000000000004",
        title: "Apple iPhone 13 128 GB",
        price: 24_000,
      }),
    );
    const { source, offer } = ingestSyntheticProductOffer(syntheticInput());
    const external = projectExternalOfferCandidate(
      source,
      offer,
      new Date("2026-09-10T12:00:00.000Z"),
    );
    const request = parseSearchRequestV1({
      version: 1,
      q: "iPhone 13",
      location: { province: "Tekirdağ", district: "Çorlu" },
      sort: "relevance",
    });

    expect(external.listingLocation).toBeNull();
    expect(
      executeProductFindingCandidatesV1([external, native], request).map((item) => item.recordKind),
    ).toEqual(["native_listing"]);
  });

  test("structured product filters use only deterministic external facts", () => {
    const { source, offer } = ingestSyntheticProductOffer(syntheticInput());
    const deterministic = projectExternalOfferCandidate(
      source,
      offer,
      new Date("2026-09-10T12:00:00.000Z"),
    );
    const lowInput = syntheticInput();
    lowInput.offer.id = "e3100000-0000-4000-8000-000000000002";
    lowInput.product.extractionConfidence = "low";
    const lowIngested = ingestSyntheticProductOffer(lowInput);
    const low = projectExternalOfferCandidate(
      lowIngested.source,
      lowIngested.offer,
      new Date("2026-09-10T12:00:00.000Z"),
    );
    const request = parseSearchRequestV1({
      version: 1,
      q: "iPhone 13",
      category: "electronics",
      productType: "phone",
      contextual: { storage_gb: [128] },
      sort: "relevance",
    });

    expect(
      executeProductFindingCandidatesV1([low, deterministic], request).map((item) => item.recordId),
    ).toEqual([deterministic.recordId]);
  });
});

describe("Phase 2 and legal/security boundaries remain authoritative", () => {
  test("native-only common-candidate execution matches settled Phase 2 execution across relevance signals", () => {
    const first = nativeListing({
      id: "e3300000-0000-4000-8000-000000000001",
      title: "iPhone 13",
      price: 24_000,
      createdAt: "2026-09-10T10:00:00.000Z",
    });
    const second = nativeListing({
      id: "e3300000-0000-4000-8000-000000000002",
      title: "Apple iPhone 13 256 GB",
      price: 28_000,
      productAttributes: { brand: "Apple", model: "iPhone 13", storage_gb: 256 },
      createdAt: "2026-09-10T11:00:00.000Z",
    });
    const third = nativeListing({
      id: "e3300000-0000-4000-8000-000000000003",
      title: "Telefon fırsatı",
      price: 26_000,
      keywords: ["iPhone 13", "telefon"],
      createdAt: "2026-09-10T12:00:00.000Z",
    });
    const fourth = nativeListing({
      id: "e3300000-0000-4000-8000-000000000004",
      title: "Apple telefon",
      price: 25_000,
      description: "Temiz iPhone 13 cihaz açıklaması",
      keywords: ["telefon"],
      createdAt: "2026-09-10T13:00:00.000Z",
    });
    const listings = [fourth, third, second, first];
    const candidates = listings.map(projectNativeListingCandidate);
    const requests = [
      parseSearchRequestV1({ version: 1, q: "iPhone 13", sort: "relevance" }),
      parseSearchRequestV1({ version: 1, q: "iPhone 13", sort: "price_desc" }),
      parseSearchRequestV1({
        version: 1,
        q: "",
        category: "electronics",
        productType: "phone",
        contextual: { storage_gb: [128] },
        sort: "newest",
      }),
    ];

    for (const request of requests) {
      expect(
        executeProductFindingCandidatesV1(candidates, request).map((item) => item.recordId),
      ).toEqual(executeSearchRequestV1(listings, request).map((item) => item.id));
    }
  });

  test("keeps the settled Product Finding pipeline order explicit", () => {
    expect(PHASE3_SEARCH_PIPELINE_ORDER).toEqual([
      "query",
      "intent_scope",
      "relevant_set",
      "filter",
      "sort",
    ]);
  });

  test("does not change EİDS category/product boundaries", () => {
    expect(resolveProductComplianceScope({ category: "vehicle", productType: "automobile" })).toBe(
      "eids_vehicle",
    );
    expect(resolveProductComplianceScope({ category: "real-estate", productType: "housing" })).toBe(
      "eids_real_estate",
    );
    expect(resolveProductComplianceScope({ category: "electronics", productType: "phone" })).toBe(
      "ordinary",
    );
  });
});
