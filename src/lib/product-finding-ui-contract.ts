import {
  PRODUCT_TYPE_REGISTRY,
  getProductTypesForCategory,
  type ProductAttributes,
  type ProductRole,
  type ProductType,
} from "./product-finding-contract";
import {
  getBuyerFacetMode,
  type BuyerFacetMode,
} from "./product-finding-buyer-facets";
import type { Stage1Category } from "./stage1-self-service-contract";

export type ProductFieldInputKind = "text" | "number" | "select";
export type ProductFieldChoice = Readonly<{ value: string | number; label: string }>;

export type ProductFieldUiDefinition = Readonly<{
  key: string;
  label: string;
  input: ProductFieldInputKind;
  placeholder?: string;
  unit?: string;
  step?: number;
  choices?: readonly ProductFieldChoice[];
  cardPriority?: number;
}>;

export type BuyerFacetFieldUiDefinition = ProductFieldUiDefinition &
  Readonly<{
    buyerFacetMode: BuyerFacetMode;
  }>;

const choice = (value: string | number, label: string): ProductFieldChoice => ({ value, label });

const PRODUCT_FIELD_UI: Record<ProductType, readonly ProductFieldUiDefinition[]> = {
  automobile: [
    { key: "make", label: "Marka", input: "text", placeholder: "Örn. Toyota" },
    { key: "model", label: "Model", input: "text", placeholder: "Örn. Corolla" },
    { key: "year", label: "Model yılı", input: "number", cardPriority: 1 },
    {
      key: "km",
      label: "Kilometre",
      input: "number",
      unit: "km",
      cardPriority: 2,
    },
    {
      key: "transmission",
      label: "Vites",
      input: "select",
      cardPriority: 3,
      choices: [
        choice("manual", "Manuel"),
        choice("automatic", "Otomatik"),
        choice("semi_automatic", "Yarı otomatik"),
      ],
    },
    {
      key: "fuel",
      label: "Yakıt",
      input: "select",
      choices: [
        choice("gasoline", "Benzin"),
        choice("diesel", "Dizel"),
        choice("lpg", "LPG"),
        choice("hybrid", "Hibrit"),
        choice("electric", "Elektrik"),
      ],
    },
    {
      key: "body_type",
      label: "Kasa tipi",
      input: "select",
      choices: [
        choice("sedan", "Sedan"),
        choice("hatchback", "Hatchback"),
        choice("station_wagon", "Station wagon"),
        choice("suv", "SUV"),
        choice("coupe", "Coupe"),
        choice("convertible", "Cabrio"),
        choice("pickup", "Pickup"),
        choice("van", "Van"),
        choice("other", "Diğer"),
      ],
    },
  ],
  "automobile-part": [],
  "automobile-accessory": [],
  housing: [
    {
      key: "offer_type",
      label: "İlan tipi",
      input: "select",
      cardPriority: 1,
      choices: [choice("sale", "Satılık"), choice("rent", "Kiralık")],
    },
    {
      key: "property_type",
      label: "Konut tipi",
      input: "select",
      choices: [
        choice("apartment", "Daire"),
        choice("detached_house", "Müstakil ev"),
        choice("residence", "Rezidans"),
        choice("villa", "Villa"),
        choice("other", "Diğer"),
      ],
    },
    {
      key: "room_count",
      label: "Oda sayısı",
      input: "select",
      cardPriority: 2,
      choices: [
        choice("studio", "Stüdyo"),
        choice("1+1", "1+1"),
        choice("2+1", "2+1"),
        choice("3+1", "3+1"),
        choice("4+1", "4+1"),
        choice("5+", "5+"),
        choice("other", "Diğer"),
      ],
    },
    {
      key: "area_m2",
      label: "Brüt alan",
      input: "number",
      unit: "m²",
      cardPriority: 3,
    },
  ],
  phone: [
    { key: "brand", label: "Marka", input: "text", placeholder: "Örn. Apple" },
    {
      key: "model",
      label: "Model",
      input: "text",
      placeholder: "Örn. iPhone 13",
    },
    {
      key: "storage_gb",
      label: "Depolama",
      input: "select",
      unit: "GB",
      cardPriority: 1,
      choices: [16, 32, 64, 128, 256, 512, 1024, 2048].map((value) =>
        choice(value, value >= 1024 ? `${value / 1024} TB` : `${value} GB`),
      ),
    },
  ],
  "phone-accessory": [],
  wardrobe: [
    {
      key: "width_cm",
      label: "Genişlik",
      input: "number",
      unit: "cm",
      cardPriority: 1,
    },
    {
      key: "height_cm",
      label: "Yükseklik",
      input: "number",
      unit: "cm",
      cardPriority: 2,
    },
    { key: "depth_cm", label: "Derinlik", input: "number", unit: "cm" },
    {
      key: "door_type",
      label: "Kapak tipi",
      input: "select",
      cardPriority: 3,
      choices: [
        choice("hinged", "Menteşeli"),
        choice("sliding", "Sürgülü"),
        choice("open", "Açık"),
      ],
    },
  ],
  shoes: [
    {
      key: "size_eu",
      label: "Numara",
      input: "number",
      step: 0.5,
      cardPriority: 1,
    },
    {
      key: "target_group",
      label: "Kullanım",
      input: "select",
      cardPriority: 2,
      choices: [
        choice("women", "Kadın"),
        choice("men", "Erkek"),
        choice("unisex", "Unisex"),
        choice("kids", "Çocuk"),
      ],
    },
    { key: "brand", label: "Marka", input: "text", placeholder: "Örn. Nike" },
  ],
  bicycle: [
    {
      key: "bicycle_type",
      label: "Bisiklet tipi",
      input: "select",
      cardPriority: 1,
      choices: [
        choice("city", "Şehir"),
        choice("mountain", "Dağ"),
        choice("road", "Yol"),
        choice("hybrid", "Hibrit"),
        choice("bmx", "BMX"),
        choice("electric", "Elektrikli"),
        choice("other", "Diğer"),
      ],
    },
    {
      key: "wheel_size_in",
      label: "Jant",
      input: "number",
      unit: "inç",
      step: 0.5,
      cardPriority: 2,
    },
    {
      key: "frame_size_cm",
      label: "Kadro",
      input: "number",
      unit: "cm",
      step: 0.5,
      cardPriority: 3,
    },
  ],
  "bicycle-part": [],
};

export type ProductTypeUiOption = Readonly<{
  value: ProductType;
  label: string;
  role: ProductRole;
}>;

export function getProductTypeUiOptions(category: Stage1Category): readonly ProductTypeUiOption[] {
  return getProductTypesForCategory(category).map((productType) => ({
    value: productType,
    label: PRODUCT_TYPE_REGISTRY[productType].label,
    role: PRODUCT_TYPE_REGISTRY[productType].role,
  }));
}

export function getSellerProductFields(
  productType: ProductType | null,
): readonly ProductFieldUiDefinition[] {
  return productType ? PRODUCT_FIELD_UI[productType] : [];
}

export function getBuyerFacetFields(
  productType: ProductType | null,
): readonly BuyerFacetFieldUiDefinition[] {
  if (!productType) return [];
  return getSellerProductFields(productType).flatMap((field) => {
    const buyerFacetMode = getBuyerFacetMode(productType, field.key);
    return buyerFacetMode ? [{ ...field, buyerFacetMode }] : [];
  });
}

export function formatProductFieldValue(
  field: ProductFieldUiDefinition,
  value: unknown,
): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const choiceLabel = field.choices?.find((item) => item.value === value)?.label;
  if (choiceLabel) return choiceLabel;
  const text = String(value).trim();
  if (!text) return null;
  return field.unit ? `${text} ${field.unit}` : text;
}

export function getListingContextFacts(
  productType: ProductType | null,
  attributes: ProductAttributes,
  limit = 3,
): string[] {
  if (!productType || limit < 1) return [];
  return PRODUCT_FIELD_UI[productType]
    .filter((field) => field.cardPriority !== undefined && attributes[field.key] !== undefined)
    .sort((left, right) => (left.cardPriority ?? 99) - (right.cardPriority ?? 99))
    .flatMap((field) => {
      const formatted = formatProductFieldValue(field, attributes[field.key]);
      return formatted ? [formatted] : [];
    })
    .slice(0, limit);
}

export function getProductFieldUiDefinition(
  productType: ProductType,
  key: string,
): ProductFieldUiDefinition | null {
  return PRODUCT_FIELD_UI[productType].find((field) => field.key === key) ?? null;
}
