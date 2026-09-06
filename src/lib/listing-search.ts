import { getDistrictsForCity as getCatalogDistrictsForCity } from "@/data/turkiye-locations";
import {
  PRODUCT_TYPE_REGISTRY,
  listingMatchesStructuredFilters,
  parseSearchRequestV1,
  type ProductRole,
  type ProductType,
  type SearchRequestV1,
  type SearchSort,
} from "./product-finding-contract";
import type { ListingView } from "./public-listings";

export const ALL_CITIES = "Tüm Türkiye";
export const ALL_DISTRICTS = "Tüm ilçeler";

type SearchableListing = Pick<ListingView, "title" | "description" | "keywords">;

const TURKISH_CHARACTER_FOLD: Record<string, string> = {
  ç: "c",
  ğ: "g",
  ı: "i",
  ö: "o",
  ş: "s",
  ü: "u",
};

const PART_QUERY_MARKERS = ["parca", "yedek parca"] as const;
const ACCESSORY_QUERY_MARKERS = [
  "aksesuar",
  "kilif",
  "case",
  "kablo",
  "sarj",
  "sarj aleti",
  "charger",
] as const;
const GENERIC_ROLE_TOKENS = new Set(
  [...PART_QUERY_MARKERS, ...ACCESSORY_QUERY_MARKERS].flatMap((value) => value.split(" ")),
);

const ROOT_MAIN_PRODUCT_TYPE: Record<ProductType, ProductType> = {
  automobile: "automobile",
  "automobile-part": "automobile",
  "automobile-accessory": "automobile",
  housing: "housing",
  phone: "phone",
  "phone-accessory": "phone",
  wardrobe: "wardrobe",
  shoes: "shoes",
  bicycle: "bicycle",
  "bicycle-part": "bicycle",
};

const RELATED_ROLE_PRODUCT_TYPE: Partial<
  Record<ProductType, Partial<Record<ProductRole, ProductType>>>
> = {
  automobile: {
    main: "automobile",
    part: "automobile-part",
    accessory: "automobile-accessory",
  },
  phone: { main: "phone", accessory: "phone-accessory" },
  bicycle: { main: "bicycle", part: "bicycle-part" },
  housing: { main: "housing" },
  wardrobe: { main: "wardrobe" },
  shoes: { main: "shoes" },
};

export type SearchIntentResolution = Readonly<{
  productType: ProductType | null;
  category: ListingView["category"] | null;
  role: ProductRole | null;
  confidence: "high" | "low" | "none";
  source: "explicit_filter" | "product_alias" | "typed_inventory" | "ambiguous" | "none";
}>;

export function normalizeSearchText(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/[çğıöşü]/g, (character) => TURKISH_CHARACTER_FOLD[character] ?? character)
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .replace(/(\p{L})(\p{N})/gu, "$1 $2")
    .replace(/(\p{N})(\p{L})/gu, "$1 $2")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function tokenizeSearchQuery(query: string): string[] {
  const normalized = normalizeSearchText(query);
  return normalized ? normalized.split(" ") : [];
}

function containsPhrase(normalizedQuery: string, rawPhrase: string): boolean {
  const phrase = normalizeSearchText(rawPhrase);
  if (!normalizedQuery || !phrase) return false;
  return ` ${normalizedQuery} `.includes(` ${phrase} `);
}

export function listingMatchesQuery(listing: SearchableListing, query: string): boolean {
  const queryTokens = tokenizeSearchQuery(query);
  if (queryTokens.length === 0) return true;

  const listingWords = normalizeSearchText(
    [listing.title, listing.description, ...listing.keywords].join(" "),
  ).split(" ");

  return queryTokens.every((token) => listingWords.some((word) => word.startsWith(token)));
}

function getRoleMarker(normalizedQuery: string): ProductRole | "ambiguous" | null {
  const part = PART_QUERY_MARKERS.some((marker) => containsPhrase(normalizedQuery, marker));
  const accessory = ACCESSORY_QUERY_MARKERS.some((marker) =>
    containsPhrase(normalizedQuery, marker),
  );
  if (part && accessory) return "ambiguous";
  if (part) return "part";
  if (accessory) return "accessory";
  return null;
}

function hasNonRoleSignal(normalizedQuery: string): boolean {
  return normalizedQuery.split(" ").some((token) => !GENERIC_ROLE_TOKENS.has(token));
}

function getDirectAliasCandidates(
  normalizedQuery: string,
  category: SearchRequestV1["category"],
): ProductType[] {
  let bestScore = -1;
  const candidates = new Set<ProductType>();
  for (const productType of Object.keys(PRODUCT_TYPE_REGISTRY) as ProductType[]) {
    const definition = PRODUCT_TYPE_REGISTRY[productType];
    if (category !== null && definition.category !== category) continue;
    for (const alias of definition.aliases) {
      const normalizedAlias = normalizeSearchText(alias);
      if (!containsPhrase(normalizedQuery, normalizedAlias)) continue;
      const score = normalizedAlias.split(" ").length * 100 + normalizedAlias.length;
      if (score > bestScore) {
        bestScore = score;
        candidates.clear();
        candidates.add(productType);
      } else if (score === bestScore) {
        candidates.add(productType);
      }
    }
  }
  return [...candidates];
}

function highResolution(
  productType: ProductType,
  source: SearchIntentResolution["source"],
): SearchIntentResolution {
  const definition = PRODUCT_TYPE_REGISTRY[productType];
  return {
    productType,
    category: definition.category,
    role: definition.role,
    confidence: "high",
    source,
  };
}

function ambiguousResolution(category: SearchRequestV1["category"]): SearchIntentResolution {
  return {
    productType: null,
    category,
    role: null,
    confidence: "low",
    source: "ambiguous",
  };
}

function noneResolution(category: SearchRequestV1["category"]): SearchIntentResolution {
  return {
    productType: null,
    category,
    role: null,
    confidence: "none",
    source: "none",
  };
}

function relatedRoleProductType(mainType: ProductType, role: ProductRole): ProductType | null {
  return RELATED_ROLE_PRODUCT_TYPE[mainType]?.[role] ?? null;
}

export function resolveSearchIntent(
  listings: readonly ListingView[],
  request: SearchRequestV1,
): SearchIntentResolution {
  if (request.productType !== null) {
    return highResolution(request.productType, "explicit_filter");
  }

  const normalizedQuery = normalizeSearchText(request.q);
  if (!normalizedQuery) return noneResolution(request.category);

  const requestedRole = getRoleMarker(normalizedQuery);
  if (requestedRole === "ambiguous") return ambiguousResolution(request.category);

  const directCandidates = getDirectAliasCandidates(normalizedQuery, request.category);
  if (directCandidates.length > 1) return ambiguousResolution(request.category);

  const queryMatchedTypedListings = listings.filter(
    (listing) =>
      listing.productType !== null &&
      (request.category === null || listing.category === request.category) &&
      listingMatchesQuery(listing, request.q),
  );
  const inventoryRoots = new Set<ProductType>(
    queryMatchedTypedListings.map((listing) => ROOT_MAIN_PRODUCT_TYPE[listing.productType!]),
  );
  const mainInventoryRoots = new Set<ProductType>(
    queryMatchedTypedListings
      .filter((listing) => PRODUCT_TYPE_REGISTRY[listing.productType!].role === "main")
      .map((listing) => ROOT_MAIN_PRODUCT_TYPE[listing.productType!]),
  );

  if (directCandidates.length === 1) {
    const direct = directCandidates[0];
    const directRoot = ROOT_MAIN_PRODUCT_TYPE[direct];
    if (inventoryRoots.size > 0 && (inventoryRoots.size > 1 || !inventoryRoots.has(directRoot))) {
      return ambiguousResolution(request.category);
    }
    const definition = PRODUCT_TYPE_REGISTRY[direct];
    if (definition.role !== "main") return highResolution(direct, "product_alias");
    if (requestedRole && requestedRole !== "main") {
      const related = relatedRoleProductType(directRoot, requestedRole);
      return related ? highResolution(related, "product_alias") : ambiguousResolution(request.category);
    }
    return highResolution(direct, "product_alias");
  }

  if (inventoryRoots.size !== 1) {
    return inventoryRoots.size > 1 ? ambiguousResolution(request.category) : noneResolution(request.category);
  }

  const mainType = [...inventoryRoots][0];
  if (requestedRole && requestedRole !== "main") {
    if (!hasNonRoleSignal(normalizedQuery)) return ambiguousResolution(request.category);
    const related = relatedRoleProductType(mainType, requestedRole);
    const hasMatchingRoleEvidence = queryMatchedTypedListings.some(
      (listing) =>
        ROOT_MAIN_PRODUCT_TYPE[listing.productType!] === mainType &&
        PRODUCT_TYPE_REGISTRY[listing.productType!].role === requestedRole,
    );
    if (related && hasMatchingRoleEvidence) return highResolution(related, "typed_inventory");
    return noneResolution(request.category);
  }

  if (mainInventoryRoots.size === 1 && mainInventoryRoots.has(mainType)) {
    return highResolution(mainType, "typed_inventory");
  }
  return noneResolution(request.category);
}

export function listingMatchesSearchRequest(
  listing: ListingView,
  request: SearchRequestV1,
): boolean {
  if (!listing.category) {
    if (
      request.category !== null ||
      request.productType !== null ||
      Object.keys(request.contextual).length
    ) {
      return false;
    }
    if (request.location.province !== null && listing.city !== request.location.province)
      return false;
    if (request.location.district !== null && listing.district !== request.location.district)
      return false;
    if (request.price.min !== null && listing.price < request.price.min) return false;
    if (request.price.max !== null && listing.price > request.price.max) return false;
  } else if (
    !listingMatchesStructuredFilters(
      {
        category: listing.category,
        productType: listing.productType,
        productAttributes: listing.productAttributes,
        price: listing.price,
        province: listing.city,
        district: listing.district,
      },
      request,
    )
  ) {
    return false;
  }

  return listingMatchesQuery(listing, request.q);
}

function relevanceScore(
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
  else if (containsPhrase(title, normalizedQuery)) score += 200;
  if (containsPhrase(description, normalizedQuery)) score += 40;
  if (keywords.some((keyword) => keyword === normalizedQuery)) score += 120;
  else if (keywords.some((keyword) => containsPhrase(keyword, normalizedQuery))) score += 60;

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

export function getDefaultSearchSort(query: string): SearchSort {
  return tokenizeSearchQuery(query).length > 0 ? "relevance" : "newest";
}

export function executeSearchRequestV1(
  listings: readonly ListingView[],
  rawRequest: SearchRequestV1 | unknown,
): ListingView[] {
  const request = parseSearchRequestV1(rawRequest);
  const intent = resolveSearchIntent(listings, request);
  const relevant = listings.filter((listing) => {
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
    return relevant.slice().sort((left, right) => {
      return (
        relevanceScore(right, request, intent) - relevanceScore(left, request, intent) ||
        Date.parse(right.createdAt) - Date.parse(left.createdAt) ||
        left.id.localeCompare(right.id)
      );
    });
  }
  return relevant.slice().sort((left, right) => {
    if (request.sort === "newest") {
      return (
        Date.parse(right.createdAt) - Date.parse(left.createdAt) || left.id.localeCompare(right.id)
      );
    }
    if (request.sort === "price_asc") {
      return left.price - right.price || Date.parse(right.createdAt) - Date.parse(left.createdAt);
    }
    return right.price - left.price || Date.parse(right.createdAt) - Date.parse(left.createdAt);
  });
}

export function getDistrictsForCity(city: string): readonly string[] {
  if (city === ALL_CITIES) return [];
  return getCatalogDistrictsForCity(city);
}

export function clampListingLocation({
  city,
  district,
  validCities,
}: {
  city?: string;
  district?: string;
  validCities: readonly string[];
}): { city: string; district: string } {
  const canonicalCity = city && validCities.includes(city) ? city : ALL_CITIES;

  if (canonicalCity === ALL_CITIES) {
    return { city: canonicalCity, district: ALL_DISTRICTS };
  }

  const validDistricts = getDistrictsForCity(canonicalCity);
  const canonicalDistrict =
    district && (district === ALL_DISTRICTS || validDistricts.includes(district))
      ? district
      : ALL_DISTRICTS;

  return { city: canonicalCity, district: canonicalDistrict };
}
