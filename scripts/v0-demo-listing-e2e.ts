import fs from "node:fs";
import path from "node:path";
import { chromium, type Page } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:4174";
const resultsDir = path.resolve("test-results/v0-pwa");
fs.mkdirSync(resultsDir, { recursive: true });

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function gotoOk(page: Page, route: string) {
  const url = new URL(route, baseUrl).toString();
  const response = await page.goto(url, { waitUntil: "domcontentloaded" });
  assert(response?.ok() === true, `${url} returned HTTP ${response?.status() ?? "unknown"}.`);
}

async function readPersistence(page: Page) {
  return page.evaluate(async () => ({
    localStorageKeys: Object.keys(localStorage),
    sessionStorageKeys: Object.keys(sessionStorage),
    indexedDbNames:
      typeof indexedDB.databases === "function"
        ? (await indexedDB.databases()).map((database) => database.name ?? "")
        : [],
  }));
}

async function assertNoHorizontalOverflow(page: Page, route: string) {
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  assert(
    dimensions.document <= dimensions.viewport,
    `${route} overflows horizontally: ${JSON.stringify(dimensions)}`,
  );
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

await context.addInitScript(() => {
  const probe = { created: 0, revoked: 0 };
  const originalCreateObjectURL = URL.createObjectURL.bind(URL);
  const originalRevokeObjectURL = URL.revokeObjectURL.bind(URL);

  Object.defineProperty(window, "__demoObjectUrlProbe", {
    value: probe,
    configurable: false,
    enumerable: false,
    writable: false,
  });

  URL.createObjectURL = (object: Blob | MediaSource) => {
    probe.created += 1;
    return originalCreateObjectURL(object);
  };
  URL.revokeObjectURL = (url: string) => {
    probe.revoked += 1;
    originalRevokeObjectURL(url);
  };
});

const page = await context.newPage();
page.setDefaultTimeout(15_000);
page.setDefaultNavigationTimeout(15_000);
let trackInteractionRequests = false;
const interactionRequests: string[] = [];
page.on("request", (request) => {
  if (!trackInteractionRequests) return;
  const url = request.url();
  if (!url.startsWith("http://") && !url.startsWith("https://")) return;
  interactionRequests.push(`${request.method()} ${url}`);
});

try {
  console.log("V0 demo listing: validating explicit zero-data UX");
  await gotoOk(page, "/ilan-ver");
  await page.getByRole("heading", { level: 1, name: "Demo ilan oluşturma" }).waitFor();
  await page
    .getByText(
      "Bu alan yalnızca uygulama deneyimini test etmek içindir. Girdiğiniz bilgiler kaydedilmez veya yayınlanmaz.",
      { exact: true },
    )
    .waitFor();

  assert((await page.locator("form").count()) === 1, "Public V0 demo listing form is missing.");
  assert((await page.getByLabel("Başlık").count()) === 1, "Demo title field is missing.");
  assert((await page.getByLabel("Fiyat (TL)").count()) === 1, "Demo price field is missing.");
  assert((await page.getByLabel("İl").count()) === 1, "Demo city field is missing.");
  assert((await page.getByLabel("İlçe").count()) === 1, "Demo district field is missing.");
  assert((await page.getByLabel("Açıklama").count()) === 1, "Demo description field is missing.");
  assert(
    (await page.getByTestId("demo-photo-input").count()) === 1,
    "Demo photo field is missing.",
  );
  assert(
    (await page.locator('input[type="email"], input[type="tel"]').count()) === 0,
    "Demo form exposed email or phone input.",
  );
  assert(
    (await page.getByText(/ad[- ]?soyad|kategori|satış bağlantısı/i).count()) === 0,
    "Demo form exposed a forbidden personal/category/external-sales field.",
  );
  assert(
    (await page.getByText(/ilan(?:ınız)? yayınlandı/i).count()) === 0,
    "Demo form contains misleading published language.",
  );

  const initialPersistence = await readPersistence(page);
  assert(
    initialPersistence.localStorageKeys.length === 0,
    "Demo route started with localStorage data.",
  );
  assert(
    initialPersistence.sessionStorageKeys.length === 0,
    "Demo route started with sessionStorage data.",
  );
  assert(initialPersistence.indexedDbNames.length === 0, "Demo route started with IndexedDB data.");

  console.log("V0 demo listing: validating back-navigation reset and object URL cleanup");
  await page.getByLabel("Başlık").fill("Geçici geri dönüş testi");
  await page.getByTestId("demo-photo-input").setInputFiles({
    name: "back-test.png",
    mimeType: "image/png",
    buffer: Buffer.from("local preview only"),
  });
  await page.getByAltText("Seçilen demo fotoğraf önizlemesi").waitFor();
  const firstPreviewSrc = await page
    .getByAltText("Seçilen demo fotoğraf önizlemesi")
    .getAttribute("src");
  assert(
    firstPreviewSrc?.startsWith("blob:") === true,
    "Demo photo preview was not browser-local blob data.",
  );
  await page.getByRole("link", { name: "Arar Buluruz ana sayfa" }).click();
  await page.waitForURL(new URL("/", baseUrl).toString());
  await page.goBack({ waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { level: 1, name: "Demo ilan oluşturma" }).waitFor();
  assert(
    (await page.getByLabel("Başlık").inputValue()) === "",
    "Back navigation restored demo title state.",
  );
  assert(
    (await page.getByAltText("Seçilen demo fotoğraf önizlemesi").count()) === 0,
    "Back navigation restored a demo photo preview.",
  );

  const backProbe = await page.evaluate(
    () =>
      (window as typeof window & { __demoObjectUrlProbe?: { created: number; revoked: number } })
        .__demoObjectUrlProbe,
  );
  assert(
    backProbe?.created === 1,
    `Expected one local object URL before back navigation: ${JSON.stringify(backProbe)}.`,
  );
  assert(
    (backProbe?.revoked ?? 0) >= 1,
    `Object URL was not revoked on navigation: ${JSON.stringify(backProbe)}.`,
  );

  console.log("V0 demo listing: rejecting oversized photo without network or preview allocation");
  const photoInput = page.getByTestId("demo-photo-input");
  const createdBeforeHuge = backProbe?.created ?? 0;
  trackInteractionRequests = true;
  await photoInput.setInputFiles({
    name: "too-large.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.alloc(8 * 1024 * 1024 + 1),
  });
  await page.getByText("Fotoğraf en fazla 8 MB olabilir.", { exact: true }).waitFor();
  const hugeProbe = await page.evaluate(
    () =>
      (window as typeof window & { __demoObjectUrlProbe?: { created: number; revoked: number } })
        .__demoObjectUrlProbe,
  );
  assert(hugeProbe?.created === createdBeforeHuge, "Oversized photo created an object URL.");
  assert(
    interactionRequests.length === 0,
    `Oversized photo triggered network traffic: ${interactionRequests.join(" | ")}`,
  );

  console.log("V0 demo listing: validating malformed price and local preview");
  await photoInput.setInputFiles({
    name: "demo-photo.webp",
    mimeType: "image/webp",
    buffer: Buffer.from("local preview only"),
  });
  const preview = page.getByAltText("Seçilen demo fotoğraf önizlemesi");
  await preview.waitFor();
  const previewSrc = await preview.getAttribute("src");
  assert(
    previewSrc?.startsWith("blob:") === true,
    "Selected photo did not remain a local blob preview.",
  );

  await page.getByLabel("Başlık").fill("Demo masa ilanı");
  await page.getByLabel("Fiyat (TL)").fill("12abc");
  await page.getByLabel("İl").selectOption("İstanbul");
  await page.getByLabel("İlçe").selectOption("Adalar");
  await page.getByLabel("Açıklama").fill("Bu içerik yalnız demo form davranışını test eder.");
  await page.getByRole("button", { name: "Demo ilan oluştur" }).click();
  await page.getByText("Geçerli bir fiyat girin.", { exact: true }).waitFor();
  assert(
    interactionRequests.length === 0,
    `Malformed price submit triggered network traffic: ${interactionRequests.join(" | ")}`,
  );

  console.log("V0 demo listing: validating double-submit lock and zero-write success");
  await page.getByLabel("Fiyat (TL)").fill("1250,50");
  await page.locator("form").evaluate((form) => {
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  await page.getByRole("heading", { level: 1, name: "Demo ilan oluşturuldu." }).waitFor();
  await page
    .getByText("Bu testte bilgileriniz kaydedilmedi veya yayınlanmadı.", { exact: true })
    .waitFor();
  assert(
    interactionRequests.length === 0,
    `Demo photo/submit triggered HTTP traffic: ${interactionRequests.join(" | ")}`,
  );

  const successProbe = await page.evaluate(
    () =>
      (window as typeof window & { __demoObjectUrlProbe?: { created: number; revoked: number } })
        .__demoObjectUrlProbe,
  );
  assert(
    (successProbe?.revoked ?? 0) >= (successProbe?.created ?? 0),
    `Demo object URL was not cleaned up by success: ${JSON.stringify(successProbe)}.`,
  );

  const persistenceAfterSubmit = await readPersistence(page);
  assert(persistenceAfterSubmit.localStorageKeys.length === 0, "Demo submit wrote localStorage.");
  assert(
    persistenceAfterSubmit.sessionStorageKeys.length === 0,
    "Demo submit wrote sessionStorage.",
  );
  assert(persistenceAfterSubmit.indexedDbNames.length === 0, "Demo submit wrote IndexedDB.");

  await page.screenshot({
    path: path.join(resultsDir, "desktop-demo-listing-success.png"),
    fullPage: true,
  });

  console.log("V0 demo listing: validating reload clears the ephemeral result");
  trackInteractionRequests = false;
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { level: 1, name: "Demo ilan oluşturma" }).waitFor();
  assert(
    (await page.getByRole("heading", { level: 1, name: "Demo ilan oluşturuldu." }).count()) === 0,
    "Reload restored demo success state.",
  );
  assert(
    (await page.getByLabel("Başlık").inputValue()) === "",
    "Reload restored demo title input.",
  );
  assert(
    (await page.getByLabel("Fiyat (TL)").inputValue()) === "",
    "Reload restored demo price input.",
  );
  assert((await page.getByLabel("İl").inputValue()) === "", "Reload restored demo city input.");
  assert(
    (await page.getByLabel("İlçe").isDisabled()) === true,
    "Reload did not reset district dependency.",
  );

  const persistenceAfterReload = await readPersistence(page);
  assert(
    persistenceAfterReload.localStorageKeys.length === 0,
    "Reload found persisted localStorage.",
  );
  assert(
    persistenceAfterReload.sessionStorageKeys.length === 0,
    "Reload found persisted sessionStorage.",
  );
  assert(persistenceAfterReload.indexedDbNames.length === 0, "Reload found persisted IndexedDB.");
} finally {
  await context.close();
}

console.log("V0 demo listing: validating 390x844 focused-field layout");
const mobileContext = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
const mobilePage = await mobileContext.newPage();
mobilePage.setDefaultTimeout(15_000);
mobilePage.setDefaultNavigationTimeout(15_000);

try {
  await gotoOk(mobilePage, "/ilan-ver");
  await mobilePage.getByRole("heading", { level: 1, name: "Demo ilan oluşturma" }).waitFor();
  await mobilePage.getByLabel("İl").selectOption("Tekirdağ");
  await mobilePage.getByLabel("İlçe").selectOption("Çorlu");

  for (const label of ["Başlık", "Fiyat (TL)", "İl", "İlçe", "Açıklama"]) {
    const field = mobilePage.getByLabel(label);
    await field.scrollIntoViewIfNeeded();
    await field.focus();
    const box = await field.boundingBox();
    assert(box !== null, `${label} has no mobile bounding box.`);
    assert(box.x >= 0 && box.x + box.width <= 390, `${label} overflows the 390px viewport.`);
  }

  assert(
    (await mobilePage.getByLabel("Fiyat (TL)").getAttribute("inputmode")) === "decimal",
    "Demo price input does not request a mobile decimal keyboard.",
  );
  await assertNoHorizontalOverflow(mobilePage, "/ilan-ver mobile");
  await mobilePage.screenshot({
    path: path.join(resultsDir, "mobile-demo-listing.png"),
    fullPage: true,
  });
} finally {
  await mobileContext.close();
  await browser.close();
}

console.log("V0 zero-data demo listing browser validation passed.");
