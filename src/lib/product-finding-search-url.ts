import {
  SEARCH_SORTS,
  parseSearchRequestV1,
  type ContextualFacetFilter,
  type SearchRequestV1,
} from "./product-finding-contract";
import { getDefaultSearchSort } from "./listing-search";

export type ProductFindingSearchUrlState = {
  q?: string;
  category?: string;
  productType?: string;
  province?: string;
  district?: string;
  priceMin?: string;
  priceMax?: string;
  contextual?: string;
  sort?: string;
};

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new Error(`Search URL ${field} must be a string.`);
  return value;
}

function optionalNumberString(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  throw new Error(`Search URL ${field} must be numeric.`);
}

function optionalContextualString(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return JSON.stringify(value);
  }
  throw new Error("Search URL contextual filters must be an object.");
}

export function normalizeProductFindingSearchUrlState(
  input: Record<string, unknown>,
): ProductFindingSearchUrlState {
  return {
    q: optionalString(input.q, "q"),
    category: optionalString(input.category, "category"),
    productType: optionalString(input.productType, "productType"),
    province: optionalString(input.province, "province"),
    district: optionalString(input.district, "district"),
    priceMin: optionalNumberString(input.priceMin, "priceMin"),
    priceMax: optionalNumberString(input.priceMax, "priceMax"),
    contextual: optionalContextualString(input.contextual),
    sort: optionalString(input.sort, "sort"),
  };
}

function parseOptionalNumber(value: string | undefined): number | null {
  if (value === undefined || value.trim() === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error("Search URL contains an invalid number.");
  return parsed;
}

function parseContextual(value: string | undefined): unknown {
  if (value === undefined || value.trim() === "") return {};
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error("Contextual filters must be an object.");
    }
    return parsed;
  } catch (error) {
    if (error instanceof SyntaxError)
      throw new Error("Search URL contains invalid contextual JSON.");
    throw error;
  }
}

export function parseSearchRequestV1FromUrl(
  input: ProductFindingSearchUrlState | Record<string, unknown>,
): SearchRequestV1 {
  const state = normalizeProductFindingSearchUrlState(input as Record<string, unknown>);
  const q = state.q ?? "";
  const province = state.province?.trim() || null;
  const district = state.district?.trim() || null;
  if (district !== null && province === null) {
    throw new Error("District search requires a province.");
  }

  return parseSearchRequestV1({
    version: 1,
    q,
    category: state.category?.trim() || null,
    productType: state.productType?.trim() || null,
    location: { province, district },
    price: {
      min: parseOptionalNumber(state.priceMin),
      max: parseOptionalNumber(state.priceMax),
    },
    contextual: parseContextual(state.contextual),
    sort: state.sort?.trim() || getDefaultSearchSort(q),
  });
}

function stableContextualJson(
  contextual: Record<string, ContextualFacetFilter>,
): string | undefined {
  const keys = Object.keys(contextual).sort((left, right) => left.localeCompare(right));
  if (keys.length === 0) return undefined;
  const stable: Record<string, ContextualFacetFilter> = {};
  for (const key of keys) stable[key] = contextual[key];
  return JSON.stringify(stable);
}

export function serializeSearchRequestV1ToUrl(
  rawRequest: SearchRequestV1 | unknown,
): ProductFindingSearchUrlState {
  const request = parseSearchRequestV1(rawRequest);
  return {
    q: request.q || undefined,
    category: request.category ?? undefined,
    productType: request.productType ?? undefined,
    province: request.location.province ?? undefined,
    district: request.location.district ?? undefined,
    priceMin: request.price.min === null ? undefined : String(request.price.min),
    priceMax: request.price.max === null ? undefined : String(request.price.max),
    contextual: stableContextualJson(request.contextual),
    sort: SEARCH_SORTS.includes(request.sort) ? request.sort : undefined,
  };
}
