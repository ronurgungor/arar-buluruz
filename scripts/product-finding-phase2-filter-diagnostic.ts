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
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
  });
  assert(response.ok, `Automobile fixture lookup failed: ${response.status}`);
  const rows = (await response.json()) as Array<{ id: string; title: string }>;
  assert(rows.length === 1 && rows[0], "Expected one active Automobile fixture after canonical failure.");
  return rows[0];
}

async function waitForFixture(page: Page, title: string): Promise<void> {
  await page.getByRole("link", { name: new RegExp(title) }).first().waitFor();
}

async function recordState(page: Page, label: string): Promise<Record<string, unknown>> {
  const button = page.getByRole("button", { name: "Otomobil", exact: true });
  const state = {
    label,
    url: page.url(),
    drawerDialogs: await page.getByRole("dialog").count(),
    automobileCount: await button.count(),
    automobilePressed: (await button.count()) > 0 ? await button.first().getAttribute("aria-pressed") : null,
    yearMinCount: await page.getByLabel("Model yılı minimum", { exact: true }).count(),
    yearMaxCount: await page.getByLabel("Model yılı maksimum", { exact: true }).count(),
    kmMinCount: await page.getByLabel("Kilometre minimum", { exact: true }).count(),
    kmMaxCount: await page.getByLabel("Kilometre maksimum", { exact: true }).count(),
    kmMaxVisible:
      (await page.getByLabel("Kilometre maksimum", { exact: true }).count()) > 0
        ? await page.getByLabel("Kilometre maksimum", { exact: true }).first().isVisible()
        : false,
    kmMaxEnabled:
      (await page.getByLabel("Kilometre maksimum", { exact: true }).count()) > 0
        ? await page.getByLabel("Kilometre maksimum", { exact: true }).first().isEnabled()
        : false,
  };
  console.log(`PHASE2_DELTA_STATE ${JSON.stringify(state)}`);
  return state;
}

async function exerciseFilter(page: Page, label: string): Promise<boolean> {
  await page.getByRole("button", { name: /^Filtreler/ }).click();
  await page.getByLabel("Filtre il", { exact: true }).selectOption("Tekirdağ");
  await page.getByLabel("Filtre ilçe", { exact: true }).selectOption("Çorlu");
  await page.getByLabel("Minimum fiyat", { exact: true }).fill("0");
  await page.getByLabel("Maksimum fiyat", { exact: true }).fill("5000");
  await page.getByLabel("Filtre kategori", { exact: true }).selectOption("vehicle");
  await page.getByRole("button", { name: "Otomobil", exact: true }).click();
  await recordState(page, `${label}-after-automobile`);

  const yearMin = page.getByLabel("Model yılı minimum", { exact: true });
  const yearMax = page.getByLabel("Model yılı maksimum", { exact: true });
  const kmMax = page.getByLabel("Kilometre maksimum", { exact: true });
  if ((await yearMin.count()) === 0 || (await yearMax.count()) === 0) {
    await page.screenshot({ path: path.join(resultsDir, `${label}-missing-year.png`), fullPage: true });
    return false;
  }

  await yearMin.fill("2010");
  await recordState(page, `${label}-after-year-min`);
  await yearMax.fill("2020");
  const beforeKm = await recordState(page, `${label}-before-km`);
  await page.screenshot({ path: path.join(resultsDir, `${label}-before-km.png`), fullPage: true });
  if ((beforeKm.kmMaxCount as number) !== 1 || !beforeKm.kmMaxVisible || !beforeKm.kmMaxEnabled) {
    return false;
  }

  await kmMax.fill("120000");
  assert((await kmMax.inputValue()) === "120000", `${label}: Kilometre maksimum did not retain 120000.`);
  return true;
}

const fixture = await getActiveAutomobileFixture();
const browser = await chromium.launch({ headless: true });

try {
  // Exact delta: both cases use a brand-new BrowserContext and the same persisted fixture.
  // The only intentional difference is whether the buyer waits for one rendered result,
  // which is the application invariant that the /ara loader/client result tree is ready.
  const immediateContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const immediatePage = await immediateContext.newPage();
  const immediateErrors: string[] = [];
  immediatePage.on("pageerror", (error) => immediateErrors.push(error.message));
  immediatePage.on("console", (message) => {
    if (message.type() === "error") immediateErrors.push(message.text());
  });
  await immediatePage.goto(`${publicBaseUrl}/ara?q=b150`, { waitUntil: "networkidle" });
  const immediatePassed = await exerciseFilter(immediatePage, "phase2-delta-immediate");
  console.log(
    `PHASE2_DELTA_IMMEDIATE ${immediatePassed ? "PASS" : "FAIL"} errors=${JSON.stringify(immediateErrors)}`,
  );
  await immediateContext.close();

  const readyContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const readyPage = await readyContext.newPage();
  const readyErrors: string[] = [];
  readyPage.on("pageerror", (error) => readyErrors.push(error.message));
  readyPage.on("console", (message) => {
    if (message.type() === "error") readyErrors.push(message.text());
  });
  await readyPage.goto(`${publicBaseUrl}/ara?q=b150`, { waitUntil: "networkidle" });
  await waitForFixture(readyPage, fixture.title);
  const readyPassed = await exerciseFilter(readyPage, "phase2-delta-ready");
  console.log(`PHASE2_DELTA_READY ${readyPassed ? "PASS" : "FAIL"} errors=${JSON.stringify(readyErrors)}`);
  await readyContext.close();

  assert(!immediatePassed, "Immediate buyer unexpectedly passed; loader/result readiness is not the trigger.");
  assert(readyPassed, "Result-ready buyer did not pass; readiness invariant is insufficient.");
  console.log("PHASE2_DELTA_PROVEN result-tree readiness is the minimal buyer precondition difference");
} finally {
  await browser.close();
}
