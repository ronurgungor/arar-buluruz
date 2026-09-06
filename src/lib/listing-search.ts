import { getDistrictsForCity as getCatalogDistrictsForCity } from "@/data/turkiye-locations";
import {
  listingMatchesStructuredFilters,
  parseSearchRequestV1,
  type SearchRequestV1,
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

export function listingMatchesQuery(listing: SearchableListing, query: string): boolean {
  const queryTokens = tokenizeSearchQuery(query);
  if (queryTokens.length === 0) return true;

  const listingWords = normalizeSearchText(
    [listing.title, listing.description, ...listing.keywords].join(" "),
  ).split(" ");

  return queryTokens.every((token) => listingWords.some((word) => word.startsWith(token)));
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

export function executeSearchRequestV1(
  listings: readonly ListingView[],
  rawRequest: SearchRequestV1 | unknown,
): ListingView[] {
  const request = parseSearchRequestV1(rawRequest);
  const relevant = listings.filter((listing) => listingMatchesSearchRequest(listing, request));

  if (request.sort === "relevance") return relevant;
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
