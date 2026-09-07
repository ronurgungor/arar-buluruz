import path from "node:path";
import { chromium } from "playwright";
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

try {
  for (const query of ["b150", "b 150"]) {
    await page.goto(`${publicBaseUrl}/ara?q=${encodeURIComponent(query)}`, { waitUntil: "networkidle" });
    await page.getByRole("link", { name: new RegExp(title) }).first().waitFor();
  }

  await page.goto(`${publicBaseUrl}/ara?q=b150`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /^Filtreler/ }).click();
  await page.getByLabel("Filtre il", { exact: true }).selectOption("Tekirdağ");
  await page.getByLabel("Filtre ilçe", { exact: true }).selectOption("Çorlu");
  await page.getByLabel("Minimum fiyat", { exact: true }).fill("0");
  await page.getByLabel("Maksimum fiyat", { exact: true }).fill("5000");
  await page.getByLabel("Filtre kategori", { exact: true }).selectOption("vehicle");
  await page.getByRole("button", { name: "Otomobil", exact: true }).click();
  await page.getByLabel("Model yılı minimum", { exact: true }).fill("2010");
  await page.getByLabel("Model yılı maksimum", { exact: true }).fill("2020");
  await page.getByLabel("Kilometre maksimum", { exact: true }).fill("120000");
  await page.getByRole("button", { name: "Otomatik", exact: true }).click();
  await page.getByRole("button", { name: "Sonuçları göster", exact: true }).click();

  const result = page.getByRole("link", { name: new RegExp(title) }).first();
  await result.waitFor();
  await page.getByText("2016 · 118.000 km · Otomatik", { exact: true }).waitFor();
  const filteredUrl = new URL(page.url());
  assert(filteredUrl.searchParams.get("q") === "b150", "Query was not retained in canonical URL state.");
  assert(filteredUrl.searchParams.get("category") === "vehicle", "Category was not serialized.");
  assert(filteredUrl.searchParams.get("productType") === "automobile", "Product type was not serialized.");
  assert(filteredUrl.searchParams.get("province") === "Tekirdağ", "Province was not serialized.");
  assert(filteredUrl.searchParams.get("district") === "Çorlu", "District was not serialized.");
  assert(filteredUrl.searchParams.get("priceMin") === "0", "Price min was not serialized.");
  assert(filteredUrl.searchParams.get("priceMax") === "5000", "Price max was not serialized.");
  const contextual = JSON.parse(filteredUrl.searchParams.get("contextual") ?? "{}") as Record<string, unknown>;
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
  assert((await page.getByRole("link", { name: new RegExp(title) }).count()) === 0, "Active numeric range was silently relaxed.");
  const strictUrl = new URL(page.url());
  const strictContextual = JSON.parse(strictUrl.searchParams.get("contextual") ?? "{}") as Record<string, unknown>;
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
  assert(heroSrc?.startsWith(`/api/listing-photo/${listingId}/`), `Public photo bypassed application signing route: ${heroSrc}`);
  const decoded = await hero.evaluate((image) => ({
    complete: (image as HTMLImageElement).complete,
    width: (image as HTMLImageElement).naturalWidth,
  }));
  assert(decoded.complete && decoded.width > 0, "Application photo did not decode.");
  const contactBar = page.getByTestId("detail-contact-bar");
  expectHref(await contactBar.getByRole("link", { name: "Ara", exact: true }).getAttribute("href"), `tel:${ownerPhone}`);
  expectHref(
    await contactBar.getByRole("link", { name: "WhatsApp’tan yaz", exact: true }).getAttribute("href"),
    `https://wa.me/${ownerPhone.slice(1)}`,
  );

  await page.getByTestId("results-back").click();
  await page.waitForURL(searchUrlBeforeDetail);
  await page.waitForFunction((expected) => Math.abs(window.scrollY - expected) <= 5, resultsScrollY);
  assert(page.url() === searchUrlBeforeDetail, "Back did not restore the exact search URL.");
  assert(Math.abs((await page.evaluate(() => window.scrollY)) - resultsScrollY) <= 5, "Back did not restore the previous results scroll position.");

  await assertResponsiveRoute(page, `${publicBaseUrl}/ara?q=b150`, "/ara", "İlan ara");
  await assertResponsiveRoute(page, `${publicBaseUrl}/ilan/${listingId}`, "/ilan/$id", title);
  await page.screenshot({ path: path.join(resultsDir, "phase2-buyer-public-state.png"), fullPage: true });
  monitor.assertClean();
  console.log("Phase 2 buyer Product Finding process passed.");
} finally {
  await context.close();
  await browser.close();
}
