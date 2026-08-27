import { getDistrictsForCity as getCatalogDistrictsForCity } from "@/data/turkiye-locations";
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
