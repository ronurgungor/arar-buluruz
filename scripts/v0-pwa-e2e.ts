import fs from "node:fs";
import path from "node:path";
import { chromium, type BrowserContext, type Page } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:4174";
const resultsDir = path.resolve("test-results/v0-pwa");
fs.mkdirSync(resultsDir, { recursive: true });

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function assertManifest(context: BrowserContext) {
  const response = await context.request.get(`${baseUrl}/manifest.webmanifest`);
  assert(response.ok(), `Manifest returned HTTP ${response.status()}.`);

  const manifest = (await response.json()) as {
    id?: string;
    name?: string;
    short_name?: string;
    start_url?: string;
    scope?: string;
    display?: string;
    prefer_related_applications?: boolean;
    icons?: Array<{ src?: string; sizes?: string; type?: string; purpose?: string }>;
  };

  assert(manifest.id === "/", `Unexpected app id: ${manifest.id}`);
  assert(manifest.name === "Arar Buluruz", `Unexpected name: ${manifest.name}`);
  assert(manifest.short_name === "Arar Buluruz", "Manifest short_name is missing.");
  assert(manifest.start_url === "/", `Unexpected start_url: ${manifest.start_url}`);
  assert(manifest.scope === "/", `Unexpected scope: ${manifest.scope}`);
  assert(manifest.display === "standalone", `Unexpected display: ${manifest.display}`);
  assert(manifest.prefer_related_applications === false, "Related applications must be false.");

  const icons = manifest.icons ?? [];
  const required = [
    icons.find((icon) => icon.sizes === "192x192" && icon.type === "image/png"),
    icons.find(
      (icon) =>
        icon.sizes === "512x512" && icon.type === "image/png" && icon.purpose === "any",
    ),
    icons.find(
      (icon) =>
        icon.sizes === "512x512" && icon.type === "image/png" && icon.purpose === "maskable",
    ),
  ];

  assert(required.every((icon) => Boolean(icon?.src)), "Manifest icon set is incomplete.");

  for (const icon of required) {
    const iconResponse = await context.request.get(new URL(icon!.src!, baseUrl).toString());
    assert(iconResponse.ok(), `${icon!.src} returned HTTP ${iconResponse.status()}.`);
    assert(
      iconResponse.headers()["content-type"]?.startsWith("image/png") === true,
      `${icon!.src} is not image/png.`,
    );
  }
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

async function ensureControlledServiceWorker(page: Page) {
  await page.waitForFunction(
    async () => {
      const registration = await navigator.serviceWorker.getRegistration("/");
      return Boolean(registration?.active);
    },
    undefined,
    { timeout: 15_000 },
  );
  await page.reload({ waitUntil: "domcontentloaded", timeout: 15_000 });
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, undefined, {
    timeout: 15_000,
  });
}

async function assertCacheBoundary(page: Page) {
  const state = await page.evaluate(async () => {
    const names = await caches.keys();
    const paths: string[] = [];
    for (const name of names) {
      const cache = await caches.open(name);
      paths.push(...(await cache.keys()).map((request) => new URL(request.url).pathname));
    }
    return { names, paths };
  });

  assert(
    state.names.length === 1 && state.names[0] === "arar-buluruz-v0-shell-v1",
    `Unexpected caches: ${JSON.stringify(state.names)}`,
  );
  assert(state.paths.includes("/offline.html"), "Offline fallback is not precached.");
  assert(state.paths.includes("/manifest.webmanifest"), "Manifest is not precached.");
  assert(
    state.paths.every((value) => !value.startsWith("/ara") && !value.startsWith("/ilan/")),
    `Dynamic content entered the cache: ${JSON.stringify(state.paths)}`,
  );
}

async function runDesktop() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    serviceWorkers: "allow",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  page.setDefaultNavigationTimeout(15_000);
  const backendRequests: string[] = [];

  page.on("request", (request) => {
    const url = new URL(request.url());
    if (
      url.pathname.startsWith("/rest/v1") ||
      url.pathname.startsWith("/auth/v1") ||
      url.hostname.endsWith("supabase.co")
    ) {
      backendRequests.push(request.url());
    }
  });

  try {
    console.log("V0 PWA: validating manifest and icons");
    await assertManifest(context);

    console.log("V0 PWA: validating desktop shell and service worker");
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.getByTestId("v0-notice").waitFor();
    await page.getByText("İlanlar örnektir", { exact: false }).waitFor();
    await ensureControlledServiceWorker(page);
    await assertCacheBoundary(page);
    await assertNoHorizontalOverflow(page, "/");
    await page.screenshot({ path: path.join(resultsDir, "desktop-home.png"), fullPage: true });

    console.log("V0 PWA: validating synthetic discovery");
    await page.goto(`${baseUrl}/ara?q=trakt%C3%B6r&il=T%C3%BCm+T%C3%BCrkiye&sirala=yeni`, {
      waitUntil: "domcontentloaded",
    });
    await page.getByText("ilan bulundu", { exact: false }).waitFor();
    await page.getByText("Yakın (örnek)", { exact: true }).first().waitFor();
    await assertNoHorizontalOverflow(page, "/ara");

    console.log("V0 PWA: validating disabled real operations");
    await page.goto(`${baseUrl}/ilan-ver`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { level: 1, name: "İlan verme demosu" }).waitFor();
    assert((await page.locator("form").count()) === 0, "V0 rendered a listing form.");
    assert(
      (await page.locator("input, textarea, select").count()) === 0,
      "V0 collected listing data.",
    );
    await page.goto(`${baseUrl}/giris`, { waitUntil: "domcontentloaded" });
    await page.getByText("Pilot sürecinde giriş bulunmuyor.", { exact: true }).waitFor();
    assert((await page.locator("input").count()) === 0, "V0 rendered an account input.");
    assert(backendRequests.length === 0, `V0 called a backend: ${backendRequests.join(" | ")}`);
  } finally {
    await context.close();
    await browser.close();
  }
}

async function runMobileOffline() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    serviceWorkers: "allow",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  page.setDefaultNavigationTimeout(15_000);

  try {
    console.log("V0 PWA: validating mobile shell");
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.getByTestId("v0-notice").waitFor();
    await ensureControlledServiceWorker(page);
    await assertNoHorizontalOverflow(page, "/ mobile");
    await page.screenshot({ path: path.join(resultsDir, "mobile-home.png"), fullPage: true });

    console.log("V0 PWA: validating honest offline fallback");
    await context.setOffline(true);
    await page.goto(`${baseUrl}/offline-probe`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { level: 1, name: "Bağlantı yok" }).waitFor();
    await page.getByText("dinamik ilanları çevrimdışı saklamaz", { exact: false }).waitFor();
    await assertNoHorizontalOverflow(page, "/offline-probe");
    await page.screenshot({ path: path.join(resultsDir, "mobile-offline.png"), fullPage: true });
  } finally {
    await context.setOffline(false);
    await context.close();
    await browser.close();
  }
}

await runDesktop();
await runMobileOffline();
console.log("V0 minimal PWA browser validation passed.");
