import fs from "node:fs";
import path from "node:path";
import { chromium, type BrowserContext, type Page } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:4174";
const resultsDir = path.resolve("test-results/v0-pwa");
fs.mkdirSync(resultsDir, { recursive: true });

type V0Global = typeof globalThis & {
  __stopV0Server?: () => Promise<void>;
};

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function isForbiddenRequest(requestUrl: string) {
  const url = new URL(requestUrl);
  const hostname = url.hostname.toLowerCase();
  const pathname = url.pathname.toLowerCase();

  return (
    pathname.startsWith("/rest/v1") ||
    pathname.startsWith("/auth/v1") ||
    hostname.endsWith("supabase.co") ||
    hostname === "fonts.googleapis.com" ||
    hostname === "fonts.gstatic.com" ||
    hostname.endsWith("google-analytics.com") ||
    hostname.endsWith("googletagmanager.com") ||
    hostname.endsWith("doubleclick.net") ||
    hostname.endsWith("googlesyndication.com") ||
    hostname.endsWith("plausible.io") ||
    hostname.endsWith("usefathom.com") ||
    hostname.includes("umami") ||
    hostname.includes("segment") ||
    hostname.includes("mixpanel") ||
    hostname.includes("amplitude")
  );
}

function trackForbiddenRequests(page: Page) {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (isForbiddenRequest(request.url())) requests.push(request.url());
  });
  return requests;
}

async function gotoOk(page: Page, url: string) {
  const response = await page.goto(url, { waitUntil: "domcontentloaded" });
  assert(response?.ok() === true, `${url} returned HTTP ${response?.status() ?? "unknown"}.`);
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
      (icon) => icon.sizes === "512x512" && icon.type === "image/png" && icon.purpose === "any",
    ),
    icons.find(
      (icon) =>
        icon.sizes === "512x512" && icon.type === "image/png" && icon.purpose === "maskable",
    ),
  ];

  assert(
    required.every((icon) => Boolean(icon?.src)),
    "Manifest icon set is incomplete.",
  );

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

async function assertNoTrackingMarkup(page: Page, route: string) {
  const state = await page.evaluate(() => ({
    fontLinks: Array.from(document.querySelectorAll<HTMLLinkElement>("link[href]")).filter((link) =>
      /fonts\.(googleapis|gstatic)\.com/i.test(link.href),
    ).length,
    trackingScripts: Array.from(document.querySelectorAll<HTMLScriptElement>("script[src]")).filter(
      (script) =>
        /google-analytics|googletagmanager|doubleclick|googlesyndication|plausible|fathom|umami|segment|mixpanel|amplitude/i.test(
          script.src,
        ),
    ).length,
  }));

  assert(state.fontLinks === 0, `${route} contains an external Google Fonts link.`);
  assert(state.trackingScripts === 0, `${route} contains analytics or advertising markup.`);
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

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const isControlled = await page.evaluate(() => navigator.serviceWorker.controller !== null);
    if (isControlled) return;

    await page.reload({ waitUntil: "domcontentloaded", timeout: 15_000 });

    try {
      await page.waitForFunction(() => navigator.serviceWorker.controller !== null, undefined, {
        timeout: 5_000,
      });
      return;
    } catch {
      if (attempt === 3) {
        throw new Error("The active service worker did not control the page after three reloads.");
      }
    }
  }
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
  const forbiddenRequests = trackForbiddenRequests(page);

  try {
    console.log("V0 PWA: validating manifest and icons");
    await assertManifest(context);

    console.log("V0 PWA: validating desktop shell and service worker");
    await gotoOk(page, baseUrl);
    await page.getByTestId("v0-notice").waitFor();
    await page.getByText("İlanlar örnektir", { exact: false }).waitFor();
    await page.getByRole("link", { name: "Gizlilik" }).waitFor();
    await ensureControlledServiceWorker(page);
    await assertCacheBoundary(page);
    await assertNoTrackingMarkup(page, "/");
    await assertNoHorizontalOverflow(page, "/");
    await page.screenshot({ path: path.join(resultsDir, "desktop-home.png"), fullPage: true });

    console.log("V0 PWA: validating synthetic discovery and detail routes");
    await gotoOk(page, `${baseUrl}/ara?q=trakt%C3%B6r&il=T%C3%BCm+T%C3%BCrkiye&sirala=yeni`);
    await page.getByText("ilan bulundu", { exact: false }).waitFor();
    await page.getByText("Yakın (örnek)", { exact: true }).first().waitFor();
    await assertNoTrackingMarkup(page, "/ara");
    await assertNoHorizontalOverflow(page, "/ara");

    console.log("V0 PWA: validating dependent city and district filters");
    await gotoOk(
      page,
      `${baseUrl}/ara?q=&il=T%C3%BCm+T%C3%BCrkiye&ilce=T%C3%BCm+il%C3%A7eler&sirala=yeni`,
    );
    const citySelect = page.getByLabel("Konum");
    const districtSelect = page.getByLabel("İlçe");
    await districtSelect.waitFor();
    assert(
      await districtSelect.isDisabled(),
      "District filter must be disabled before a specific city is selected.",
    );

    await citySelect.selectOption({ label: "Konya" });
    await page.waitForURL((url) => {
      return (
        url.searchParams.get("il") === "Konya" && url.searchParams.get("ilce") === "Tüm ilçeler"
      );
    });
    assert(!(await districtSelect.isDisabled()), "District filter did not enable for Konya.");
    assert(
      (await districtSelect.locator("option").allTextContents()).includes("Çumra"),
      "Konya district options did not include Çumra.",
    );

    await districtSelect.selectOption({ label: "Çumra" });
    await page.waitForURL((url) => url.searchParams.get("ilce") === "Çumra");
    await page.getByText("Sahibinden temiz bahçe traktörü", { exact: true }).waitFor();
    assert(
      (await page.locator('a[href^="/ilan/"]').count()) === 1,
      "Konya / Çumra filter did not reduce the results to one synthetic listing.",
    );

    await citySelect.selectOption({ label: "İzmir" });
    await page.waitForURL((url) => {
      return (
        url.searchParams.get("il") === "İzmir" && url.searchParams.get("ilce") === "Tüm ilçeler"
      );
    });
    assert(
      (await districtSelect.inputValue()) === "Tüm ilçeler",
      "Changing the city did not reset the district selection.",
    );
    assert(
      (await districtSelect.locator("option").allTextContents()).includes("Karşıyaka"),
      "İzmir district options did not include Karşıyaka.",
    );
    await page.getByText("Ahşap yemek masası ve 4 sandalye", { exact: true }).waitFor();
    await assertNoHorizontalOverflow(page, "/ara district filter");

    const detailHref = await page.locator('a[href^="/ilan/"]').first().getAttribute("href");
    assert(detailHref, "Synthetic search did not expose a listing-detail link.");
    await gotoOk(page, `${baseUrl}${detailHref}`);
    await assertNoTrackingMarkup(page, detailHref);
    await assertNoHorizontalOverflow(page, detailHref);

    const listingId = detailHref.split("/").filter(Boolean).at(-1);
    assert(listingId, "Listing ID could not be derived from the detail route.");
    await gotoOk(page, `${baseUrl}/sikayet/${listingId}`);
    await page.getByRole("heading", { level: 1, name: "Şikâyet demosu" }).waitFor();
    assert(
      (await page.locator("form, input, textarea, select").count()) === 0,
      "V0 collected complaint data.",
    );
    await assertNoTrackingMarkup(page, `/sikayet/${listingId}`);

    console.log("V0 PWA: validating disabled real operations");
    await gotoOk(page, `${baseUrl}/ilan-ver`);
    await page.getByRole("heading", { level: 1, name: "İlan verme demosu" }).waitFor();
    assert((await page.locator("form").count()) === 0, "V0 rendered a listing form.");
    assert(
      (await page.locator("input, textarea, select").count()) === 0,
      "V0 collected listing data.",
    );
    await assertNoTrackingMarkup(page, "/ilan-ver");

    await gotoOk(page, `${baseUrl}/giris`);
    await page.getByText("Pilot sürecinde giriş bulunmuyor.", { exact: true }).waitFor();
    assert((await page.locator("input").count()) === 0, "V0 rendered an account input.");
    await assertNoTrackingMarkup(page, "/giris");

    console.log("V0 PWA: validating minimum privacy disclosure");
    await gotoOk(page, `${baseUrl}/gizlilik`);
    await page.getByRole("heading", { level: 1, name: "Gizlilik" }).waitFor();
    await page.getByText("synthetic/mock ilanlarla", { exact: false }).waitFor();
    await page.getByText("Gerçek hesap açılmaz", { exact: false }).waitFor();
    await page.getByText("Reklam ve analytics kullanılmaz", { exact: false }).waitFor();
    await page.getByText("Zorunlu olmayan çerez veya tracker", { exact: false }).waitFor();
    await page.getByText("teknik erişim kayıtları tutabilir", { exact: false }).waitFor();
    await page.getByText("merkezi telefon ve WhatsApp hattıdır", { exact: false }).waitFor();
    assert(
      (await page.locator("form, input, textarea, select").count()) === 0,
      "Privacy page collected data.",
    );
    await assertNoTrackingMarkup(page, "/gizlilik");
    await assertNoHorizontalOverflow(page, "/gizlilik");
    await page.screenshot({ path: path.join(resultsDir, "desktop-privacy.png"), fullPage: true });

    const cookies = await context.cookies(baseUrl);
    assert(
      cookies.length === 0,
      `V0 created cookies: ${cookies.map((cookie) => cookie.name).join(", ")}`,
    );
    assert(
      forbiddenRequests.length === 0,
      `V0 made a forbidden request: ${forbiddenRequests.join(" | ")}`,
    );
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
  const forbiddenRequests = trackForbiddenRequests(page);

  try {
    console.log("V0 PWA: validating mobile shell and privacy route");
    await gotoOk(page, baseUrl);
    await page.getByTestId("v0-notice").waitFor();
    await page.getByRole("link", { name: "Gizlilik" }).waitFor();
    await ensureControlledServiceWorker(page);
    await assertNoTrackingMarkup(page, "/ mobile");
    await assertNoHorizontalOverflow(page, "/ mobile");
    await page.screenshot({ path: path.join(resultsDir, "mobile-home.png"), fullPage: true });

    await gotoOk(page, `${baseUrl}/gizlilik`);
    await page.getByRole("heading", { level: 1, name: "Gizlilik" }).waitFor();
    await assertNoTrackingMarkup(page, "/gizlilik mobile");
    await assertNoHorizontalOverflow(page, "/gizlilik mobile");
    await page.screenshot({ path: path.join(resultsDir, "mobile-privacy.png"), fullPage: true });

    const cookies = await context.cookies(baseUrl);
    assert(
      cookies.length === 0,
      `Mobile V0 created cookies: ${cookies.map((cookie) => cookie.name).join(", ")}`,
    );
    assert(
      forbiddenRequests.length === 0,
      `Mobile V0 made a forbidden request: ${forbiddenRequests.join(" | ")}`,
    );

    console.log("V0 PWA: validating honest offline fallback through a real server outage");
    const stopServer = (globalThis as V0Global).__stopV0Server;
    assert(stopServer, "The V0 runner did not provide a server-stop hook.");
    await stopServer();

    await page.evaluate(() => {
      window.location.assign("/offline-probe");
    });
    await page.getByRole("heading", { level: 1, name: "Bağlantı yok" }).waitFor();
    await page.getByText("dinamik ilanları çevrimdışı saklamaz", { exact: false }).waitFor();
    await assertNoHorizontalOverflow(page, "/offline-probe");
    await page.screenshot({ path: path.join(resultsDir, "mobile-offline.png"), fullPage: true });
  } finally {
    await context.close();
    await browser.close();
  }
}

await runDesktop();
await runMobileOffline();
console.log("V0 minimal PWA browser validation passed.");
