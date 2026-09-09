import type { ProductType } from "./product-finding-contract";

export type BuyerFacetMode = "multi" | "range";

export const BUYER_FACET_MODES: Readonly<
  Record<ProductType, Readonly<Record<string, BuyerFacetMode>>>
> = {
  automobile: {
    make: "multi",
    year: "range",
    km: "range",
    transmission: "multi",
    fuel: "multi",
    body_type: "multi",
  },
  "automobile-part": {},
  "automobile-accessory": {},
  housing: {
    offer_type: "multi",
    property_type: "multi",
    room_count: "multi",
    area_m2: "range",
  },
  phone: {
    brand: "multi",
    storage_gb: "multi",
  },
  "phone-accessory": {},
  wardrobe: {
    width_cm: "range",
    door_type: "multi",
  },
  shoes: {
    size_eu: "multi",
    target_group: "multi",
    brand: "multi",
  },
  bicycle: {
    bicycle_type: "multi",
    wheel_size_in: "multi",
    frame_size_cm: "multi",
  },
  "bicycle-part": {},
};

export function getBuyerFacetMode(productType: ProductType, key: string): BuyerFacetMode | null {
  return BUYER_FACET_MODES[productType][key] ?? null;
}
