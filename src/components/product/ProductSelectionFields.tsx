import { ChevronDown } from "lucide-react";
import {
  transitionProductSelection,
  type ProductAttributes,
  type ProductType,
} from "@/lib/product-finding-contract";
import {
  getProductTypeUiOptions,
  getSellerProductFields,
  type ProductFieldChoice,
} from "@/lib/product-finding-ui-contract";
import type { Stage1Category } from "@/lib/stage1-self-service-contract";

const fieldClass =
  "h-12 w-full rounded-xl border border-border bg-card px-4 text-base outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10";
const selectClass = `${fieldClass} appearance-none pr-10`;

type ProductSelectionFieldsProps = {
  category: Stage1Category | "";
  productType: ProductType | null;
  attributes: ProductAttributes;
  onChange: (next: { productType: ProductType | null; attributes: ProductAttributes }) => void;
  idPrefix: string;
};

function resolveChoiceValue(choice: ProductFieldChoice): string | number {
  return choice.value;
}

export function ProductSelectionFields({
  category,
  productType,
  attributes,
  onChange,
  idPrefix,
}: ProductSelectionFieldsProps) {
  if (!category) return null;
  const productTypes = getProductTypeUiOptions(category);
  if (productTypes.length === 0) return null;
  const fields = getSellerProductFields(productType);

  const updateAttribute = (key: string, value: string | number | null) => {
    const next = { ...attributes };
    if (value === null || value === "") delete next[key];
    else next[key] = value;
    onChange({ productType, attributes: next });
  };

  const changeProductType = (nextProductType: ProductType | null) => {
    const transitioned = transitionProductSelection({
      previousCategory: category,
      previousProductType: productType,
      previousAttributes: attributes,
      nextCategory: category,
      nextProductType,
    });
    onChange({
      productType: transitioned.productType,
      attributes: transitioned.productAttributes,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor={`${idPrefix}-product-type`} className="text-sm font-semibold">
          Ürün tipi
        </label>
        <span className="ml-1 text-xs font-normal text-muted-foreground">(isteğe bağlı)</span>
        <div className="relative mt-1.5">
          <select
            id={`${idPrefix}-product-type`}
            aria-label="Ürün tipi"
            value={productType ?? ""}
            onChange={(event) =>
              changeProductType(event.target.value ? (event.target.value as ProductType) : null)
            }
            className={selectClass}
          >
            <option value="">Ürün tipi belirtme</option>
            {productTypes.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden
            className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
        </div>
      </div>

      {productType && fields.length > 0 ? (
        <div className="rounded-2xl border border-border bg-background/60 p-4">
          <div>
            <p className="text-sm font-bold">Ürün özellikleri</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Bildiğin özellikleri ekle. Hepsini doldurman gerekmez.
            </p>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {fields.map((field) => {
              const id = `${idPrefix}-${field.key}`;
              const current = attributes[field.key];
              if (field.input === "select") {
                return (
                  <label key={field.key} htmlFor={id} className="block">
                    <span className="text-sm font-medium">{field.label}</span>
                    <div className="relative mt-1">
                      <select
                        id={id}
                        aria-label={field.label}
                        value={current === undefined ? "" : String(current)}
                        onChange={(event) => {
                          if (!event.target.value) {
                            updateAttribute(field.key, null);
                            return;
                          }
                          const selected = field.choices?.find(
                            (choice) => String(choice.value) === event.target.value,
                          );
                          updateAttribute(
                            field.key,
                            selected ? resolveChoiceValue(selected) : event.target.value,
                          );
                        }}
                        className={selectClass}
                      >
                        <option value="">Belirtme</option>
                        {field.choices?.map((choice) => (
                          <option key={String(choice.value)} value={String(choice.value)}>
                            {choice.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        aria-hidden
                        className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                      />
                    </div>
                  </label>
                );
              }

              return (
                <label key={field.key} htmlFor={id} className="block">
                  <span className="text-sm font-medium">
                    {field.label}
                    {field.unit ? (
                      <span className="font-normal text-muted-foreground"> ({field.unit})</span>
                    ) : null}
                  </span>
                  <input
                    id={id}
                    aria-label={field.label}
                    type={field.input === "number" ? "number" : "text"}
                    inputMode={field.input === "number" ? "decimal" : undefined}
                    step={field.step}
                    placeholder={field.placeholder}
                    value={current === undefined ? "" : String(current)}
                    onChange={(event) => {
                      const raw = event.target.value;
                      if (!raw) {
                        updateAttribute(field.key, null);
                        return;
                      }
                      if (field.input === "number") {
                        const numeric = Number(raw);
                        if (Number.isFinite(numeric)) updateAttribute(field.key, numeric);
                        return;
                      }
                      updateAttribute(field.key, raw);
                    }}
                    className={`mt-1 ${fieldClass}`}
                  />
                </label>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
