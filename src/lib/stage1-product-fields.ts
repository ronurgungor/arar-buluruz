import {
  generateSystemSearchKeywords,
  transitionProductSelection,
  validateProductSelection,
  type ProductAttributes,
  type ProductType,
  type ValidatedProductSelection,
} from "./product-finding-contract";
import type { Stage1Category } from "./stage1-self-service-contract";

const PRODUCT_ATTRIBUTES_MAX_JSON_BYTES = 8192;

export class Stage1ProductInputError extends Error {
  constructor(message = "Structured product fields are invalid.") {
    super(message);
    this.name = "Stage1ProductInputError";
  }
}

function optionalText(form: FormData, key: string, max: number): string | null {
  const raw = form.get(key);
  if (raw === null) return null;
  if (typeof raw !== "string") throw new Stage1ProductInputError();
  const value = raw.trim();
  if (value.length > max) throw new Stage1ProductInputError();
  return value || null;
}

function readJsonObject(form: FormData): unknown {
  const raw = optionalText(form, "productAttributes", PRODUCT_ATTRIBUTES_MAX_JSON_BYTES);
  if (raw === null) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Stage1ProductInputError();
    }
    return parsed;
  } catch (error) {
    if (error instanceof Stage1ProductInputError) throw error;
    throw new Stage1ProductInputError();
  }
}

function normalizeSelection(
  input: Parameters<typeof validateProductSelection>[0],
): ValidatedProductSelection {
  try {
    return validateProductSelection(input);
  } catch {
    throw new Stage1ProductInputError();
  }
}

export function hasStage1ProductFields(form: FormData): boolean {
  return (
    form.has("productType") || form.has("productAttributesVersion") || form.has("productAttributes")
  );
}

export function parseStage1ProductFields(
  form: FormData,
  category: Stage1Category,
): ValidatedProductSelection & { searchKeywords: string[] } {
  const productType = optionalText(form, "productType", 64);
  const rawVersion = optionalText(form, "productAttributesVersion", 8);
  const selection = normalizeSelection({
    category,
    productType,
    productAttributesVersion: rawVersion === null ? undefined : Number(rawVersion),
    productAttributes: readJsonObject(form),
  });
  return {
    ...selection,
    searchKeywords: generateSystemSearchKeywords({
      category,
      productType: selection.productType,
      productAttributes: selection.productAttributes,
    }),
  };
}

export function parseStoredProductFields(input: {
  category: Stage1Category;
  productType: string | null;
  productAttributesVersion: number | string | null;
  productAttributes: unknown;
}): ValidatedProductSelection {
  return normalizeSelection({
    category: input.category,
    productType: input.productType,
    productAttributesVersion:
      input.productAttributesVersion === null ? null : Number(input.productAttributesVersion),
    productAttributes: input.productAttributes,
  });
}

export function transitionStoredProductFields(input: {
  previousCategory: Stage1Category;
  previousProductType: ProductType | null;
  previousAttributes: ProductAttributes;
  nextCategory: Stage1Category;
  requestedProductType?: ProductType | null;
}): ValidatedProductSelection & { searchKeywords: string[]; complianceMustBeReevaluated: boolean } {
  const nextProductType =
    input.requestedProductType === undefined
      ? input.previousCategory === input.nextCategory
        ? input.previousProductType
        : null
      : input.requestedProductType;
  let transitioned: ReturnType<typeof transitionProductSelection>;
  try {
    transitioned = transitionProductSelection({
      previousCategory: input.previousCategory,
      previousProductType: input.previousProductType,
      previousAttributes: input.previousAttributes,
      nextCategory: input.nextCategory,
      nextProductType,
    });
  } catch {
    throw new Stage1ProductInputError();
  }
  return {
    ...transitioned,
    searchKeywords: generateSystemSearchKeywords({
      category: input.nextCategory,
      productType: transitioned.productType,
      productAttributes: transitioned.productAttributes,
    }),
  };
}
