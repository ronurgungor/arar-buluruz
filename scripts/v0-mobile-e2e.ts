import fs from "node:fs";
import path from "node:path";
import { chromium, type Locator, type Page } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:4174";
const appOrigin = new URL(baseUrl).origin;
const resultsDir = path.resolve("test-results/v0-pwa");
fs.mkdirSync(resultsDir, { recursive: true });

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function bounded<T>(label: string, operation: Promise<T>, timeoutMs = 15_000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} exceeded ${timeoutMs} ms.`)),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function trackAutomaticCrossOriginRequests(page: Page, requests: string[]) {
  page.on("request", (request) => {
    let url: URL;
    try {
      url = new URL(request.url());
    } catch {
      return;
    }

    if ((url.protocol === "http:" || url.protocol === "https:") && url.origin !== appOrigin) {
      requests.push(`${request.method()} ${url.toString()}`);
    }
  });
}

async function gotoOk(page: Page, route: string) {
  const url = new URL(route, baseUrl).toString();
  const response = await bounded(
    `Navigation to ${route}`,
    page.goto(url, { waitUntil: "domcontentloaded", timeout: 15_000 }),
  );
  assert(response?.ok() === true, `${url} returned HTTP ${response?.status() ?? "unknown"}.`);
}

async function assertNoHorizontalOverflow(page: Page, route: string) {
  const dimensions = await bounded(
    `${route} overflow measurement`,
    page.evaluate(() => ({
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
    })),
  );
  assert(
    dimensions.document <= dimensions.viewport,
    `${route} overflows horizontally: ${JSON.stringify(dimensions)}`,
  );
}

async function assertTouchTarget(locator: Locator, label: string) {
  await bounded(`${label} visibility`, locator.waitFor({ state: "visible", timeout: 10_000 }));
  await bounded(`${label} scroll`, locator.scrollIntoViewIfNeeded({ timeout: 10_000 }));
  const box = await bounded(`${label} geometry`, locator.boundingBox({ timeout: 10_000 }));
  assert(box, `${label} did not have a visible bounding box.`);
  assert(
    box.width >= 44 && box.height >= 44,
    `${label} was smaller than 44×44 CSS pixels: ${Math.round(box.width)}×${Math.round(box.height)}.`,
  );
}

async function assertNoAdPlaceholder(page: Page, route: string) {
  assert(
    (await page.getByText("Reklam", { exact: true }).count()) === 0,
    `${route} exposed the public V0 Reklam placeholder.`,
  );
  assert(
    (await page.getByText("Reklam alanı", { exact: true }).count()) === 0,
    `${route} exposed the public V0 Reklam alanı placeholder.`,
  );
}

async function clickAndWaitForUrl(
  page: Page,
  locator: Locator,
  label: string,
  predicate: (url: URL) => boolean,
) {
  await bounded(`${label} click`, locator.click({ noWaitAfter: true, timeout: 10_000 }));
  await bounded(`${label} URL transition`, page.waitForURL(predicate, { timeout: 15_000 }));
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  serviceWorkers: "block",
});
const page = await context.newPage();
page.setDefaultTimeout(15_000);
page.setDefaultNavigationTimeout(15_000);
const crossOriginRequests: string[] = [];
trackAutomaticCrossOriginRequests(page, crossOriginRequests);

try {
  console.log("V0 mobile: validating Turkish static SSR 500 recovery output");
  const errorResponse = await bounded(
    "Static SSR 500 probe",
    context.request.get(`${baseUrl}/?__v0_static_ssr_500_probe=enabled`, { timeout: 15_000 }),
  );
  assert(errorResponse.status() === 500, `Static SSR probe returned ${errorResponse.status()}.`);
  assert(
    errorResponse.headers()["content-type"]?.startsWith("text/html") === true,
    "Static SSR probe did not return text/html.",
  );
  assert(
    errorResponse.headers()["x-robots-tag"]?.includes("noindex") === true,
    "Static SSR 500 response lost the noindex boundary.",
  );
  const errorHtml = await errorResponse.text();
  assert(errorHtml.includes('<html lang="tr">'), "Static SSR 500 page is not Turkish.");
  assert(errorHtml.includes("Bu sayfa yüklenemedi"), "Static SSR 500 heading is missing.");
  assert(errorHtml.includes("Tekrar dene"), "Static SSR retry action is missing.");
  assert(errorHtml.includes("Ana sayfaya dön"), "Static SSR home action is missing.");
  assert(!errorHtml.includes("HTTPError"), "Static SSR 500 exposed an HTTPError detail.");
  assert(!errorHtml.includes("Error:"), "Static SSR 500 exposed an Error detail.");
  assert(!errorHtml.includes("stack"), "Static SSR 500 exposed stack text.");

  console.log("V0 mobile: validating home search controls and touch targets");
  await gotoOk(page, "/");
  await page.getByTestId("v0-notice").waitFor();
  const homeSearch = page.getByLabel("Ne arıyorsun?");
  const homeCity = page.getByLabel("Konum");
  const homeSubmit = page.getByRole("button", { name: "Ara", exact: true });
  await assertTouchTarget(
    page.getByRole("link", { name: "İlan Ver (demo)" }),
    "Home listing demo link",
  );
  await assertTouchTarget(page.getByRole("link", { name: "Giriş" }), "Home login link");
  await assertTouchTarget(homeSearch, "Home search input");
  await assertTouchTarget(homeCity, "Home city select");
  await assertTouchTarget(homeSubmit, "Home search submit");
  await assertTouchTarget(page.getByRole("link", { name: "Gizlilik" }), "Home privacy link");
  await assertNoHorizontalOverflow(page, "/ mobile core flow");

  console.log("V0 mobile: submitting the home search");
  await bounded("Home search fill", homeSearch.fill("traktor", { timeout: 10_000 }));
  await bounded(
    "Home city selection",
    homeCity.selectOption({ label: "Konya" }, { timeout: 10_000 }),
  );
  await clickAndWaitForUrl(page, homeSubmit, "Home search submit", (url) => {
    return (
      url.pathname === "/ara" &&
      url.searchParams.get("q") === "traktor" &&
      url.searchParams.get("il") === "Konya"
    );
  });

  console.log("V0 mobile: validating search, city, district and result flow");
  const searchInput = page.getByLabel("Ne arıyorsun?");
  const citySelect = page.getByLabel("Konum");
  const districtSelect = page.getByLabel("İlçe");
  await page.getByText("Sahibinden temiz bahçe traktörü", { exact: true }).waitFor();
  assert(
    !(await districtSelect.isDisabled()),
    "District select stayed disabled after selecting Konya.",
  );
  assert(
    (await districtSelect.locator("option").allTextContents()).includes("Çumra"),
    "Konya district options did not include Çumra.",
  );
  await bounded(
    "Çumra district selection",
    districtSelect.selectOption({ label: "Çumra" }, { timeout: 10_000 }),
  );
  await bounded(
    "Çumra URL transition",
    page.waitForURL((url) => url.searchParams.get("ilce") === "Çumra", { timeout: 15_000 }),
  );
  await page.getByText("1 ilan bulundu", { exact: true }).waitFor();
  const resultLink = page.locator('a[href="/ilan/1"]').first();
  await resultLink.waitFor();
  await assertTouchTarget(searchInput, "Search-page query input");
  await assertTouchTarget(citySelect, "Search-page city select");
  await assertTouchTarget(districtSelect, "Search-page district select");
  await assertTouchTarget(page.getByRole("button", { name: "En yeni" }), "Search sort control");
  await assertTouchTarget(resultLink, "Search result link");
  await assertNoAdPlaceholder(page, "/ara mobile");
  await assertNoHorizontalOverflow(page, "/ara mobile core flow");
  await page.screenshot({ path: path.join(resultsDir, "mobile-search.png"), fullPage: true });

  console.log("V0 mobile: validating in-app detail return and lower contact areas");
  await clickAndWaitForUrl(page, resultLink, "Search result", (url) => url.pathname === "/ilan/1");
  await page.getByRole("heading", { level: 1, name: "Sahibinden temiz bahçe traktörü" }).waitFor();
  const resultsBack = page.getByTestId("results-back");
  const complaintLink = page.getByRole("link", { name: "Şikâyet Et" });
  const contactBar = page.getByTestId("detail-contact-bar");
  const phoneLink = contactBar.getByRole("link", { name: "Ara", exact: true });
  const whatsappLink = contactBar.getByRole("link", { name: "WhatsApp" });
  await contactBar.waitFor();
  await assertTouchTarget(resultsBack, "Detail results-back control");
  await assertTouchTarget(complaintLink, "Detail complaint link");
  await assertTouchTarget(phoneLink, "Detail phone link");
  await assertTouchTarget(whatsappLink, "Detail WhatsApp link");
  await bounded("Complaint link scroll", complaintLink.scrollIntoViewIfNeeded({ timeout: 10_000 }));
  await page.waitForTimeout(100);
  const complaintBox = await complaintLink.boundingBox();
  const contactBox = await contactBar.boundingBox();
  assert(complaintBox && contactBox, "Detail complaint/contact geometry was unavailable.");
  assert(
    complaintBox.y + complaintBox.height <= contactBox.y,
    `Detail complaint area overlapped the fixed contact bar: complaint=${JSON.stringify(complaintBox)}, contact=${JSON.stringify(contactBox)}.`,
  );
  await assertNoAdPlaceholder(page, "/ilan/1 mobile");
  await assertNoHorizontalOverflow(page, "/ilan/1 mobile core flow");
  await page.screenshot({ path: path.join(resultsDir, "mobile-detail.png"), fullPage: true });

  await clickAndWaitForUrl(page, resultsBack, "Results back", (url) => {
    return (
      url.pathname === "/ara" &&
      url.searchParams.get("q") === "traktor" &&
      url.searchParams.get("il") === "Konya" &&
      url.searchParams.get("ilce") === "Çumra"
    );
  });
  await page.getByText("Sahibinden temiz bahçe traktörü", { exact: true }).waitFor();

  console.log("V0 mobile: validating direct-detail safe fallback");
  const directPage = await context.newPage();
  directPage.setDefaultTimeout(15_000);
  directPage.setDefaultNavigationTimeout(15_000);
  trackAutomaticCrossOriginRequests(directPage, crossOriginRequests);
  try {
    await gotoOk(directPage, "/ilan/1");
    await directPage
      .getByRole("heading", { level: 1, name: "Sahibinden temiz bahçe traktörü" })
      .waitFor();
    await clickAndWaitForUrl(
      directPage,
      directPage.getByTestId("results-back"),
      "Direct-detail fallback",
      (url) => {
        return (
          url.origin === appOrigin &&
          url.pathname === "/ara" &&
          url.searchParams.get("q") === "" &&
          url.searchParams.get("il") === "Tüm Türkiye" &&
          url.searchParams.get("ilce") === "Tüm ilçeler" &&
          url.searchParams.get("sirala") === "yeni"
        );
      },
    );
    await directPage.getByText("ilan bulundu", { exact: false }).waitFor();
    await assertNoHorizontalOverflow(directPage, "/ara direct-detail fallback");
  } finally {
    await directPage.close();
  }

  const cookies = await context.cookies(baseUrl);
  assert(
    cookies.length === 0,
    `Mobile V0 created cookies: ${cookies.map((cookie) => cookie.name).join(", ")}`,
  );
  assert(
    crossOriginRequests.length === 0,
    `Mobile V0 made automatic cross-origin requests: ${crossOriginRequests.join(" | ")}`,
  );
} finally {
  await context.close();
  await browser.close();
}

console.log("V0 synthetic mobile core-flow validation passed.");
