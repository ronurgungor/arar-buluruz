import fs from "node:fs";
import path from "node:path";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

const publicBaseUrl = process.env.PUBLIC_BASE_URL ?? "http://127.0.0.1:4173";
const founderBaseUrl = process.env.FOUNDER_BASE_URL ?? "http://127.0.0.1:4175";
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
  assert(rows.length === 1 && rows[0], "Expected one active Automobile fixture.");
  return rows[0];
}

async function recordState(page: Page, label: string, errors: string[]): Promise<void> {
  const automobile = page.getByRole("button", { name: "Otomobil", exact: true });
  const kmMax = page.getByLabel("Kilometre maksimum", { exact: true });
  const state = {
    label,
    url: page.url(),
    drawerDialogs: await page.getByRole("dialog").count(),
    automobileCount: await automobile.count(),
    automobilePressed:
      (await automobile.count()) > 0 ? await automobile.first().getAttribute("aria-pressed") : null,
    yearMinCount: await page.getByLabel("Model yılı minimum", { exact: true }).count(),
    yearMaxCount: await page.getByLabel("Model yılı maksimum", { exact: true }).count(),
    kmMinCount: await page.getByLabel("Kilometre minimum", { exact: true }).count(),
    kmMaxCount: await kmMax.count(),
    kmMaxVisible: (await kmMax.count()) > 0 ? await kmMax.first().isVisible() : false,
    kmMaxEnabled: (await kmMax.count()) > 0 ? await kmMax.first().isEnabled() : false,
    errors,
  };
  console.log(`PHASE2_PRECONDITION_STATE ${JSON.stringify(state)}`);
}

function observe(page: Page, errors: string[]): void {
  page.on("pageerror", (error) => errors.push(`pageerror:${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console:${message.text()}`);
  });
}

async function exerciseFilter(page: Page, label: string, errors: string[]): Promise<boolean> {
  await page.getByRole("button", { name: /^Filtreler/ }).click();
  await page.getByLabel("Filtre il", { exact: true }).selectOption("Tekirdağ");
  await page.getByLabel("Filtre ilçe", { exact: true }).selectOption("Çorlu");
  await page.getByLabel("Minimum fiyat", { exact: true }).fill("0");
  await page.getByLabel("Maksimum fiyat", { exact: true }).fill("5000");
  await page.getByLabel("Filtre kategori", { exact: true }).selectOption("vehicle");
  await page.getByRole("button", { name: "Otomobil", exact: true }).click();
  await page.getByLabel("Model yılı minimum", { exact: true }).fill("2010");
  await page.getByLabel("Model yılı maksimum", { exact: true }).fill("2020");
  await recordState(page, `${label}-before-km`, errors);
  await page.screenshot({
    path: path.join(resultsDir, `${label}-before-km.png`),
    fullPage: true,
  });

  const kmMax = page.getByLabel("Kilometre maksimum", { exact: true });
  if ((await kmMax.count()) !== 1 || !(await kmMax.isVisible()) || !(await kmMax.isEnabled())) {
    return false;
  }
  await kmMax.fill("120000", { timeout: 5000 });
  return (await kmMax.inputValue()) === "120000";
}

async function createPage(context: BrowserContext, errors: string[], url?: string): Promise<Page> {
  const page = await context.newPage();
  observe(page, errors);
  if (url) await page.goto(url, { waitUntil: "networkidle" });
  return page;
}

type Setup = (browser: Browser, errors: string[]) => Promise<BrowserContext[]>;

async function runCase(label: string, setup: Setup): Promise<boolean> {
  const browser = await chromium.launch({ headless: true });
  const errors: string[] = [];
  const setupContexts: BrowserContext[] = [];
  try {
    setupContexts.push(...(await setup(browser, errors)));
    const buyerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const buyerPage = await createPage(buyerContext, errors, `${publicBaseUrl}/ara?q=b150`);
    const passed = await exerciseFilter(buyerPage, label, errors);
    console.log(
      `PHASE2_PRECONDITION_RESULT ${JSON.stringify({ label, passed, errors, contextCount: browser.contexts().length })}`,
    );
    await buyerContext.close();
    return passed;
  } catch (error) {
    console.log(
      `PHASE2_PRECONDITION_RESULT ${JSON.stringify({ label, passed: false, errors, thrown: String(error), contextCount: browser.contexts().length })}`,
    );
    return false;
  } finally {
    for (const context of setupContexts.reverse()) {
      if (browser.contexts().includes(context)) await context.close();
    }
    await browser.close();
  }
}

const fixture = await getActiveAutomobileFixture();
console.log(`PHASE2_PRECONDITION_FIXTURE ${JSON.stringify(fixture)}`);

const baseline = await runCase("phase2-precondition-baseline", async () => []);

const idleExtras = await runCase("phase2-precondition-idle-extras", async (browser, errors) => {
  const owner = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const compatibility = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const other = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const stale = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await createPage(owner, errors);
  await createPage(owner, errors);
  await createPage(compatibility, errors);
  await createPage(other, errors);
  await createPage(stale, errors);
  await compatibility.close();
  return [owner, other, stale];
});

const navigatedExtras = await runCase(
  "phase2-precondition-navigated-extras",
  async (browser, errors) => {
    const owner = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const compatibility = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const other = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const stale = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await createPage(owner, errors, `${publicBaseUrl}/ilan-ver`);
    await createPage(owner, errors, `${founderBaseUrl}/kurucu`);
    await createPage(compatibility, errors, publicBaseUrl);
    await createPage(other, errors, `${publicBaseUrl}/ilanlarim`);
    await createPage(stale, errors, `${publicBaseUrl}/ilanlarim`);
    await compatibility.close();
    return [owner, other, stale];
  },
);

const responsiveChurn = await runCase(
  "phase2-precondition-responsive-churn",
  async (browser, errors) => {
    const owner = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const compatibility = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const other = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const stale = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const ownerPage = await createPage(owner, errors);
    for (const viewport of [
      { width: 360, height: 780 },
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 1280, height: 900 },
    ]) {
      await ownerPage.setViewportSize(viewport);
      await ownerPage.goto(`${publicBaseUrl}/ilan-ver`, { waitUntil: "networkidle" });
      await ownerPage.getByRole("heading", { level: 1, name: "İlan Ver" }).waitFor();
    }
    await ownerPage.setViewportSize({ width: 390, height: 844 });
    await createPage(owner, errors, `${founderBaseUrl}/kurucu`);
    await createPage(compatibility, errors, publicBaseUrl);
    await createPage(other, errors, `${publicBaseUrl}/ilanlarim`);
    await createPage(stale, errors, `${publicBaseUrl}/ilanlarim`);
    await compatibility.close();
    return [owner, other, stale];
  },
);

console.log(
  `PHASE2_PRECONDITION_SUMMARY ${JSON.stringify({ baseline, idleExtras, navigatedExtras, responsiveChurn })}`,
);
assert(baseline, "Fresh-browser baseline must pass before interpreting precondition deltas.");
