import type { ListingView } from "./public-listings";

export const ALL_CITIES = "Tüm Türkiye";
export const ALL_DISTRICTS = "Tüm ilçeler";

type SearchableListing = Pick<ListingView, "title" | "description" | "keywords">;
type LocatedListing = Pick<ListingView, "city" | "district">;

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

export function getDistrictsForCity(listings: readonly LocatedListing[], city: string): string[] {
  if (city === ALL_CITIES) return [];

  return [
    ...new Set(
      listings
        .filter((listing) => listing.city === city)
        .map((listing) => listing.district)
        .filter(Boolean),
    ),
  ].sort((left, right) => left.localeCompare(right, "tr"));
}

export function clampListingLocation({
  city,
  district,
  validCities,
  listings,
}: {
  city?: string;
  district?: string;
  validCities: readonly string[];
  listings: readonly LocatedListing[];
}): { city: string; district: string } {
  const canonicalCity = city && validCities.includes(city) ? city : ALL_CITIES;

  if (canonicalCity === ALL_CITIES) {
    return { city: canonicalCity, district: ALL_DISTRICTS };
  }

  const validDistricts = getDistrictsForCity(listings, canonicalCity);
  const canonicalDistrict =
    district && (district === ALL_DISTRICTS || validDistricts.includes(district))
      ? district
      : ALL_DISTRICTS;

  return { city: canonicalCity, district: canonicalDistrict };
}
