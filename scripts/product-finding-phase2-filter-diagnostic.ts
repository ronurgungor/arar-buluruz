import fs from "node:fs";
import path from "node:path";
import { chromium, type Page } from "playwright";

const publicBaseUrl = process.env.PUBLIC_BASE_URL ?? "http://127.0.0.1:4173";
const backendOrigin = process.env.BACKEND_ORIGIN;
const anonKey = process.env.BACKEND_ANON_KEY;
if (!backendOrigin || !anonKey) {
  throw new Error("BACKEND_ORIGIN and BACKEND_ANON_KEY are required.");
}

const resultsDir = path.resolve("test-results/stage1-self-service");
fs.mkdirSync(resultsDir, { recursive: true });

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function getActiveAutomobileFixture(): Promise<{ id: string; title: string }> {
  const url = new URL(`${backendOrigin}/rest/v1/listings`);
  url.searchParams.set("select", "id,title");
  url.searchParams.set("product_type", "eq.automobile");
  url.searchParams.set("limit", "1");
  const response = await fetch(url, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
  });
  assert(response.ok, `Automobile fixture lookup failed: ${response.status}`);
  const rows = (await response.json()) as Array<{ id: string; title: string }>;
  assert(rows.length === 1 && rows[0], "Expected one active Automobile fixture after matrix A.");
  return rows[0];
}

async function waitForFixture(page: Page, title: string): Promise<void> {
  await page.getByRole("link", { name: new RegExp(title) }).first().waitFor();
}

async function fillCanonicalFilters(page: Page): Promise<void> {
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
  assert(
    (await page.getByLabel("Kilometre maksimum", { exact: true }).inputValue()) === "120000",
    "Kilometre maksimum did not retain 120000.",
  );
  await page.getByRole("button", { name: "Otomatik", exact: true }).click();
}

async function applyAndRoundTripDetail(page: Page, fixture: { id: string; title: string }): Promise<void> {
  await page.getByRole("button", { name: "Sonuçları göster", exact: true }).click();
  const result = page.getByRole("link", { name: new RegExp(fixture.title) }).first();
  await result.waitFor();
  const searchUrl = page.url();
  await result.click();
  await page.waitForURL(`${publicBaseUrl}/ilan/${fixture.id}`);
  await page.getByRole("heading", { level: 1, name: fixture.title }).waitFor();
  await page.getByTestId("results-back").click();
  await page.waitForURL(searchUrl);
  assert(page.url() === searchUrl, "Detail Back did not restore the exact filtered URL.");
}

async function submitUiQuery(page: Page, query: string, fixtureTitle: string): Promise<void> {
  const input = page.getByLabel("Ne arıyorsun?", { exact: true });
  await input.fill(query);
  await page.getByRole("button", { name: "Ara", exact: true }).click();
  await page.waitForURL((url) => url.pathname === "/ara" && url.searchParams.get("q") === query);
  await waitForFixture(page, fixtureTitle);
}

const fixture = await getActiveAutomobileFixture();
const browser = await chromium.launch({ headless: true });

try {
  // B: keep compact-query hard-goto coverage on a disposable page/context,
  // then prove the canonical Product Finding journey on a fresh buyer context.
  const smokeContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const smokePage = await smokeContext.newPage();
  for (const query of ["b150", "b 150", "b150"]) {
    await smokePage.goto(`${publicBaseUrl}/ara?q=${encodeURIComponent(query)}`, {
      waitUntil: "networkidle",
    });
    await waitForFixture(smokePage, fixture.title);
  }
  await smokeContext.close();

  const freshBuyerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const freshBuyerPage = await freshBuyerContext.newPage();
  await freshBuyerPage.goto(`${publicBaseUrl}/ara?q=b150`, { waitUntil: "networkidle" });
  await waitForFixture(freshBuyerPage, fixture.title);
  await fillCanonicalFilters(freshBuyerPage);
  await freshBuyerPage.screenshot({
    path: path.join(resultsDir, "phase2-matrix-b-after-km.png"),
    fullPage: true,
  });
  await applyAndRoundTripDetail(freshBuyerPage, fixture);
  console.log("PHASE2_MATRIX_B PASS fresh buyer context after disposable compatibility smoke");
  await freshBuyerContext.close();

  // C: reproduce the compatibility sequence through the real UI on one page.
  const uiContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const uiPage = await uiContext.newPage();
  await uiPage.goto(`${publicBaseUrl}/ara`, { waitUntil: "networkidle" });
  await submitUiQuery(uiPage, "b150", fixture.title);
  await submitUiQuery(uiPage, "b 150", fixture.title);
  await submitUiQuery(uiPage, "b150", fixture.title);
  await fillCanonicalFilters(uiPage);
  await uiPage.screenshot({
    path: path.join(resultsDir, "phase2-matrix-c-after-km.png"),
    fullPage: true,
  });
  console.log("PHASE2_MATRIX_C_KM PASS real UI navigation retained Kilometre maksimum");
  await applyAndRoundTripDetail(uiPage, fixture);
  console.log("PHASE2_MATRIX_C PASS real UI b150 -> b 150 -> b150 navigation");
  await uiContext.close();
} finally {
  await browser.close();
}
