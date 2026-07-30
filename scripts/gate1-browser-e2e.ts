/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const playwrightModule = process.env.PLAYWRIGHT_MODULE;
if (!playwrightModule) {
  throw new Error("PLAYWRIGHT_MODULE is required for the transient browser test.");
}

const { chromium } = await import(pathToFileURL(path.join(playwrightModule, "index.js")).href);
const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:4173";
const resultsDir = path.resolve("test-results/gate1-browser");
fs.mkdirSync(resultsDir, { recursive: true });

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function assertNoHorizontalOverflow(page: any, profile: string, route: string) {
  const dimensions = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));

  assert(
    dimensions.documentWidth <= dimensions.viewportWidth,
    `${profile} ${route} has horizontal overflow: ${JSON.stringify(dimensions)}`,
  );
}

function assertCleanRuntime(runtimeErrors: string[], profile: string) {
  assert(
    runtimeErrors.length === 0,
    `${profile} browser runtime errors: ${runtimeErrors.join(" | ")}`,
  );
}

async function runProfile(
  browser: any,
  profile: {
    name: string;
    viewport: { width: number; height: number };
    isMobile: boolean;
    hasTouch: boolean;
  },
) {
  const context = await browser.newContext({
    viewport: profile.viewport,
    isMobile: profile.isMobile,
    hasTouch: profile.hasTouch,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const runtimeErrors: string[] = [];

  page.on("pageerror", (error: Error) => runtimeErrors.push(`pageerror: ${error.message}`));
  page.on("console", (message: any) => {
    if (message.type() === "error") runtimeErrors.push(`console: ${message.text()}`);
  });

  await page.goto(`${baseUrl}/ara`, { waitUntil: "networkidle" });
  await page.getByText("1 ilan bulundu", { exact: true }).waitFor();

  assert(
    (await page.getByText("Visible integration listing", { exact: true }).count()) === 1,
    `${profile.name} search did not render the single RLS-visible fixture.`,
  );
  assert(
    (await page.getByText("Draft integration listing", { exact: true }).count()) === 0,
    `${profile.name} search exposed the draft fixture.`,
  );
  assert(
    (await page.getByText("Expired integration listing", { exact: true }).count()) === 0,
    `${profile.name} search exposed the expired fixture.`,
  );
  assert(
    (await page.getByText("Yakın (örnek)", { exact: true }).count()) === 0,
    `${profile.name} real-data search exposed mock distance sorting.`,
  );
  assert(
    (await page.getByText("Reklam", { exact: true }).count()) === 0,
    `${profile.name} real-data search exposed a mock ad slot.`,
  );

  await assertNoHorizontalOverflow(page, profile.name, "/ara");
  await page.screenshot({
    path: path.join(resultsDir, `${profile.name}-search.png`),
    fullPage: true,
  });

  await page
    .getByRole("link", { name: /Visible integration listing/ })
    .first()
    .click();
  await page.waitForLoadState("networkidle");
  await page.getByRole("heading", { level: 1, name: "Visible integration listing" }).waitFor();

  assert(
    (await page.getByText("Pilot Seller", { exact: true }).count()) === 1,
    `${profile.name} detail did not render the approved seller display name.`,
  );
  assert(
    (await page.getByText("Bu pilot ilanında fotoğraf bulunmuyor.", { exact: true }).count()) === 1,
    `${profile.name} detail did not render the honest no-photo state.`,
  );
  assert(
    (await page.getByText("Reklam", { exact: true }).count()) === 0,
    `${profile.name} real listing detail exposed a mock ad slot.`,
  );

  await assertNoHorizontalOverflow(page, profile.name, "/ilan/$id");
  await page.screenshot({
    path: path.join(resultsDir, `${profile.name}-detail.png`),
    fullPage: true,
  });

  await page.goto(`${baseUrl}/giris`, { waitUntil: "networkidle" });
  await page.getByText("Pilot sürecinde giriş bulunmuyor.", { exact: true }).waitFor();
  assert(
    (await page.locator("input").count()) === 0,
    `${profile.name} pilot login route unexpectedly rendered an auth input.`,
  );
  await assertNoHorizontalOverflow(page, profile.name, "/giris");

  await page.goto(`${baseUrl}/ilan-ver`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { level: 1, name: "İlan Başvurusu" }).waitFor();
  assert(
    (await page.getByText("Bu form veritabanına kayıt yazmaz.", { exact: false }).count()) === 1,
    `${profile.name} listing application did not disclose the no-database-write boundary.`,
  );
  assert(
    (await page.getByRole("button", { name: "WhatsApp ile başvur" }).count()) === 1,
    `${profile.name} listing application did not expose the controlled WhatsApp action.`,
  );
  await assertNoHorizontalOverflow(page, profile.name, "/ilan-ver");

  assertCleanRuntime(runtimeErrors, profile.name);
  await context.close();
  console.log(`Gate 1 ${profile.name} browser E2E passed.`);
}

const browser = await chromium.launch({ headless: true });

try {
  await runProfile(browser, {
    name: "desktop",
    viewport: { width: 1440, height: 900 },
    isMobile: false,
    hasTouch: false,
  });
  await runProfile(browser, {
    name: "mobile",
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
} finally {
  await browser.close();
}
