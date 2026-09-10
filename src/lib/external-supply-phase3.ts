import { z } from "zod";
import {
  generateSystemSearchKeywords,
  parseSearchRequestV1,
  validateProductSelection,
  type ProductAttributes,
  type ProductType,
  type SearchRequestV1,
} from "./product-finding-contract";
import {
  listingMatchesQuery,
  listingMatchesSearchRequest,
  normalizeSearchText,
  resolveSearchIntent,
  tokenizeSearchQuery,
  type SearchIntentResolution,
} from "./listing-search";
import type { ListingView } from "./public-listings";
import type { Stage1Category } from "./stage1-self-service-contract";

export const PHASE3_SEARCH_PIPELINE_ORDER = [
  "query",
  "intent_scope",
  "relevant_set",
  "filter",
  "sort",
] as const;

export const PHASE3_EXTERNAL_CATEGORIES = [
  "electronics",
  "home",
  "fashion",
  "hobby-sports",
  "baby-kids",
  "other",
] as const;

export type ProductFindingRecordKind = "native_listing" | "external_offer";
export type ProductFindingCondition = "new" | "used" | "refurbished" | "unknown";
export type ProductFindingProvenance = "native_seller_declared" | "external_source_extracted";
export type ProductFindingFreshness = "native_current" | "fresh" | "stale";
export type ProductFindingStructuredConfidence =
  | "seller_declared"
  | "deterministic"
  | "insufficient";

export type ProductFindingSearchCandidateV1 = Readonly<{
  recordKind: ProductFindingRecordKind;
  recordId: string;
  title: string;
  description: string;
  searchTerms: readonly string[];
  category: Stage1Category | null;
  productType: ProductType | null;
  productAttributes: ProductAttributes;
  condition: ProductFindingCondition;
  currentPrice: number | null;
  currentPriceCurrency: "TRY" | null;
  listingLocation: Readonly<{ province: string; district: string }> | null;
  sourceIdentity: Readonly<{ sourceId: string | null; sourceName: string }>;
  freshness: ProductFindingFreshness;
  provenance: ProductFindingProvenance;
  structuredConfidence: ProductFindingStructuredConfidence;
  createdAt: string;
}>;

export type ExternalSourcePersistenceV1 = Readonly<{
  id: string;
  displayName: string;
  canonicalDomain: string;
  sourceMode: "synthetic_fixture";
  eligibilityClass: "synthetic";
  eligibilityState: "synthetic_only";
  targetCountry: "TR";
}>;

export type ExternalOfferPersistenceV1 = Readonly<{
  id: string;
  sourceId: string;
  sourceOfferKey: string;
  canonicalUrl: string;
  title: string;
  category: Stage1Category;
  productType: ProductType | null;
  productAttributesVersion: 1 | null;
  productAttributes: ProductAttributes;
  searchTerms: readonly string[];
  condition: "new";
  provenance: "external_source_extracted";
  structuredConfidence: "deterministic" | "insufficient";
  extractionConfidence: "deterministic" | "low";
  priceAmount: number;
  priceCurrency: "TRY";
  priceObservedAt: string;
  priceValidUntil: string;
  availabilityState: "in_stock" | "out_of_stock" | "preorder" | "unknown";
  availabilityObservedAt: string;
  listingLocation: null;
  firstSeenAt: string;
  lastSeenAt: string;
  lastCheckedAt: string;
  freshUntil: string;
}>;

const externalCategorySchema = z.enum(PHASE3_EXTERNAL_CATEGORIES);

const syntheticProductOfferSchema = z
  .object({
    source: z
      .object({
        id: z.string().uuid(),
        displayName: z.string().trim().min(2).max(120),
        canonicalDomain: z
          .string()
          .trim()
          .toLowerCase()
          .refine((value) => value.endsWith(".invalid"), {
            message: "Phase 3.0 accepts synthetic .invalid sources only.",
          }),
        eligibilityState: z.literal("synthetic_only"),
      })
      .strict(),
    product: z
      .object({
        "@type": z.literal("Product"),
        name: z.string().trim().min(3).max(120),
        category: externalCategorySchema,
        productType: z.unknown().optional(),
        productAttributesVersion: z.unknown().optional(),
        productAttributes: z.unknown().optional(),
        itemCondition: z.literal("https://schema.org/NewCondition"),
        extractionConfidence: z.enum(["deterministic", "low"]),
      })
      .strict(),
    offer: z
      .object({
        "@type": z.literal("Offer"),
        id: z.string().uuid(),
        sourceOfferKey: z.string().trim().min(1).max(160),
        url: z.string().trim().url().max(2048),
        price: z.union([z.number().positive().finite(), z.string().trim().min(1).max(32)]),
        priceCurrency: z.literal("TRY"),
        priceObservedAt: z.string().datetime({ offset: true }),
        priceValidUntil: z.string().datetime({ offset: true }),
        availability: z.enum(["in_stock", "out_of_stock", "preorder", "unknown"]),
        availabilityObservedAt: z.string().datetime({ offset: true }),
      })
      .strict(),
    observation: z
      .object({
        firstSeenAt: z.string().datetime({ offset: true }),
        lastSeenAt: z.string().datetime({ offset: true }),
        lastCheckedAt: z.string().datetime({ offset: true }),
        freshUntil: z.string().datetime({ offset: true }),
      })
      .strict(),
  })
  .strict();

export type SyntheticProductOfferInput = z.input<typeof syntheticProductOfferSchema>;

function timestamp(value: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error(`Invalid timestamp: ${value}`);
  return parsed;
}

function parsePositiveTryPrice(value: number | string): number {
  const price = typeof value === "number" ? value : Number(value);
  const cents = price * 100;
  if (
    !Number.isFinite(price) ||
    price <= 0 ||
    !Number.isFinite(cents) ||
    Math.abs(Math.round(cents) - cents) > 1e-8
  ) {
    throw new Error("Synthetic Offer price must be a positive TRY amount with at most 2 decimals.");
  }
  return price;
}

function assertSyntheticUrl(urlValue: string, canonicalDomain: string): void {
  const url = new URL(urlValue);
  if (
    url.protocol !== "https:" ||
    url.hostname !== canonicalDomain ||
    url.username !== "" ||
    url.password !== ""
  ) {
    throw new Error("Synthetic Offer URL must stay on its HTTPS .invalid source domain.");
  }
}

function assertObservationOrder(input: z.output<typeof syntheticProductOfferSchema>): void {
  const firstSeen = timestamp(input.observation.firstSeenAt);
  const lastSeen = timestamp(input.observation.lastSeenAt);
  const lastChecked = timestamp(input.observation.lastCheckedAt);
  const priceObserved = timestamp(input.offer.priceObservedAt);
  const priceValidUntil = timestamp(input.offer.priceValidUntil);
  const availabilityObserved = timestamp(input.offer.availabilityObservedAt);
  const freshUntil = timestamp(input.observation.freshUntil);

  if (firstSeen > lastSeen || lastSeen > lastChecked) {
    throw new Error("Synthetic observation timestamps are out of order.");
  }
  if (
    priceObserved < firstSeen ||
    priceObserved > lastChecked ||
    priceValidUntil <= priceObserved
  ) {
    throw new Error("Synthetic price observation timestamps are invalid.");
  }
  if (availabilityObserved < firstSeen || availabilityObserved > lastChecked) {
    throw new Error("Synthetic availability observation timestamp is invalid.");
  }
  if (freshUntil <= lastChecked) {
    throw new Error("Synthetic freshness window must extend beyond the last check.");
  }
}

export function ingestSyntheticProductOffer(input: SyntheticProductOfferInput): Readonly<{
  source: ExternalSourcePersistenceV1;
  offer: ExternalOfferPersistenceV1;
}> {
  const parsed = syntheticProductOfferSchema.parse(input);
  assertSyntheticUrl(parsed.offer.url, parsed.source.canonicalDomain);
  assertObservationOrder(parsed);

  const selection =
    parsed.product.extractionConfidence === "deterministic"
      ? validateProductSelection({
          category: parsed.product.category,
          productType: parsed.product.productType,
          productAttributesVersion: parsed.product.productAttributesVersion,
          productAttributes: parsed.product.productAttributes,
        })
      : { productType: null, productAttributesVersion: null, productAttributes: {} };

  const source: ExternalSourcePersistenceV1 = {
    id: parsed.source.id,
    displayName: parsed.source.displayName,
    canonicalDomain: parsed.source.canonicalDomain,
    sourceMode: "synthetic_fixture",
    eligibilityClass: "synthetic",
    eligibilityState: "synthetic_only",
    targetCountry: "TR",
  };

  const searchTerms = generateSystemSearchKeywords({
    category: parsed.product.category,
    productType: selection.productType,
    productAttributes: selection.productAttributes,
  });

  const offer: ExternalOfferPersistenceV1 = {
    id: parsed.offer.id,
    sourceId: source.id,
    sourceOfferKey: parsed.offer.sourceOfferKey,
    canonicalUrl: parsed.offer.url,
    title: parsed.product.name,
    category: parsed.product.category,
    productType: selection.productType,
    productAttributesVersion: selection.productAttributesVersion,
    productAttributes: selection.productAttributes,
    searchTerms,
    condition: "new",
    provenance: "external_source_extracted",
    structuredConfidence:
      parsed.product.extractionConfidence === "deterministic" ? "deterministic" : "insufficient",
    extractionConfidence: parsed.product.extractionConfidence,
    priceAmount: parsePositiveTryPrice(parsed.offer.price),
    priceCurrency: "TRY",
    priceObservedAt: parsed.offer.priceObservedAt,
    priceValidUntil: parsed.offer.priceValidUntil,
    availabilityState: parsed.offer.availability,
    availabilityObservedAt: parsed.offer.availabilityObservedAt,
    listingLocation: null,
    firstSeenAt: parsed.observation.firstSeenAt,
    lastSeenAt: parsed.observation.lastSeenAt,
    lastCheckedAt: parsed.observation.lastCheckedAt,
    freshUntil: parsed.observation.freshUntil,
  };

  return { source, offer };
}

export function projectNativeListingCandidate(
  listing: ListingView,
): ProductFindingSearchCandidateV1 {
  return {
    recordKind: "native_listing",
    recordId: listing.id,
    title: listing.title,
    description: listing.description,
    searchTerms: listing.keywords,
    category: listing.category ?? null,
    productType: listing.productType,
    productAttributes: listing.productAttributes,
    condition: listing.condition === null || listing.condition === undefined ? "unknown" : "used",
    currentPrice: listing.price,
    currentPriceCurrency: "TRY",
    listingLocation: { province: listing.city, district: listing.district },
    sourceIdentity: { sourceId: null, sourceName: "Arar Buluruz" },
    freshness: "native_current",
    provenance: "native_seller_declared",
    structuredConfidence: "seller_declared",
    createdAt: listing.createdAt,
  };
}

export function projectExternalOfferCandidate(
  source: ExternalSourcePersistenceV1,
  offer: ExternalOfferPersistenceV1,
  now: Date = new Date(),
): ProductFindingSearchCandidateV1 {
  if (offer.sourceId !== source.id) throw new Error("External source/offer identity mismatch.");

  const nowMs = now.getTime();
  const freshnessIsCurrent = timestamp(offer.freshUntil) > nowMs;
  const priceIsCurrent =
    freshnessIsCurrent &&
    timestamp(offer.priceObservedAt) <= nowMs &&
    timestamp(offer.priceValidUntil) > nowMs &&
    offer.availabilityState === "in_stock";
  const hardFilterStructureIsTrusted = offer.structuredConfidence === "deterministic";

  return {
    recordKind: "external_offer",
    recordId: offer.id,
    title: offer.title,
    description: "",
    searchTerms: offer.searchTerms,
    category: offer.category,
    productType: hardFilterStructureIsTrusted ? offer.productType : null,
    productAttributes: hardFilterStructureIsTrusted ? offer.productAttributes : {},
    condition: "new",
    currentPrice: priceIsCurrent ? offer.priceAmount : null,
    currentPriceCurrency: priceIsCurrent ? "TRY" : null,
    listingLocation: offer.listingLocation,
    sourceIdentity: { sourceId: source.id, sourceName: source.displayName },
    freshness: freshnessIsCurrent && priceIsCurrent ? "fresh" : "stale",
    provenance: "external_source_extracted",
    structuredConfidence: offer.structuredConfidence,
    createdAt: offer.firstSeenAt,
  };
}

type CandidateAdapter = Readonly<{
  candidate: ProductFindingSearchCandidateV1;
  listing: ListingView;
}>;

function toListingAdapter(candidate: ProductFindingSearchCandidateV1): CandidateAdapter {
  const structuredUsable = candidate.structuredConfidence !== "insufficient";
  return {
    candidate,
    listing: {
      id: candidate.recordId,
      title: candidate.title,
      price: candidate.currentPrice ?? 0,
      category: candidate.category ?? undefined,
      productType: structuredUsable ? candidate.productType : null,
      productAttributesVersion: structuredUsable && candidate.productType !== null ? 1 : null,
      productAttributes: structuredUsable ? candidate.productAttributes : {},
      condition: null,
      city: candidate.listingLocation?.province ?? "",
      district: candidate.listingLocation?.district ?? "",
      seller: "",
      description: candidate.description,
      photos: [],
      createdAt: candidate.createdAt,
      distanceKm: null,
      keywords: [...candidate.searchTerms],
    },
  };
}

function candidatePassesCurrentTruthGuards(
  candidate: ProductFindingSearchCandidateV1,
  request: SearchRequestV1,
): boolean {
  const priceTruthRequired =
    request.price.min !== null ||
    request.price.max !== null ||
    request.sort === "price_asc" ||
    request.sort === "price_desc";
  if (priceTruthRequired && candidate.currentPrice === null) return false;

  const locationTruthRequired =
    request.location.province !== null || request.location.district !== null;
  if (locationTruthRequired && candidate.listingLocation === null) return false;

  return true;
}

function containsNormalizedPhrase(normalizedText: string, normalizedPhrase: string): boolean {
  if (!normalizedText || !normalizedPhrase) return false;
  return ` ${normalizedText} `.includes(` ${normalizedPhrase} `);
}

function candidateRelevanceScore(
  listing: ListingView,
  request: SearchRequestV1,
  intent: SearchIntentResolution,
): number {
  const normalizedQuery = normalizeSearchText(request.q);
  if (!normalizedQuery) return 0;
  const queryTokens = tokenizeSearchQuery(request.q);
  const title = normalizeSearchText(listing.title);
  const description = normalizeSearchText(listing.description);
  const titleWords = title.split(" ");
  const descriptionWords = description.split(" ");
  const keywords = listing.keywords.map(normalizeSearchText);
  const keywordWords = keywords.flatMap((value) => value.split(" "));

  let score = 0;
  if (title === normalizedQuery) score += 400;
  else if (containsNormalizedPhrase(title, normalizedQuery)) score += 200;
  if (containsNormalizedPhrase(description, normalizedQuery)) score += 40;
  if (keywords.some((keyword) => keyword === normalizedQuery)) score += 120;
  else if (keywords.some((keyword) => containsNormalizedPhrase(keyword, normalizedQuery)))
    score += 60;

  for (const token of queryTokens) {
    if (titleWords.includes(token)) score += 25;
    else if (titleWords.some((word) => word.startsWith(token))) score += 12;
    if (keywordWords.includes(token)) score += 15;
    else if (keywordWords.some((word) => word.startsWith(token))) score += 7;
    if (descriptionWords.includes(token)) score += 3;
    else if (descriptionWords.some((word) => word.startsWith(token))) score += 1;
  }
  if (intent.productType !== null && listing.productType === intent.productType) score += 10;
  return score;
}

export function executeProductFindingCandidatesV1(
  candidates: readonly ProductFindingSearchCandidateV1[],
  rawRequest: SearchRequestV1 | unknown,
): ProductFindingSearchCandidateV1[] {
  const request = parseSearchRequestV1(rawRequest);
  const adapters = candidates.map(toListingAdapter);

  // Keep Phase 2's settled intent boundary: intent is resolved against the candidate inventory
  // before current-truth hard filters are applied. Sort is last and cannot add candidates.
  const intent = resolveSearchIntent(
    adapters.map((adapter) => adapter.listing),
    request,
  );

  const filtered = adapters.filter(({ candidate, listing }) => {
    if (!candidatePassesCurrentTruthGuards(candidate, request)) return false;
    if (!listingMatchesSearchRequest(listing, request)) return false;
    if (
      request.productType === null &&
      intent.confidence === "high" &&
      intent.productType !== null &&
      listing.productType !== intent.productType
    ) {
      return false;
    }
    return true;
  });

  if (request.sort === "relevance") {
    return filtered
      .slice()
      .sort((left, right) => {
        return (
          candidateRelevanceScore(right.listing, request, intent) -
            candidateRelevanceScore(left.listing, request, intent) ||
          Date.parse(right.candidate.createdAt) - Date.parse(left.candidate.createdAt) ||
          left.candidate.recordKind.localeCompare(right.candidate.recordKind) ||
          left.candidate.recordId.localeCompare(right.candidate.recordId)
        );
      })
      .map(({ candidate }) => candidate);
  }

  return filtered
    .slice()
    .sort((left, right) => {
      if (request.sort === "newest") {
        return (
          Date.parse(right.candidate.createdAt) - Date.parse(left.candidate.createdAt) ||
          left.candidate.recordKind.localeCompare(right.candidate.recordKind) ||
          left.candidate.recordId.localeCompare(right.candidate.recordId)
        );
      }
      if (request.sort === "price_asc") {
        return (
          left.candidate.currentPrice! - right.candidate.currentPrice! ||
          Date.parse(right.candidate.createdAt) - Date.parse(left.candidate.createdAt)
        );
      }
      return (
        right.candidate.currentPrice! - left.candidate.currentPrice! ||
        Date.parse(right.candidate.createdAt) - Date.parse(left.candidate.createdAt)
      );
    })
    .map(({ candidate }) => candidate);
}

export function candidateMatchesFreeText(
  candidate: ProductFindingSearchCandidateV1,
  query: string,
): boolean {
  return listingMatchesQuery(
    {
      title: candidate.title,
      description: candidate.description,
      keywords: [...candidate.searchTerms],
    },
    query,
  );
}
