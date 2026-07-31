import fs from "node:fs";
import path from "node:path";
import { chromium, type BrowserContext, type Page } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:4174";
const resultsDir = path.resolve("test-results/v0-pwa");
fs.mkdirSync(resultsDir, { recursive: true });

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function assertNoHorizontalOverflow(page: Page, route: string) {
  const dimensions = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));

  assert(
    dimensions.documentWidth <= dimensions.viewportWidth,
    `${route} has horizontal overflow: ${JSON.stringify(dimensions)}`,
  );
}

async function assertManifestAndIcons(context: BrowserContext) {
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

  assert(manifest.id === "/", `Unexpected durable app id: ${manifest.id}`);
  assert(manifest.name === "Arar Buluruz", `Unexpected manifest name: ${manifest.name}`);
  assert(manifest.short_name === "Arar Buluruz", "Manifest short_name is missing.");
  assert(manifest.start_url === "/", `Unexpected start_url: ${manifest.start_url}`);
  assert(manifest.scope === "/", `Unexpected scope: ${manifest.scope}`);
  assert(manifest.display === "standalone", `Unexpected display mode: ${manifest.display}`);
  assert(
    manifest.prefer_related_applications === false,
    "Manifest must not prefer another application.",
  );

  const icons = manifest.icons ?? [];
  const standard192 = icons.find(
    (icon) => icon.sizes === "192x192" && icon.type === "image/png",
  );
  const standard512 = icons.find(
    (icon) => icon.sizes === "512x512" && icon.type === "image/png" && icon.purpose === "any",
  );
  const maskable512 = icons.find(
    (icon) => icon.sizes === "512x512" && icon.type === "image/png" && icon.purpose === "maskable",
  );

  assert(standard192?.src, "Manifest is missing the 192x192 PNG icon.");
  assert(standard512?.src, "Manifest is missing the standard 512x512 PNG icon.");
  assert(maskable512?.src, "Manifest is missing the maskable 512x512 PNG icon.");

  for (const icon of [standard192, standard512, maskable512]) {
    const iconResponse = await context.request.get(new URL(icon.src!, baseUrl).toString());
    assert(iconResponse.ok(), `${icon.src} returned HTTP ${iconResponse.status()}.`);
    assert(
      iconResponse.headers()["content-type"]?.startsWith("image/png") === true,
      `${icon.src} did not return image/png.`,
    );
  }
}

async function waitForControlledServiceWorker(page: Page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
}

async function assertCacheBoundary(page: Page) {
  const cacheState = await page.evaluate(async () => {
    const names = await caches.keys();
    const entries: string[] = [];

    for (const name of names) {
      const cache = await caches.open(name);
      const requests = await cache.keys();
      entries.push(...requests.map((request) => new URL(request.url).pathname));
    }

    return { names, entries };
  });

  assert(
    cacheState.names.length === 1 && cacheState.names[0] === "arar-buluruz-v0-shell-v1",
    `Unexpected V0 caches: ${JSON.stringify(cacheState.names)}`,
  );

  const expectedShell = [
    "/offline.html",
    "/manifest.webmanifest",
    "/icons/icon-192.png",
    "/icons/icon-512.png",
    "/icons/icon-512-maskable.png",
  ];

  for (const pathname of expectedShell) {
    assert(cacheState.entries.includes(pathname), `Precache is missing ${pathname}.`);
  }

  assert(
    cacheState.entries.every(
      (pathname) => !pathname.startsWith("/ara") && !pathname.startsWith("/ilan/"),
    ),
    `Dynamic listing content entered the cache: ${JSON.stringify(cacheState.entries)}`,
  );
}

async function runDesktop() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    serviceWorkers: "allow",
  });
  const page = await context.newPage();
  const unexpectedBackendRequests: string[] = [];
  const runtimeErrors: string[] = [];

  page.on("pageerror", (error) => runtimeErrors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(`console: ${message.text()}`);
  });
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (
      url.pathname.startsWith("/rest/v1") ||
      url.pathname.startsWith("/auth/v1") ||
      url.hostname.endsWith("supabase.co")
    ) {
      unexpectedBackendRequests.push(request.url());
    }
  });

  try {
    await assertManifestAndIcons(context);
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.getByTestId("v0-notice").waitFor();
    await page.getByText("V0 — UX ve değer önerisi doğrulaması", { exact: false }).waitFor();
    await page.getByText("İlanlar örnektir", { exact: false }).waitFor();
    await assertNoHorizontalOverflow(page, "/");
    await waitForControlledServiceWorker(page);
    await assertCacheBoundary(page);

    await page.screenshot({
      path: path.join(resultsDir, "desktop-home.png"),
      fullPage: true,
    });

    await page.goto(`${baseUrl}/ara?q=trakt%C3%B6r&il=T%C3%BCm+T%C3%BCrkiye&sirala=yeni`, {
      waitUntil: "networkidle",
    });
    await page.getByText("ilan bulundu", { exact: false }).waitFor();
    await page.getByText("Yakın (örnek)", { exact: true }).first().waitFor();
    await assertNoHorizontalOverflow(page, "/ara");

    await page.goto(`${baseUrl}/ilan-ver`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { level: 1, name: "İlan verme demosu" }).waitFor();
    assert((await page.locator("form").count()) === 0, "V0 rendered a real listing form.");
    assert(
      (await page.locator("input, textarea, select").count()) === 0,
      "V0 collected listing data.",
    );

    await page.goto(`${baseUrl}/giris`, { waitUntil: "networkidle" });
    await page.getByText("Pilot sürecinde giriş bulunmuyor.", { exact: true }).waitFor();
    assert((await page.locator("input").count()) === 0, "V0 rendered an account input.");

    assert(
      unexpectedBackendRequests.length === 0,
      `V0 called a backend endpoint: ${unexpectedBackendRequests.join(" | ")}`,
    );
    assert(runtimeErrors.length === 0, `Desktop runtime errors: ${runtimeErrors.join(" | ")}`);
  } finally {
    await context.close();
    await browser.close();
  }
}

async function runMobileAndOffline() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    serviceWorkers: "allow",
  });
  const page = await context.newPage();

  try {
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.getByTestId("v0-notice").waitFor();
    await waitForControlledServiceWorker(page);
    await assertNoHorizontalOverflow(page, "/ mobile");

    await page.screenshot({
      path: path.join(resultsDir, "mobile-home.png"),
      fullPage: true,
    });

    await context.setOffline(true);
    await page.goto(`${baseUrl}/offline-probe`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { level: 1, name: "Bağlantı yok" }).waitFor();
    await page.getByText("dinamik ilanları çevrimdışı saklamaz", { exact: false }).waitFor();
    await assertNoHorizontalOverflow(page, "/offline-probe");

    await page.screenshot({
      path: path.join(resultsDir, "mobile-offline.png"),
      fullPage: true,
    });
  } finally {
    await context.setOffline(false);
    await context.close();
    await browser.close();
  }
}

await runDesktop();
await runMobileAndOffline();
console.log("V0 minimal PWA browser validation passed.");
