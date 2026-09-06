import { z } from "zod";
import type { Stage1Category } from "./stage1-self-service-contract";

export const PRODUCT_ATTRIBUTES_VERSION = 1 as const;

export const PRODUCT_TYPES = [
  "automobile",
  "automobile-part",
  "automobile-accessory",
  "housing",
  "phone",
  "phone-accessory",
  "wardrobe",
  "shoes",
  "bicycle",
  "bicycle-part",
] as const;

export const productTypeSchema = z.enum(PRODUCT_TYPES);
export type ProductType = z.infer<typeof productTypeSchema>;
export type ProductRole = "main" | "accessory" | "part";

const shortText = (max: number) => z.string().trim().min(1).max(max);
const optionalFields = (fields: Record<string, z.ZodTypeAny>) =>
  Object.fromEntries(Object.entries(fields).map(([key, schema]) => [key, schema.optional()]));

const automobileFields = {
  make: shortText(60),
  model: shortText(80),
  year: z.number().int().min(1886).max(2100),
  km: z.number().int().min(0).max(10_000_000),
  transmission: z.enum(["manual", "automatic", "semi_automatic"]),
  fuel: z.enum(["gasoline", "diesel", "lpg", "hybrid", "electric"]),
  body_type: z.enum([
    "sedan",
    "hatchback",
    "station_wagon",
    "suv",
    "coupe",
    "convertible",
    "pickup",
    "van",
    "other",
  ]),
};

const housingFields = {
  offer_type: z.enum(["sale", "rent"]),
  property_type: z.enum(["apartment", "detached_house", "residence", "villa", "other"]),
  room_count: z.enum(["studio", "1+1", "2+1", "3+1", "4+1", "5+", "other"]),
  area_m2: z.number().positive().max(100_000),
};

const phoneFields = {
  brand: shortText(60),
  model: shortText(80),
  storage_gb: z
    .number()
    .int()
    .refine((value) => [16, 32, 64, 128, 256, 512, 1024, 2048].includes(value)),
};

const wardrobeFields = {
  width_cm: z.number().positive().max(2_000),
  height_cm: z.number().positive().max(2_000),
  depth_cm: z.number().positive().max(2_000),
  door_type: z.enum(["hinged", "sliding", "open"]),
};

const shoesFields = {
  size_eu: z.number().min(15).max(55).multipleOf(0.5),
  target_group: z.enum(["women", "men", "unisex", "kids"]),
  brand: shortText(60),
};

const bicycleFields = {
  bicycle_type: z.enum(["city", "mountain", "road", "hybrid", "bmx", "electric", "other"]),
  wheel_size_in: z.number().min(10).max(36).multipleOf(0.5),
  frame_size_cm: z.number().min(20).max(80).multipleOf(0.5),
};

export type ProductTypeDefinition = {
  category: Stage1Category;
  label: string;
  role: ProductRole;
  aliases: readonly string[];
  attributeFields: Record<string, z.ZodTypeAny>;
};

export const PRODUCT_TYPE_REGISTRY: Record<ProductType, ProductTypeDefinition> = {
  automobile: {
    category: "vehicle",
    label: "Otomobil",
    role: "main",
    aliases: ["otomobil", "araba", "oto"],
    attributeFields: automobileFields,
  },
  "automobile-part": {
    category: "vehicle",
    label: "Otomobil parçası",
    role: "part",
    aliases: ["otomobil parçası", "araba parçası", "oto parça"],
    attributeFields: {},
  },
  "automobile-accessory": {
    category: "vehicle",
    label: "Otomobil aksesuarı",
    role: "accessory",
    aliases: ["otomobil aksesuarı", "araba aksesuarı", "oto aksesuar"],
    attributeFields: {},
  },
  housing: {
    category: "real-estate",
    label: "Konut",
    role: "main",
    aliases: ["konut", "ev", "daire"],
    attributeFields: housingFields,
  },
  phone: {
    category: "electronics",
    label: "Telefon",
    role: "main",
    aliases: ["telefon", "cep telefonu", "akıllı telefon"],
    attributeFields: phoneFields,
  },
  "phone-accessory": {
    category: "electronics",
    label: "Telefon aksesuarı",
    role: "accessory",
    aliases: ["telefon aksesuarı", "cep telefonu aksesuarı"],
    attributeFields: {},
  },
  wardrobe: {
    category: "home",
    label: "Gardırop",
    role: "main",
    aliases: ["gardırop", "dolap", "elbise dolabı"],
    attributeFields: wardrobeFields,
  },
  shoes: {
    category: "fashion",
    label: "Ayakkabı",
    role: "main",
    aliases: ["ayakkabı"],
    attributeFields: shoesFields,
  },
  bicycle: {
    category: "hobby-sports",
    label: "Bisiklet",
    role: "main",
    aliases: ["bisiklet"],
    attributeFields: bicycleFields,
  },
  "bicycle-part": {
    category: "hobby-sports",
    label: "Bisiklet parçası",
    role: "part",
    aliases: ["bisiklet parçası", "bisiklet yedek parça"],
    attributeFields: {},
  },
};

export type ProductAttributes = Readonly<Record<string, string | number | boolean>>;

export type ValidatedProductSelection = {
  productType: ProductType | null;
  productAttributesVersion: typeof PRODUCT_ATTRIBUTES_VERSION | null;
  productAttributes: ProductAttributes;
};

function attributesSchema(definition: ProductTypeDefinition) {
  return z.object(optionalFields(definition.attributeFields)).strict();
}

export function getProductTypesForCategory(category: Stage1Category): readonly ProductType[] {
  return PRODUCT_TYPES.filter((productType) => PRODUCT_TYPE_REGISTRY[productType].category === category);
}

export function isProductTypeCompatible(
  category: Stage1Category,
  productType: ProductType | null,
): boolean {
  return productType === null || PRODUCT_TYPE_REGISTRY[productType].category === category;
}

export function validateProductSelection(input: {
  category: Stage1Category;
  productType: unknown;
  productAttributesVersion?: unknown;
  productAttributes?: unknown;
}): ValidatedProductSelection {
  const rawType = input.productType;
  if (rawType === null || rawType === undefined || rawType === "") {
    const rawAttributes = input.productAttributes ?? {};
    if (
      input.productAttributesVersion !== null &&
      input.productAttributesVersion !== undefined &&
      input.productAttributesVersion !== ""
    ) {
      throw new Error("Product attributes version requires a product type.");
    }
    if (
      typeof rawAttributes !== "object" ||
      rawAttributes === null ||
      Array.isArray(rawAttributes) ||
      Object.keys(rawAttributes).length !== 0
    ) {
      throw new Error("Product attributes require a product type.");
    }
    return { productType: null, productAttributesVersion: null, productAttributes: {} };
  }

  const productType = productTypeSchema.parse(rawType);
  if (!isProductTypeCompatible(input.category, productType)) {
    throw new Error("Product type is incompatible with category.");
  }

  const version =
    input.productAttributesVersion === undefined || input.productAttributesVersion === null
      ? PRODUCT_ATTRIBUTES_VERSION
      : z.literal(PRODUCT_ATTRIBUTES_VERSION).parse(Number(input.productAttributesVersion));
  const parsedAttributes = attributesSchema(PRODUCT_TYPE_REGISTRY[productType]).parse(
    input.productAttributes ?? {},
  ) as ProductAttributes;

  return {
    productType,
    productAttributesVersion: version,
    productAttributes: parsedAttributes,
  };
}

export function transitionProductSelection(input: {
  previousCategory: Stage1Category;
  previousProductType: ProductType | null;
  previousAttributes: ProductAttributes;
  nextCategory: Stage1Category;
  nextProductType: ProductType | null;
}): ValidatedProductSelection & { complianceMustBeReevaluated: boolean } {
  if (!isProductTypeCompatible(input.nextCategory, input.nextProductType)) {
    throw new Error("Product type is incompatible with the next category.");
  }

  const categoryChanged = input.previousCategory !== input.nextCategory;
  const typeChanged = input.previousProductType !== input.nextProductType;
  const regulated = (category: Stage1Category) =>
    category === "vehicle" || category === "real-estate";
  const complianceMustBeReevaluated =
    categoryChanged && (regulated(input.previousCategory) || regulated(input.nextCategory));

  if (input.nextProductType === null) {
    return {
      productType: null,
      productAttributesVersion: null,
      productAttributes: {},
      complianceMustBeReevaluated,
    };
  }

  if (categoryChanged || typeChanged) {
    return {
      productType: input.nextProductType,
      productAttributesVersion: PRODUCT_ATTRIBUTES_VERSION,
      productAttributes: {},
      complianceMustBeReevaluated,
    };
  }

  const definition = PRODUCT_TYPE_REGISTRY[input.nextProductType];
  const retained: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(input.previousAttributes)) {
    const fieldSchema = definition.attributeFields[key];
    if (!fieldSchema) continue;
    const parsed = fieldSchema.safeParse(value);
    if (parsed.success) retained[key] = parsed.data as string | number | boolean;
  }

  return {
    productType: input.nextProductType,
    productAttributesVersion: PRODUCT_ATTRIBUTES_VERSION,
    productAttributes: retained,
    complianceMustBeReevaluated,
  };
}

function addKeyword(target: string[], seen: Set<string>, raw: unknown): void {
  if (typeof raw !== "string" && typeof raw !== "number") return;
  const value = String(raw).trim();
  if (!value || value.length > 120) return;
  const key = value.toLocaleLowerCase("tr-TR");
  if (seen.has(key) || target.length >= 40) return;
  seen.add(key);
  target.push(value);
}

const CATEGORY_SEARCH_ALIASES: Partial<Record<Stage1Category, readonly string[]>> = {
  vehicle: ["vasıta", "araç"],
  "real-estate": ["emlak"],
  electronics: ["elektronik"],
  home: ["ev ve yaşam"],
  fashion: ["giyim", "aksesuar"],
  "hobby-sports": ["hobi", "spor"],
  "baby-kids": ["bebek", "çocuk"],
};

export function generateSystemSearchKeywords(input: {
  category: Stage1Category;
  productType: ProductType | null;
  productAttributes: ProductAttributes;
}): string[] {
  const output: string[] = [];
  const seen = new Set<string>();
  for (const alias of CATEGORY_SEARCH_ALIASES[input.category] ?? []) {
    addKeyword(output, seen, alias);
  }

  if (input.productType) {
    const definition = PRODUCT_TYPE_REGISTRY[input.productType];
    for (const alias of definition.aliases) addKeyword(output, seen, alias);
    for (const [key, value] of Object.entries(input.productAttributes)) {
      if (definition.attributeFields[key]) addKeyword(output, seen, value);
    }
  }
  return output;
}

export const SEARCH_SORTS = ["relevance", "newest", "price_asc", "price_desc"] as const;
export const searchSortSchema = z.enum(SEARCH_SORTS);
export type SearchSort = z.infer<typeof searchSortSchema>;

const facetValueSchema = z.union([
  z.string().trim().min(1).max(120),
  z.number().finite(),
  z.boolean(),
]);
export const searchRequestV1Schema = z.object({
  version: z.literal(1),
  q: z.string().max(200).default(""),
  category: z
    .enum([
      "vehicle",
      "real-estate",
      "electronics",
      "home",
      "fashion",
      "hobby-sports",
      "baby-kids",
      "other",
    ])
    .nullable()
    .default(null),
  productType: productTypeSchema.nullable().default(null),
  location: z
    .object({
      province: z.string().trim().min(2).max(64).nullable(),
      district: z.string().trim().min(2).max(64).nullable(),
    })
    .default({ province: null, district: null }),
  price: z
    .object({ min: z.number().min(0).nullable(), max: z.number().min(0).nullable() })
    .default({ min: null, max: null }),
  contextual: z.record(z.array(facetValueSchema).min(1).max(20)).default({}),
  sort: searchSortSchema.default("relevance"),
});

export type SearchRequestV1 = z.infer<typeof searchRequestV1Schema>;

export const SEARCH_REQUEST_V1_PRECEDENCE = [
  "legal_compliance_gate",
  "explicit_user_scope_filter",
  "validated_structured_listing_data",
  "high_confidence_inferred_intent",
  "free_text_relevance",
  "sort",
] as const;

export function parseSearchRequestV1(input: unknown): SearchRequestV1 {
  const request = searchRequestV1Schema.parse(input);
  if (
    request.price.min !== null &&
    request.price.max !== null &&
    request.price.min > request.price.max
  ) {
    throw new Error("Minimum price cannot exceed maximum price.");
  }
  if (request.productType !== null) {
    if (
      request.category === null ||
      !isProductTypeCompatible(request.category, request.productType)
    ) {
      throw new Error("Search product type requires its compatible category.");
    }
  }
  if (Object.keys(request.contextual).length > 0) {
    if (request.productType === null) {
      throw new Error("Contextual filters require a product type.");
    }
    const definition = PRODUCT_TYPE_REGISTRY[request.productType];
    for (const [key, values] of Object.entries(request.contextual)) {
      const fieldSchema = definition.attributeFields[key];
      if (!fieldSchema) throw new Error(`Unknown contextual filter: ${key}`);
      for (const value of values) fieldSchema.parse(value);
    }
  }
  return request;
}

export function transitionSearchRequestScope(
  request: SearchRequestV1,
  next: { category: Stage1Category | null; productType: ProductType | null },
): SearchRequestV1 {
  if (next.productType !== null) {
    if (next.category === null || !isProductTypeCompatible(next.category, next.productType)) {
      throw new Error("Product type is incompatible with search category.");
    }
  }
  const contextualCompatible =
    request.category === next.category && request.productType === next.productType;
  return parseSearchRequestV1({
    ...request,
    category: next.category,
    productType: next.productType,
    contextual: contextualCompatible ? request.contextual : {},
  });
}

export type StructuredSearchListing = {
  category: Stage1Category;
  productType: ProductType | null;
  productAttributes: ProductAttributes;
  price: number;
  province: string;
  district: string;
};

function facetValuesEqual(left: unknown, right: unknown): boolean {
  return typeof left === typeof right && left === right;
}

export function listingMatchesStructuredFilters(
  listing: StructuredSearchListing,
  request: SearchRequestV1,
): boolean {
  if (request.category !== null && listing.category !== request.category) return false;
  if (request.productType !== null && listing.productType !== request.productType) return false;
  if (request.location.province !== null && listing.province !== request.location.province) {
    return false;
  }
  if (request.location.district !== null && listing.district !== request.location.district) {
    return false;
  }
  if (request.price.min !== null && listing.price < request.price.min) return false;
  if (request.price.max !== null && listing.price > request.price.max) return false;

  for (const [facet, acceptedValues] of Object.entries(request.contextual)) {
    const listingValue = listing.productAttributes[facet];
    if (listingValue === undefined || listingValue === null) return false;
    if (!acceptedValues.some((value) => facetValuesEqual(listingValue, value))) return false;
  }
  return true;
}
