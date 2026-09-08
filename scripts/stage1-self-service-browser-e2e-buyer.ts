import fs from "node:fs/promises";
import path from "node:path";
import { chromium, type Locator } from "playwright";
import {
  HarnessMonitor,
  assert,
  assertResponsiveRoute,
  expectHref,
  ownerPhone,
  publicBaseUrl,
  readPublicHandoff,
  resultsDir,
} from "./stage1-self-service-browser-e2e-shared";

const { listingId, title } = readPublicHandoff();
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
const monitor = new HarnessMonitor();
monitor.observePage(page);
const runtimeErrors: string[] = [];
page.on("pageerror", (error) => runtimeErrors.push(`pageerror: ${error.message}`));
page.on("console", (message) => {
  if (message.type() === "error") runtimeErrors.push(`console: ${message.text()}`);
});

async function locatorState(locator: Locator) {
  const count = await locator.count();
  if (count !== 1) return { count };
  return {
    count,
    visible: await locator.isVisible(),
    enabled: await locator.isEnabled(),
    editable: await locator.isEditable(),
    value: await locator.inputValue().catch(() => null),
    boundingBox: await locator.boundingBox(),
  };
}

async function recordState(label: string) {
  const dialogs = page.getByRole("dialog");
  const category = page.getByLabel("Filtre kategori", { exact: true });
  const automobile = page.getByRole("button", { name: "Otomobil", exact: true });
  const yearMin = page.getByLabel("Model yılı minimum", { exact: true });
  const yearMax = page.getByLabel("Model yılı maksimum", { exact: true });
  const kmMin = page.getByLabel("Kilometre minimum", { exact: true });
  const kmMax = page.getByLabel("Kilometre maksimum", { exact: true });
  const dialogStates = await dialogs.evaluateAll((nodes) =>
    nodes.map((node) => ({
      state: node.getAttribute("data-state"),
      ariaHidden: node.getAttribute("aria-hidden"),
    })),
  );
  const activeElement = await page.evaluate(() => {
    const element = document.activeElement as HTMLElement | null;
    if (!element) return null;
    return {
      tag: element.tagName,
      ariaLabel: element.getAttribute("aria-label"),
      name: element.getAttribute("name"),
      value: "value" in element ? String((element as HTMLInputElement).value) : null,
      text: element.textContent?.trim().slice(0, 120) ?? null,
    };
  });
  const state = {
    label,
    url: page.url(),
    dialogs: { count: await dialogs.count(), states: dialogStates },
    category: {
      count: await category.count(),
      value: (await category.count()) === 1 ? await category.inputValue() : null,
    },
    automobile: {
      count: await automobile.count(),
      ariaPressed:
        (await automobile.count()) === 1 ? await automobile.getAttribute("aria-pressed") : null,
    },
    yearMin: await locatorState(yearMin),
    yearMax: await locatorState(yearMax),
    kmMin: await locatorState(kmMin),
    kmMax: await locatorState(kmMax),
    activeElement,
    runtimeErrors: [...runtimeErrors],
  };
  console.log(`PHASE2_KM_STATE ${JSON.stringify(state)}`);
  return state;
}

async function writeDrawerFailureEvidence() {
  await page.screenshot({
    path: path.join(resultsDir, "phase2-km-failure.png"),
    fullPage: true,
  });
  const dialog = page.getByRole("dialog").first();
  const snapshot =
    (await dialog.count()) === 1
      ? await dialog.evaluate((node) => node.outerHTML.slice(0, 30000))
      : await page.locator("body").evaluate((node) => node.outerHTML.slice(0, 30000));
  await fs.writeFile(path.join(resultsDir, "phase2-km-failure-dom.html"), snapshot, "utf8");
}

try {
  await page.goto(`${publicBaseUrl}/ara?q=b150`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /^Filtreler/ }).click();
  await page.getByLabel("Filtre il", { exact: true }).selectOption("Tekirdağ");
  await page.getByLabel("Filtre ilçe", { exact: true }).selectOption("Çorlu");
  await page.getByLabel("Minimum fiyat", { exact: true }).fill("0");
  await page.getByLabel("Maksimum fiyat", { exact: true }).fill("5000");
  await page.getByLabel("Filtre kategori", { exact: true }).selectOption("vehicle");
  await page.getByRole("button", { name: "Otomobil", exact: true }).click();
  await recordState("before-year-min");
  await page.getByLabel("Model yılı minimum", { exact: true }).fill("2010");
  await recordState("after-year-min");
  await page.getByLabel("Model yılı maksimum", { exact: true }).fill("2020");
  await recordState("after-year-max");
  await recordState("before-km-fill");
  const kmMax = page.getByLabel("Kilometre maksimum", { exact: true });
  try {
    await kmMax.fill("120000");
  } catch (error) {
    await recordState("km-fill-timeout");
    await writeDrawerFailureEvidence();
    console.log(`PHASE2_KM_FILL_ORIGINAL_ERROR ${String(error)}`);
    throw error;
  }
  await page.getByRole("button", { name: "Otomatik", exact: true }).click();
  await page.getByRole("button", { name: "Sonuçları göster", exact: true }).click();

  const result = page.getByRole("link", { name: new RegExp(title) }).first();
  await result.waitFor();
  await page.getByText("2016 · 118.000 km · Otomatik", { exact: true }).waitFor();
  const filteredUrl = new URL(page.url());
  assert(
    filteredUrl.searchParams.get("q") === "b150",
    "Query was not retained in canonical URL state.",
  );
  assert(filteredUrl.searchParams.get("category") === "vehicle", "Category was not serialized.");
  assert(
    filteredUrl.searchParams.get("productType") === "automobile",
    "Product type was not serialized.",
  );
  assert(filteredUrl.searchParams.get("province") === "Tekirdağ", "Province was not serialized.");
  assert(filteredUrl.searchParams.get("district") === "Çorlu", "District was not serialized.");
  assert(filteredUrl.searchParams.get("priceMin") === "0", "Price min was not serialized.");
  assert(filteredUrl.searchParams.get("priceMax") === "5000", "Price max was not serialized.");
  const contextual = JSON.parse(filteredUrl.searchParams.get("contextual") ?? "{}") as Record<
    string,
    unknown
  >;
  assert(
    JSON.stringify(contextual.year) === JSON.stringify({ min: 2010, max: 2020 }) &&
      JSON.stringify(contextual.km) === JSON.stringify({ min: null, max: 120000 }) &&
      JSON.stringify(contextual.transmission) === JSON.stringify(["automatic"]),
    "Contextual filters were not serialized canonically.",
  );

  await page.getByRole("button", { name: /^Filtreler/ }).click();
  await page.getByLabel("Kilometre maksimum", { exact: true }).fill("100000");
  await page.getByRole("button", { name: "Sonuçları göster", exact: true }).click();
  await page.getByText("Sonuç bulunamadı", { exact: true }).waitFor();
  assert(
    (await page.getByRole("link", { name: new RegExp(title) }).count()) === 0,
    "Active numeric range was silently relaxed.",
  );
  const strictUrl = new URL(page.url());
  const strictContextual = JSON.parse(strictUrl.searchParams.get("contextual") ?? "{}") as Record<
    string,
    unknown
  >;
  assert(
    JSON.stringify(strictContextual.km) === JSON.stringify({ min: null, max: 100000 }),
    "Zero-result range was not retained as a hard canonical filter.",
  );

  await page.getByRole("button", { name: /^Filtreler/ }).click();
  await page.getByLabel("Kilometre maksimum", { exact: true }).fill("120000");
  await page.getByRole("button", { name: "Sonuçları göster", exact: true }).click();
  const restoredResult = page.getByRole("link", { name: new RegExp(title) }).first();
  await restoredResult.waitFor();
  await page.getByLabel("Sıralama", { exact: true }).selectOption("price_asc");
  await restoredResult.waitFor();
  assert(new URL(page.url()).searchParams.get("sort") === "price_asc", "Sort was not serialized.");

  await page.setViewportSize({ width: 390, height: 420 });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const resultsScrollY = await page.evaluate(() => window.scrollY);
  assert(resultsScrollY > 0, "Search fixture was not scrollable for Back restoration proof.");
  const searchUrlBeforeDetail = page.url();
  await restoredResult.click();
  await page.waitForLoadState("networkidle");
  await page.getByRole("heading", { level: 1, name: title }).waitFor();
  await page.getByText("Ücretsiz", { exact: true }).waitFor();
  const hero = page.getByAltText(`${title} fotoğraf 1`);
  const heroSrc = await hero.getAttribute("src");
  assert(
    heroSrc?.startsWith(`/api/listing-photo/${listingId}/`),
    `Public photo bypassed application signing route: ${heroSrc}`,
  );
  const decoded = await hero.evaluate((image) => ({
    complete: (image as HTMLImageElement).complete,
    width: (image as HTMLImageElement).naturalWidth,
  }));
  assert(decoded.complete && decoded.width > 0, "Application photo did not decode.");
  const contactBar = page.getByTestId("detail-contact-bar");
  expectHref(
    await contactBar.getByRole("link", { name: "Ara", exact: true }).getAttribute("href"),
    `tel:${ownerPhone}`,
  );
  expectHref(
    await contactBar
      .getByRole("link", { name: "WhatsApp’tan yaz", exact: true })
      .getAttribute("href"),
    `https://wa.me/${ownerPhone.slice(1)}`,
  );

  await page.getByTestId("results-back").click();
  await page.waitForURL(searchUrlBeforeDetail);
  await page.waitForFunction(
    (expected) => Math.abs(window.scrollY - expected) <= 5,
    resultsScrollY,
  );
  assert(page.url() === searchUrlBeforeDetail, "Back did not restore the exact search URL.");
  assert(
    Math.abs((await page.evaluate(() => window.scrollY)) - resultsScrollY) <= 5,
    "Back did not restore the previous results scroll position.",
  );

  const compactContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  try {
    const compactPage = await compactContext.newPage();
    monitor.observePage(compactPage);
    await compactPage.goto(`${publicBaseUrl}/ara?q=${encodeURIComponent("b 150")}`, {
      waitUntil: "networkidle",
    });
    await compactPage
      .getByRole("link", { name: new RegExp(title) })
      .first()
      .waitFor();
  } finally {
    await compactContext.close();
  }

  await assertResponsiveRoute(page, `${publicBaseUrl}/ara?q=b150`, "/ara", "İlan ara");
  await assertResponsiveRoute(page, `${publicBaseUrl}/ilan/${listingId}`, "/ilan/$id", title);
  await page.screenshot({
    path: path.join(resultsDir, "phase2-buyer-public-state.png"),
    fullPage: true,
  });
  monitor.assertClean();
  console.log("Phase 2 buyer Product Finding process passed.");
} finally {
  await context.close();
  await browser.close();
}
