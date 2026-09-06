import { readFileSync, writeFileSync } from "node:fs";

function read(path: string): string {
  return readFileSync(path, "utf8");
}

function write(path: string, text: string): void {
  writeFileSync(path, text, "utf8");
}

function replaceOnce(path: string, before: string, after: string): void {
  const source = read(path);
  const count = source.split(before).length - 1;
  if (count === 0 && source.includes(after)) return;
  if (count !== 1) throw new Error(`${path}: expected one replacement target, found ${count}`);
  write(path, source.replace(before, after));
}

const createRoute = "src/routes-pilot/ilan-ver.tsx";
replaceOnce(
  createRoute,
  'import { PilotTopBar } from "@/build-profiles/pilot/PilotTopBar";\nimport { getDistrictsForCity, locationCities } from "@/data/turkiye-locations";',
  'import { PilotTopBar } from "@/build-profiles/pilot/PilotTopBar";\nimport { ProductSelectionFields } from "@/components/product/ProductSelectionFields";\nimport { getDistrictsForCity, locationCities } from "@/data/turkiye-locations";\nimport { transitionProductSelection, type ProductAttributes, type ProductType } from "@/lib/product-finding-contract";\nimport { appendStage1ProductFields } from "@/lib/stage1-product-fields";',
);
replaceOnce(
  createRoute,
  '  const [category, setCategory] = useState<Stage1Category | "">("");\n  const [title, setTitle] = useState("");',
  '  const [category, setCategory] = useState<Stage1Category | "">("");\n  const [productType, setProductType] = useState<ProductType | null>(null);\n  const [productAttributes, setProductAttributes] = useState<ProductAttributes>({});\n  const [title, setTitle] = useState("");',
);
replaceOnce(
  createRoute,
  "  const validateCurrentStep = (): boolean => {",
  `  const changeCategory = (nextCategory: Stage1Category | "") => {
    if (nextCategory === category) return;
    if (!nextCategory || !category) {
      setCategory(nextCategory);
      setProductType(null);
      setProductAttributes({});
      return;
    }
    const transitioned = transitionProductSelection({
      previousCategory: category,
      previousProductType: productType,
      previousAttributes: productAttributes,
      nextCategory,
      nextProductType: null,
    });
    setCategory(nextCategory);
    setProductType(transitioned.productType);
    setProductAttributes(transitioned.productAttributes);
  };

  const validateCurrentStep = (): boolean => {`,
);
replaceOnce(
  createRoute,
  `  const buildSubmissionForm = () => {
    const form = new FormData();
    form.set("action", "submit_listing");
    form.set("category", category);
    form.set("title", title.trim());`,
  `  const buildSubmissionForm = () => {
    if (!category) throw new Error("Category is required before submission.");
    const form = new FormData();
    form.set("action", "submit_listing");
    form.set("category", category);
    appendStage1ProductFields(form, { category, productType, productAttributes });
    form.set("title", title.trim());`,
);
replaceOnce(
  createRoute,
  "                    onChange={(event) => setCategory(event.target.value as Stage1Category)}",
  '                    onChange={(event) => changeCategory(event.target.value as Stage1Category | "")}',
);
replaceOnce(
  createRoute,
  `              <div className="block">
                <label htmlFor="stage1-title" className="text-sm font-semibold">`,
  `              <ProductSelectionFields
                category={category}
                productType={productType}
                attributes={productAttributes}
                idPrefix="stage1-product"
                onChange={(next) => {
                  setProductType(next.productType);
                  setProductAttributes(next.attributes);
                }}
              />
              <div className="block">
                <label htmlFor="stage1-title" className="text-sm font-semibold">`,
);

const editRoute = "src/routes-pilot/ilanlarim.tsx";
replaceOnce(
  editRoute,
  'import { PilotTopBar } from "@/build-profiles/pilot/PilotTopBar";\nimport { getDistrictsForCity, locationCities } from "@/data/turkiye-locations";',
  'import { PilotTopBar } from "@/build-profiles/pilot/PilotTopBar";\nimport { ProductSelectionFields } from "@/components/product/ProductSelectionFields";\nimport { getDistrictsForCity, locationCities } from "@/data/turkiye-locations";\nimport { PRODUCT_ATTRIBUTES_VERSION, transitionProductSelection } from "@/lib/product-finding-contract";\nimport { appendStage1ProductFields } from "@/lib/stage1-product-fields";',
);
replaceOnce(
  editRoute,
  '    form.set("listingId", editing.id);\n    form.set("category", editing.category);\n    if (editing.condition) form.set("condition", editing.condition);',
  '    form.set("listingId", editing.id);\n    form.set("category", editing.category);\n    appendStage1ProductFields(form, {\n      category: editing.category,\n      productType: editing.productType,\n      productAttributes: editing.productAttributes,\n    });\n    if (editing.condition) form.set("condition", editing.condition);',
);
replaceOnce(
  editRoute,
  `                    onChange={(event) =>
                      setEditing({ ...editing, category: event.target.value as Stage1Category })
                    }`,
  `                    onChange={(event) => {
                      const nextCategory = event.target.value as Stage1Category;
                      const transitioned = transitionProductSelection({
                        previousCategory: editing.category,
                        previousProductType: editing.productType,
                        previousAttributes: editing.productAttributes,
                        nextCategory,
                        nextProductType: null,
                      });
                      setEditing({
                        ...editing,
                        category: nextCategory,
                        productType: transitioned.productType,
                        productAttributesVersion: transitioned.productAttributesVersion,
                        productAttributes: transitioned.productAttributes,
                      });
                    }}`,
);
replaceOnce(
  editRoute,
  `            </div>
            <label className="block">
              <span className="text-sm font-medium">Fiyat (TL)</span>`,
  `            </div>
            <ProductSelectionFields
              category={editing.category}
              productType={editing.productType}
              attributes={editing.productAttributes}
              idPrefix="seller-edit-product"
              onChange={(next) =>
                setEditing({
                  ...editing,
                  productType: next.productType,
                  productAttributesVersion: next.productType ? PRODUCT_ATTRIBUTES_VERSION : null,
                  productAttributes: next.attributes,
                })
              }
            />
            <label className="block">
              <span className="text-sm font-medium">Fiyat (TL)</span>`,
);

const detailRoute = "src/routes-pilot/ilan.$id.tsx";
replaceOnce(
  detailRoute,
  'import { ALL_CITIES, ALL_DISTRICTS } from "@/lib/listing-search";\nimport { hasListingResultsHistory } from "@/lib/listing-return";',
  'import { parseSearchRequestV1 } from "@/lib/product-finding-contract";\nimport { serializeSearchRequestV1ToUrl } from "@/lib/product-finding-search-url";\nimport { hasListingResultsHistory } from "@/lib/listing-return";',
);
replaceOnce(
  detailRoute,
  '      search: { q: "", il: ALL_CITIES, ilce: ALL_DISTRICTS, sirala: "yeni" },',
  '      search: serializeSearchRequestV1ToUrl(parseSearchRequestV1({ version: 1, q: "", sort: "newest" })),',
);

const uiContract = "src/lib/product-finding-ui-contract.ts";
replaceOnce(
  uiContract,
  `  const text = String(value).trim();
  if (!text) return null;
  return field.unit ? \`${"${text}"} ${"${field.unit}"}\` : text;`,
  `  const text =
    typeof value === "number"
      ? new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(value)
      : String(value).trim();
  if (!text) return null;
  return field.unit ? \`${"${text}"} ${"${field.unit}"}\` : text;`,
);

const e2e = "scripts/stage1-self-service-browser-e2e.ts";
replaceOnce(
  e2e,
  `    contact_e164: string;
  }>
> {
  const url = new URL(\`${"${backendOrigin}"}/rest/v1/listings\`);
  url.searchParams.set("id", \`eq.${"${listingId}"}\`);
  url.searchParams.set("select", "id,title,price_is_free,province,district,contact_e164");`,
  `    contact_e164: string;
    product_type: string | null;
    product_attributes_version: number | null;
    product_attributes: Record<string, unknown>;
    search_keywords: string[];
  }>
> {
  const url = new URL(\`${"${backendOrigin}"}/rest/v1/listings\`);
  url.searchParams.set("id", \`eq.${"${listingId}"}\`);
  url.searchParams.set(
    "select",
    "id,title,price_is_free,province,district,contact_e164,product_type,product_attributes_version,product_attributes,search_keywords",
  );`,
);
replaceOnce(
  e2e,
  `    contact_e164: string;
  }>;
}`,
  `    contact_e164: string;
    product_type: string | null;
    product_attributes_version: number | null;
    product_attributes: Record<string, unknown>;
    search_keywords: string[];
  }>;
}`,
);
replaceOnce(
  e2e,
  `    withCondition?: boolean;
    withDescription?: boolean;
  },`,
  `    withCondition?: boolean;
    withDescription?: boolean;
    productType?: string;
    productAttributes?: Record<string, string | number>;
  },`,
);
replaceOnce(
  e2e,
  `  await page.getByLabel("Kategori", { exact: true }).selectOption("vehicle");
  await page.getByLabel("Başlık", { exact: true }).fill(input.title);`,
  `  await page.getByLabel("Kategori", { exact: true }).selectOption("vehicle");
  if (input.productType) {
    await page.getByLabel("Ürün tipi", { exact: true }).selectOption(input.productType);
    const attributes = input.productAttributes ?? {};
    const textFields: Record<string, string> = { make: "Marka", model: "Model" };
    const numberFields: Record<string, string> = { year: "Model yılı", km: "Kilometre" };
    const selectFields: Record<string, string> = {
      transmission: "Vites",
      fuel: "Yakıt",
      body_type: "Kasa tipi",
    };
    for (const [key, label] of Object.entries(textFields)) {
      const value = attributes[key];
      if (value !== undefined) await page.getByLabel(label, { exact: true }).fill(String(value));
    }
    for (const [key, label] of Object.entries(numberFields)) {
      const value = attributes[key];
      if (value !== undefined) await page.getByLabel(label, { exact: true }).fill(String(value));
    }
    for (const [key, label] of Object.entries(selectFields)) {
      const value = attributes[key];
      if (value !== undefined) await page.getByLabel(label, { exact: true }).selectOption(String(value));
    }
  }
  await page.getByLabel("Başlık", { exact: true }).fill(input.title);`,
);
replaceOnce(
  e2e,
  `    isFree: true,
    withCondition: false,
    withDescription: false,
  });`,
  `    isFree: true,
    withCondition: false,
    withDescription: false,
    productType: "automobile",
    productAttributes: {
      make: "Mercedes",
      model: "B 150",
      year: 2016,
      km: 118000,
      transmission: "automatic",
      fuel: "gasoline",
      body_type: "hatchback",
    },
  });`,
);
replaceOnce(
  e2e,
  `  assert(
    publicRows.length === 1 && publicRows[0]?.price_is_free === true,
    "Auto-published listing was not immediately public with Free state.",
  );`,
  `  assert(
    publicRows.length === 1 && publicRows[0]?.price_is_free === true,
    "Auto-published listing was not immediately public with Free state.",
  );
  assert(
    publicRows[0]?.product_type === "automobile" &&
      publicRows[0]?.product_attributes_version === 1 &&
      publicRows[0]?.product_attributes?.make === "Mercedes" &&
      publicRows[0]?.product_attributes?.year === 2016 &&
      publicRows[0]?.product_attributes?.km === 118000,
    "Structured seller fields were not persisted.",
  );
  assert(
    publicRows[0]?.search_keywords.includes("Mercedes") &&
      publicRows[0]?.search_keywords.includes("B 150"),
    "System search keywords were not derived from persisted structured fields.",
  );`,
);
replaceOnce(
  e2e,
  `  await buyerPage
    .getByRole("link", { name: new RegExp(title) })
    .first()
    .click();
  await buyerPage.waitForLoadState("networkidle");`,
  `  await buyerPage.goto(publicBaseUrl + "/ara?q=b150", { waitUntil: "networkidle" });
  await buyerPage.getByRole("button", { name: /^Filtreler/ }).click();
  await buyerPage.getByLabel("Filtre il", { exact: true }).selectOption("Tekirdağ");
  await buyerPage.getByLabel("Filtre ilçe", { exact: true }).selectOption("Çorlu");
  await buyerPage.getByLabel("Minimum fiyat", { exact: true }).fill("0");
  await buyerPage.getByLabel("Maksimum fiyat", { exact: true }).fill("5000");
  await buyerPage.getByLabel("Filtre kategori", { exact: true }).selectOption("vehicle");
  await buyerPage.getByRole("button", { name: "Otomobil", exact: true }).click();
  await buyerPage.getByLabel("Model yılı minimum", { exact: true }).fill("2010");
  await buyerPage.getByLabel("Model yılı maksimum", { exact: true }).fill("2020");
  await buyerPage.getByLabel("Kilometre maksimum", { exact: true }).fill("120000");
  await buyerPage.getByRole("button", { name: "Otomatik", exact: true }).click();
  await buyerPage.getByRole("button", { name: "Sonuçları göster", exact: true }).click();
  await buyerPage.getByRole("link", { name: new RegExp(title) }).first().waitFor();
  await buyerPage.getByText("2016 · 118.000 km · Otomatik", { exact: true }).waitFor();
  const filteredUrl = new URL(buyerPage.url());
  assert(filteredUrl.searchParams.get("q") === "b150", "Query was not retained in canonical URL state.");
  assert(filteredUrl.searchParams.get("category") === "vehicle", "Category was not serialized.");
  assert(filteredUrl.searchParams.get("productType") === "automobile", "Product type was not serialized.");
  assert(filteredUrl.searchParams.get("province") === "Tekirdağ", "Province was not serialized.");
  assert(filteredUrl.searchParams.get("district") === "Çorlu", "District was not serialized.");
  assert(filteredUrl.searchParams.get("priceMin") === "0", "Price min was not serialized.");
  assert(filteredUrl.searchParams.get("priceMax") === "5000", "Price max was not serialized.");
  const serializedContextual = JSON.parse(filteredUrl.searchParams.get("contextual") ?? "{}") as Record<string, unknown>;
  assert(
    JSON.stringify(serializedContextual.year) === JSON.stringify({ min: 2010, max: 2020 }) &&
      JSON.stringify(serializedContextual.km) === JSON.stringify({ min: null, max: 120000 }) &&
      JSON.stringify(serializedContextual.transmission) === JSON.stringify(["automatic"]),
    "Contextual filters were not serialized canonically.",
  );

  await buyerPage.getByRole("button", { name: /^Filtreler/ }).click();
  await buyerPage.getByLabel("Kilometre maksimum", { exact: true }).fill("100000");
  await buyerPage.getByRole("button", { name: "Sonuçları göster", exact: true }).click();
  await buyerPage.getByText("Sonuç bulunamadı", { exact: true }).waitFor();
  assert(
    (await buyerPage.getByRole("link", { name: new RegExp(title) }).count()) === 0,
    "Active numeric range was silently relaxed.",
  );
  await buyerPage.getByRole("button", { name: /^Filtreler/ }).click();
  await buyerPage.getByLabel("Kilometre maksimum", { exact: true }).fill("120000");
  await buyerPage.getByRole("button", { name: "Sonuçları göster", exact: true }).click();
  const filteredResult = buyerPage.getByRole("link", { name: new RegExp(title) }).first();
  await filteredResult.waitFor();
  await buyerPage.getByLabel("Sıralama", { exact: true }).selectOption("price_asc");
  await filteredResult.waitFor();
  assert(new URL(buyerPage.url()).searchParams.get("sort") === "price_asc", "Sort was not serialized.");

  await buyerPage.setViewportSize({ width: 390, height: 420 });
  await buyerPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const resultsScrollY = await buyerPage.evaluate(() => window.scrollY);
  assert(resultsScrollY > 0, "Search fixture was not scrollable for Back restoration proof.");
  const searchUrlBeforeDetail = buyerPage.url();
  await filteredResult.click();
  await buyerPage.waitForLoadState("networkidle");`,
);
replaceOnce(
  e2e,
  `  expectHref(
    await contactBar
      .getByRole("link", { name: "WhatsApp’tan yaz", exact: true })
      .getAttribute("href"),
    \`https://wa.me/${"${ownerPhone.slice(1)}"}\`,
  );

  await assertResponsiveRoute(`,
  `  expectHref(
    await contactBar
      .getByRole("link", { name: "WhatsApp’tan yaz", exact: true })
      .getAttribute("href"),
    \`https://wa.me/${"${ownerPhone.slice(1)}"}\`,
  );

  await buyerPage.getByTestId("results-back").click();
  await buyerPage.waitForURL(searchUrlBeforeDetail);
  await buyerPage.waitForFunction((expected) => Math.abs(window.scrollY - expected) <= 5, resultsScrollY);
  assert(buyerPage.url() === searchUrlBeforeDetail, "Back did not restore the exact search URL.");
  assert(
    Math.abs((await buyerPage.evaluate(() => window.scrollY)) - resultsScrollY) <= 5,
    "Back did not restore the previous results scroll position.",
  );

  await assertResponsiveRoute(`,
);
replaceOnce(
  e2e,
  `  await ownerCard.getByRole("button", { name: "Düzenle" }).click();
  await ownerPage.getByLabel("İlanlarım başlık").fill(\`${"${title}"} güncel\`);`,
  `  await ownerCard.getByRole("button", { name: "Düzenle" }).click();
  await ownerPage.getByLabel("İlanlarım başlık").fill(\`${"${title}"} güncel\`);
  await ownerPage.getByLabel("İlanlarım kategori", { exact: true }).selectOption("electronics");
  assert(
    (await ownerPage.getByLabel("Marka", { exact: true }).count()) === 0,
    "Category transition retained incompatible automobile attributes.",
  );
  await ownerPage.getByLabel("Ürün tipi", { exact: true }).selectOption("phone");
  await ownerPage.getByLabel("Marka", { exact: true }).fill("Samsung");
  await ownerPage.getByLabel("Model", { exact: true }).fill("Galaxy S21");
  await ownerPage.getByLabel("Depolama", { exact: true }).selectOption("256");`,
);
replaceOnce(
  e2e,
  `      updatedRows[0]?.district === "Kadıköy" &&
      updatedRows[0]?.contact_e164 === otherPhone,
    \`Seller edit did not reach public row: ${"${JSON.stringify(updatedRows)}"}\`,`,
  `      updatedRows[0]?.district === "Kadıköy" &&
      updatedRows[0]?.contact_e164 === otherPhone &&
      updatedRows[0]?.product_type === "phone" &&
      updatedRows[0]?.product_attributes_version === 1 &&
      updatedRows[0]?.product_attributes?.brand === "Samsung" &&
      updatedRows[0]?.product_attributes?.storage_gb === 256 &&
      updatedRows[0]?.product_attributes?.make === undefined,
    \`Seller edit did not transition/persist structured fields: ${"${JSON.stringify(updatedRows)}"}\`,`,
);
replaceOnce(
  e2e,
  '    "Stage 1 browser acceptance passed: opaque seller session + one-time recovery -> trusted auto-publication -> seller_id isolation/edit/phone-change/unpublish/sold/delete -> founder post-moderation takedown.",',
  '    "Stage 1 + Product Finding Phase 2 browser acceptance passed: structured seller create -> persisted/public adapter -> intent/scope -> multi/range filters -> sort/card -> detail/Back URL+scroll -> canonical seller edit transition -> ownership/takedown lifecycle.",',
);

const packagePath = "package.json";
replaceOnce(
  packagePath,
  "src/lib/product-finding-range-filters.test.ts src/lib/product-finding-ui-contract.test.ts",
  "src/lib/product-finding-range-filters.test.ts src/lib/product-finding-search-url.test.ts src/lib/product-finding-ui-contract.test.ts",
);

console.log("Product Finding Phase 2 seller/buyer wiring applied.");
