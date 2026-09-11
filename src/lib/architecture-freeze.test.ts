import { describe, expect, test } from "bun:test";
import {
  FACT_AUTHORITY,
  INTENT_AUTHORITY,
  PRODUCT_FINDING_EXECUTION_ORDER,
  classifyListingPolicyScopeDeterministically,
  deriveListingPublicCapabilities,
} from "./architecture-freeze";
import { executeProductFindingCandidatesV1, projectNativeListingCandidate } from "./external-supply-phase3";
import { executeSearchRequestV1 } from "./listing-search";
import { parseSearchRequestV1 } from "./product-finding-contract";
import type { ListingView } from "./public-listings";

const baseCapabilityInput = {
  lifecycle: "active" as const,
  eligibility: "eligible" as const,
  enforcement: "clear" as const,
  contact: "available" as const,
  policyScope: "ordinary" as const,
  publicationReady: true,
  publicationInstructionPresent: true,
  notExpired: true,
};

function listing(input: Partial<ListingView> & Pick<ListingView, "id" | "title">): ListingView {
  return {
    id: input.id,
    title: input.title,
    price: input.price ?? 1000,
    category: input.category ?? "electronics",
    productType: input.productType ?? "phone",
    productAttributesVersion: input.productAttributesVersion ?? 1,
    productAttributes: input.productAttributes ?? { brand: "Apple", model: "iPhone 13", storage_gb: 128 },
    condition: input.condition ?? "used",
    city: input.city ?? "Tekirdağ",
    district: input.district ?? "Çorlu",
    seller: input.seller ?? "Seller",
    description: input.description ?? "",
    photos: input.photos ?? [],
    createdAt: input.createdAt ?? "2026-09-11T10:00:00.000Z",
    distanceKm: input.distanceKm ?? null,
    keywords: input.keywords ?? [],
  };
}

describe("mandatory architecture freeze contract", () => {
  test("keeps selected category separate from server-owned policy scope", () => {
    expect(classifyListingPolicyScopeDeterministically({ category: "vehicle", productType: "automobile" })).toBe("eids_vehicle");
    expect(classifyListingPolicyScopeDeterministically({ category: "real-estate", productType: "housing" })).toBe("eids_real_estate");
    expect(classifyListingPolicyScopeDeterministically({ category: "electronics", productType: "phone" })).toBe("ordinary");
    expect(classifyListingPolicyScopeDeterministically({ category: "other", productType: null })).toBe("review_required");
  });

  test("derives one fail-closed public capability contract", () => {
    expect(deriveListingPublicCapabilities(baseCapabilityInput)).toEqual({
      searchIndex: true,
      detail: true,
      signedPhoto: true,
      publicContact: true,
      externalCta: true,
    });

    for (const patch of [
      { enforcement: "removed" as const },
      { enforcement: "held" as const },
      { contact: "suppressed" as const },
      { eligibility: "review_required" as const },
      { eligibility: "regulated_verification_required" as const },
      { eligibility: "blocked" as const },
      { policyScope: "review_required" as const },
      { policyScope: "restricted" as const },
      { lifecycle: "sold" as const },
      { lifecycle: "withdrawn" as const },
      { notExpired: false },
      { publicationReady: false },
      { publicationInstructionPresent: false },
    ]) {
      expect(deriveListingPublicCapabilities({ ...baseCapabilityInput, ...patch })).toEqual({
        searchIndex: false,
        detail: false,
        signedPhoto: false,
        publicContact: false,
        externalCta: false,
      });
    }
  });

  test("freezes Product Finding intent and fact authority separately", () => {
    expect(INTENT_AUTHORITY).toEqual([
      "legal_publication_availability",
      "explicit_user_scope_and_filters",
      "high_confidence_inferred_intent",
      "free_text_relevance",
    ]);
    expect(FACT_AUTHORITY).toEqual([
      "regulatory_or_provider_verified",
      "validated_seller_structured",
      "deterministic_derived_or_external",
      "free_text_claim",
    ]);
    expect(PRODUCT_FINDING_EXECUTION_ORDER).toEqual([
      "eligibility",
      "product_role_scope",
      "hard_filters",
      "text_relevance",
      "sort",
    ]);
  });
});

describe("Product Finding conflict regression", () => {
  const phone128 = listing({
    id: "f1000000-0000-4000-8000-000000000001",
    title: "iPhone 13 256 GB yazıyor ama yapılandırılmış veri 128 GB",
    productAttributes: { brand: "Apple", model: "iPhone 13", storage_gb: 128 },
    keywords: ["iphone", "telefon"],
  });
  const phone256 = listing({
    id: "f1000000-0000-4000-8000-000000000002",
    title: "iPhone 13",
    productAttributes: { brand: "Apple", model: "iPhone 13", storage_gb: 256 },
    keywords: ["iphone", "telefon", "256"],
    createdAt: "2026-09-11T11:00:00.000Z",
  });
  const accessory = listing({
    id: "f1000000-0000-4000-8000-000000000003",
    title: "iPhone 13 kılıf telefon aksesuarı",
    productType: "phone-accessory",
    productAttributes: {},
    keywords: ["iphone", "kılıf", "aksesuar"],
  });

  test("explicit product filter wins inferred query intent", () => {
    const request = parseSearchRequestV1({
      version: 1,
      q: "iphone 13",
      category: "electronics",
      productType: "phone-accessory",
      sort: "relevance",
    });
    expect(executeSearchRequestV1([phone128, accessory], request).map((item) => item.id)).toEqual([
      accessory.id,
    ]);
  });

  test("structured fact wins contradictory free text for hard filtering", () => {
    const request = parseSearchRequestV1({
      version: 1,
      q: "iphone",
      productType: "phone",
      contextual: { storage_gb: [256] },
      sort: "relevance",
    });
    expect(executeSearchRequestV1([phone128, phone256], request).map((item) => item.id)).toEqual([
      phone256.id,
    ]);
  });

  test("missing hard-filter fact fails closed", () => {
    const missing = listing({
      id: "f1000000-0000-4000-8000-000000000004",
      title: "iPhone 13 256 GB",
      productAttributes: { brand: "Apple", model: "iPhone 13" },
    });
    const request = parseSearchRequestV1({
      version: 1,
      q: "iphone",
      productType: "phone",
      contextual: { storage_gb: [256] },
      sort: "relevance",
    });
    expect(executeSearchRequestV1([missing, phone256], request).map((item) => item.id)).toEqual([
      phone256.id,
    ]);
  });

  test("sorting cannot enlarge the relevant set and Phase 3 keeps native provenance", () => {
    const candidates = [phone128, phone256, accessory].map(projectNativeListingCandidate);
    const base = { version: 1, q: "iphone", productType: "phone" } as const;
    const relevance = executeProductFindingCandidatesV1(
      candidates,
      parseSearchRequestV1({ ...base, sort: "relevance" }),
    );
    const newest = executeProductFindingCandidatesV1(
      candidates,
      parseSearchRequestV1({ ...base, sort: "newest" }),
    );
    expect(new Set(newest.map((item) => item.recordId))).toEqual(
      new Set(relevance.map((item) => item.recordId)),
    );
    expect(relevance.every((item) => item.provenance === "native_seller_declared")).toBe(true);
  });
});
