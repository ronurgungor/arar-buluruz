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

async function logFilterScrollSelectorState(label: string) {
  const snapshot = await page.getByLabel("Filtre il", { exact: true }).evaluate((node) => {
    const ancestors: Array<{ tag: string; testId: string | null; className: string }> = [];
    let current: HTMLElement | null = node.parentElement;
    while (current) {
      ancestors.push({
        tag: current.tagName,
        testId: current.getAttribute("data-testid"),
        className: current.className,
      });
      current = current.parentElement;
    }
    return {
      testIdCount: document.querySelectorAll(
        '[data-testid="product-finding-filter-scroll"]',
      ).length,
      ancestors,
    };
  });
  console.log(`Phase 2 filter scroll selector diagnostic (${label}): ${JSON.stringify(snapshot)}`);
}

async function enterKmByUserInteraction(value: string) {
  const scrollContainer = page.getByTestId("product-finding-filter-scroll");
  await scrollContainer.waitFor({ state: "attached" });
  await page.waitForFunction(() => {
    const container = document.querySelector('[data-testid="product-finding-filter-scroll"]');
    if (!(container instanceof HTMLElement)) return false;
    const rect = container.getBoundingClientRect();
    return (
      rect.right > 0 &&
      rect.left < window.innerWidth &&
      rect.bottom > 0 &&
      rect.top < window.innerHeight
    );
  });

  const geometry = await scrollContainer.evaluate((node) => {
    const element = node as HTMLElement;
    const rect = element.getBoundingClientRect();
    const visibleLeft = Math.max(0, rect.left);
    const visibleRight = Math.min(window.innerWidth, rect.right);
    const visibleTop = Math.max(0, rect.top);
    const visibleBottom = Math.min(window.innerHeight, rect.bottom);
    return {
      centerX: (visibleLeft + visibleRight) / 2,
      centerY: (visibleTop + visibleBottom) / 2,
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      scrollTop: element.scrollTop,
      visibleWidth: visibleRight - visibleLeft,
      visibleHeight: visibleBottom - visibleTop,
    };
  });
  assert(
    geometry.scrollHeight > geometry.clientHeight,
    `Filter Drawer body is not scrollable: ${JSON.stringify(geometry)}.`,
  );
  assert(
    geometry.visibleWidth > 0 && geometry.visibleHeight > 0,
    `Filter Drawer scroll container has no visible intersection: ${JSON.stringify(geometry)}.`,
  );

  await page.mouse.move(geometry.centerX, geometry.centerY);
  const pointerHitsScrollContainer = await scrollContainer.evaluate(
    (node, point) => {
      const hit = document.elementFromPoint(point.x, point.y);
      return hit === node || (hit instanceof Node && node.contains(hit));
    },
    { x: geometry.centerX, y: geometry.centerY },
  );
  assert(
    pointerHitsScrollContainer,
    `Mouse is not over the visible Drawer scroll region: ${JSON.stringify(geometry)}.`,
  );

  const beforeScrollTop = await scrollContainer.evaluate((node) => (node as HTMLElement).scrollTop);
  await page.mouse.wheel(0, 360);
  await page.waitForFunction((expectedScrollTop) => {
    const container = document.querySelector('[data-testid="product-finding-filter-scroll"]');
    return container instanceof HTMLElement && container.scrollTop > expectedScrollTop;
  }, beforeScrollTop);
  const afterScrollTop = await scrollContainer.evaluate((node) => (node as HTMLElement).scrollTop);
  assert(
    afterScrollTop > beforeScrollTop,
    `Filter Drawer did not scroll by real wheel gesture: ${beforeScrollTop} -> ${afterScrollTop}.`,
  );

  const kmMax = page.getByLabel("Kilometre maksimum", { exact: true });
  await kmMax.click();
  await kmMax.press("ControlOrMeta+A");
  await page.keyboard.type(value);
  assert(
    (await kmMax.inputValue()) === value,
    `Kilometre maksimum değeri ${value} olarak girilemedi.`,
  );
}

try {
  await page.goto(`${publicBaseUrl}/ara?q=b150`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /^Filtreler/ }).click();
  await page.getByLabel("Filtre il", { exact: true }).waitFor();
  await logFilterScrollSelectorState("after-open");
  await page.getByLabel("Filtre il", { exact: true }).selectOption("Tekirdağ");
  await page.getByLabel("Filtre ilçe", { exact: true }).selectOption("Çorlu");
  await page.getByLabel("Minimum fiyat", { exact: true }).fill("0");
  await page.getByLabel("Maksimum fiyat", { exact: true }).fill("5000");
  await page.getByLabel("Filtre kategori", { exact: true }).selectOption("vehicle");
  await page.getByRole("button", { name: "Otomobil", exact: true }).click();
  await page.getByLabel("Model yılı minimum", { exact: true }).fill("2010");
  await page.getByLabel("Model yılı maksimum", { exact: true }).fill("2020");
  await logFilterScrollSelectorState("after-year-inputs");
  await enterKmByUserInteraction("120000");
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
  await enterKmByUserInteraction("100000");
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
  await enterKmByUserInteraction("120000");
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
