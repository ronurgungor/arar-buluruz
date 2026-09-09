import { useEffect, useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { getDistrictsForCity, locationCities } from "@/data/turkiye-locations";
import {
  parseSearchRequestV1,
  transitionSearchRequestScope,
  type ContextualFacetFilter,
  type ProductType,
  type SearchRequestV1,
} from "@/lib/product-finding-contract";
import {
  formatProductFieldValue,
  getBuyerFacetFields,
  getProductTypeUiOptions,
  type BuyerFacetFieldUiDefinition,
} from "@/lib/product-finding-ui-contract";
import type { ListingView } from "@/lib/public-listings-supabase";
import {
  STAGE1_CATEGORIES,
  STAGE1_CATEGORY_LABELS,
  type Stage1Category,
} from "@/lib/stage1-self-service-contract";

const inputClass =
  "h-12 w-full rounded-xl border border-border bg-card px-3 text-base outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10";
const selectClass = `${inputClass} appearance-none`;

type RangeDraft = { min: string; max: string };

type ProductFindingFilterSheetProps = {
  request: SearchRequestV1;
  listings: readonly ListingView[];
  onApply: (request: SearchRequestV1) => void;
};

function rangeDraftsFromRequest(request: SearchRequestV1): Record<string, RangeDraft> {
  const output: Record<string, RangeDraft> = {};
  for (const [key, filter] of Object.entries(request.contextual)) {
    if (Array.isArray(filter)) continue;
    output[key] = {
      min: filter.min === null ? "" : String(filter.min),
      max: filter.max === null ? "" : String(filter.max),
    };
  }
  return output;
}

function optionalNumber(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) throw new Error("Geçerli bir sayı girin.");
  return parsed;
}

function valueIdentity(value: string | number | boolean): string {
  return `${typeof value}:${String(value)}`;
}

function availableFacetValues(
  listings: readonly ListingView[],
  productType: ProductType,
  field: BuyerFacetFieldUiDefinition,
): Array<string | number | boolean> {
  const seen = new Map<string, string | number | boolean>();
  for (const listing of listings) {
    if (listing.productType !== productType) continue;
    const value = listing.productAttributes[field.key];
    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
      continue;
    }
    seen.set(valueIdentity(value), value);
  }
  return [...seen.values()].sort((left, right) => {
    if (typeof left === "number" && typeof right === "number") return left - right;
    return String(left).localeCompare(String(right), "tr-TR", { numeric: true });
  });
}

function choiceLabel(field: BuyerFacetFieldUiDefinition, value: string | number | boolean): string {
  return (
    field.choices?.find((choice) => choice.value === value)?.label ??
    formatProductFieldValue(field, value) ??
    String(value)
  );
}

function FilterSectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{children}</h3>
  );
}

function MultiFacetChoices({
  field,
  values,
  selected,
  onToggle,
}: {
  field: BuyerFacetFieldUiDefinition;
  values: Array<string | number | boolean>;
  selected: Array<string | number | boolean>;
  onToggle: (value: string | number | boolean) => void;
}) {
  if (values.length === 0) {
    return <p className="text-xs text-muted-foreground">Bu özellik için uygun ilan değeri yok.</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => {
        const selectedNow = selected.some((item) => valueIdentity(item) === valueIdentity(value));
        return (
          <button
            key={valueIdentity(value)}
            type="button"
            aria-pressed={selectedNow}
            onClick={() => onToggle(value)}
            className={`min-h-11 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
              selectedNow
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:bg-accent"
            }`}
          >
            {choiceLabel(field, value)}
          </button>
        );
      })}
    </div>
  );
}

export function countProductFindingActiveFilters(request: SearchRequestV1): number {
  let count = 0;
  if (request.location.province !== null) count += 1;
  if (request.location.district !== null) count += 1;
  if (request.price.min !== null || request.price.max !== null) count += 1;
  if (request.category !== null) count += 1;
  if (request.productType !== null) count += 1;
  count += Object.keys(request.contextual).length;
  return count;
}

export function ProductFindingFilterSheet({
  request,
  listings,
  onApply,
}: ProductFindingFilterSheetProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(request);
  const [priceMin, setPriceMin] = useState(
    request.price.min === null ? "" : String(request.price.min),
  );
  const [priceMax, setPriceMax] = useState(
    request.price.max === null ? "" : String(request.price.max),
  );
  const [ranges, setRanges] = useState<Record<string, RangeDraft>>(rangeDraftsFromRequest(request));
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) return;
    setDraft(request);
    setPriceMin(request.price.min === null ? "" : String(request.price.min));
    setPriceMax(request.price.max === null ? "" : String(request.price.max));
    setRanges(rangeDraftsFromRequest(request));
    setError("");
  }, [open, request]);

  const districts = useMemo(
    () => (draft.location.province ? getDistrictsForCity(draft.location.province) : []),
    [draft.location.province],
  );
  const productTypes = draft.category ? getProductTypeUiOptions(draft.category) : [];
  const facets = getBuyerFacetFields(draft.productType);
  const activeCount = countProductFindingActiveFilters(request);

  const changeCategory = (nextCategory: Stage1Category | null) => {
    try {
      const transitioned = transitionSearchRequestScope(draft, {
        category: nextCategory,
        productType: null,
      });
      setDraft(transitioned);
      setRanges(rangeDraftsFromRequest(transitioned));
      setError("");
    } catch {
      setError("Kategori filtresi uygulanamadı.");
    }
  };

  const changeProductType = (nextProductType: ProductType | null) => {
    try {
      const transitioned = transitionSearchRequestScope(draft, {
        category: draft.category,
        productType: nextProductType,
      });
      setDraft(transitioned);
      setRanges(rangeDraftsFromRequest(transitioned));
      setError("");
    } catch {
      setError("Ürün tipi filtresi uygulanamadı.");
    }
  };

  const toggleMultiValue = (key: string, value: string | number | boolean) => {
    const current = draft.contextual[key];
    const values = Array.isArray(current) ? current : [];
    const exists = values.some((item) => valueIdentity(item) === valueIdentity(value));
    const nextValues = exists
      ? values.filter((item) => valueIdentity(item) !== valueIdentity(value))
      : [...values, value];
    const contextual = { ...draft.contextual };
    if (nextValues.length === 0) delete contextual[key];
    else contextual[key] = nextValues;
    setDraft({ ...draft, contextual });
    setError("");
  };

  const clearFilters = () => {
    const cleared = parseSearchRequestV1({
      version: 1,
      q: draft.q,
      sort: draft.sort,
    });
    setDraft(cleared);
    setPriceMin("");
    setPriceMax("");
    setRanges({});
    setError("");
  };

  const apply = () => {
    try {
      const contextual: Record<string, ContextualFacetFilter> = { ...draft.contextual };
      for (const field of facets) {
        if (field.buyerFacetMode !== "range") continue;
        const range = ranges[field.key] ?? { min: "", max: "" };
        const min = optionalNumber(range.min);
        const max = optionalNumber(range.max);
        if (min === null && max === null) delete contextual[field.key];
        else contextual[field.key] = { min, max };
      }
      const parsed = parseSearchRequestV1({
        ...draft,
        price: { min: optionalNumber(priceMin), max: optionalNumber(priceMax) },
        contextual,
      });
      onApply(parsed);
      setOpen(false);
      setError("");
    } catch {
      setError("Min/max değerlerini ve seçili filtreleri kontrol edin.");
    }
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button
          type="button"
          data-testid="product-finding-filter-trigger"
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-semibold shadow-sm transition-colors hover:bg-accent"
        >
          <SlidersHorizontal aria-hidden className="h-4 w-4" />
          Filtreler
          {activeCount > 0 ? (
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
              {activeCount}
            </span>
          ) : null}
        </button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle>Filtreler</DrawerTitle>
          <DrawerDescription>
            Yalnız ihtiyacın olan alanları seç; boş olanlar filtrelenmez.
          </DrawerDescription>
        </DrawerHeader>
        <div
          data-testid="product-finding-filter-scroll"
          className="min-h-0 flex-1 overflow-y-auto px-4 pb-4"
        >
          <div className="mx-auto w-full max-w-md space-y-6">
            {error ? (
              <p
                role="alert"
                className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
              >
                {error}
              </p>
            ) : null}

            <section className="space-y-2">
              <FilterSectionTitle>Konum</FilterSectionTitle>
              <select
                aria-label="Filtre il"
                value={draft.location.province ?? ""}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    location: {
                      province: event.target.value || null,
                      district: null,
                    },
                  })
                }
                className={selectClass}
              >
                <option value="">Tüm Türkiye</option>
                {locationCities.slice(1).map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filtre ilçe"
                value={draft.location.district ?? ""}
                disabled={draft.location.province === null}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    location: { ...draft.location, district: event.target.value || null },
                  })
                }
                className={selectClass}
              >
                <option value="">Tüm ilçeler</option>
                {districts.map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </select>
            </section>

            <section className="space-y-2">
              <FilterSectionTitle>Fiyat (TL)</FilterSectionTitle>
              <div className="grid grid-cols-2 gap-2">
                <input
                  aria-label="Minimum fiyat"
                  inputMode="decimal"
                  placeholder="Min"
                  value={priceMin}
                  onChange={(event) => setPriceMin(event.target.value)}
                  className={inputClass}
                />
                <input
                  aria-label="Maksimum fiyat"
                  inputMode="decimal"
                  placeholder="Max"
                  value={priceMax}
                  onChange={(event) => setPriceMax(event.target.value)}
                  className={inputClass}
                />
              </div>
            </section>

            <section className="space-y-2">
              <FilterSectionTitle>Kategori</FilterSectionTitle>
              <select
                aria-label="Filtre kategori"
                value={draft.category ?? ""}
                onChange={(event) =>
                  changeCategory(event.target.value ? (event.target.value as Stage1Category) : null)
                }
                className={selectClass}
              >
                <option value="">Tüm kategoriler</option>
                {STAGE1_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {STAGE1_CATEGORY_LABELS[category]}
                  </option>
                ))}
              </select>
            </section>

            {productTypes.length > 0 ? (
              <section className="space-y-2">
                <FilterSectionTitle>Ürün tipi</FilterSectionTitle>
                <div className="flex flex-wrap gap-2">
                  {productTypes.map((option) => {
                    const selected = draft.productType === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => changeProductType(selected ? null : option.value)}
                        className={`min-h-11 rounded-full border px-4 py-2 text-sm font-semibold ${
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card hover:bg-accent"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {draft.productType
              ? facets.map((field) => {
                  if (field.buyerFacetMode === "range") {
                    const range = ranges[field.key] ?? { min: "", max: "" };
                    return (
                      <section key={field.key} className="space-y-2">
                        <FilterSectionTitle>
                          {field.label}
                          {field.unit ? ` (${field.unit})` : ""}
                        </FilterSectionTitle>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            aria-label={`${field.label} minimum`}
                            inputMode="decimal"
                            placeholder="Min"
                            value={range.min}
                            onChange={(event) =>
                              setRanges({
                                ...ranges,
                                [field.key]: { ...range, min: event.target.value },
                              })
                            }
                            className={inputClass}
                          />
                          <input
                            aria-label={`${field.label} maksimum`}
                            inputMode="decimal"
                            placeholder="Max"
                            value={range.max}
                            onChange={(event) =>
                              setRanges({
                                ...ranges,
                                [field.key]: { ...range, max: event.target.value },
                              })
                            }
                            className={inputClass}
                          />
                        </div>
                      </section>
                    );
                  }

                  const available = availableFacetValues(listings, draft.productType!, field);
                  const current = draft.contextual[field.key];
                  const selected = Array.isArray(current) ? current : [];
                  return (
                    <section key={field.key} className="space-y-2">
                      <FilterSectionTitle>{field.label}</FilterSectionTitle>
                      <MultiFacetChoices
                        field={field}
                        values={available}
                        selected={selected}
                        onToggle={(value) => toggleMultiValue(field.key, value)}
                      />
                    </section>
                  );
                })
              : null}
          </div>
        </div>
        <DrawerFooter className="border-t border-border bg-background">
          <div className="mx-auto grid w-full max-w-md grid-cols-[auto_minmax(0,1fr)] gap-2">
            <button
              type="button"
              onClick={clearFilters}
              className="h-12 rounded-full border border-border px-5 text-sm font-semibold hover:bg-accent"
            >
              Temizle
            </button>
            <button
              type="button"
              onClick={apply}
              className="h-12 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground hover:bg-primary/90"
            >
              Sonuçları göster
            </button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
