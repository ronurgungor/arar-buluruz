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
  priceMin?: number;
  priceMax?: number;
  contextual?: Record<string, ContextualFacetFilter>;
  sort?: string;
};

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new Error(`Search URL ${field} must be a string.`);
  return value;
}

function parseNestedJson(value: string): unknown {
  let parsed: unknown = value;
  for (let depth = 0; depth < 2 && typeof parsed === "string"; depth += 1) {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      break;
    }
  }
  return parsed;
}

function optionalNumber(value: unknown, field: string): number | undefined {
  if (value === undefined) return undefined;
  const parsed = typeof value === "string" ? parseNestedJson(value) : value;
  if (typeof parsed === "number" && Number.isFinite(parsed)) return parsed;
  if (typeof parsed === "string" && parsed.trim() !== "") {
    const numeric = Number(parsed);
    if (Number.isFinite(numeric)) return numeric;
  }
  throw new Error(`Search URL ${field} must be numeric.`);
}

function optionalContextual(value: unknown): Record<string, ContextualFacetFilter> | undefined {
  if (value === undefined) return undefined;
  const parsed = typeof value === "string" ? parseNestedJson(value) : value;
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Search URL contextual filters must be an object.");
  }
  return parsed as Record<string, ContextualFacetFilter>;
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
    priceMin: optionalNumber(input.priceMin, "priceMin"),
    priceMax: optionalNumber(input.priceMax, "priceMax"),
    contextual: optionalContextual(input.contextual),
    sort: optionalString(input.sort, "sort"),
  };
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
      min: state.priceMin ?? null,
      max: state.priceMax ?? null,
    },
    contextual: state.contextual ?? {},
    sort: state.sort?.trim() || getDefaultSearchSort(q),
  });
}

function stableContextual(
  contextual: Record<string, ContextualFacetFilter>,
): Record<string, ContextualFacetFilter> | undefined {
  const keys = Object.keys(contextual).sort((left, right) => left.localeCompare(right));
  if (keys.length === 0) return undefined;
  const stable: Record<string, ContextualFacetFilter> = {};
  for (const key of keys) stable[key] = contextual[key];
  return stable;
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
    priceMin: request.price.min ?? undefined,
    priceMax: request.price.max ?? undefined,
    contextual: stableContextual(request.contextual),
    sort: SEARCH_SORTS.includes(request.sort) ? request.sort : undefined,
  };
}
