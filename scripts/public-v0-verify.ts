import fs from "node:fs";
import path from "node:path";
import { chromium, type BrowserContext, type Page } from "playwright";

const baseUrl = process.env.BASE_URL ?? "https://arar-buluruz.lovable.app";
const evidenceDir = path.resolve("test-results/public-v0");
fs.mkdirSync(evidenceDir, { recursive: true });

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function isForbiddenRequest(requestUrl: string) {
  const url = new URL(requestUrl);
  const host = url.hostname.toLowerCase();
  const pathname = url.pathname.toLowerCase();

  return (
    pathname.startsWith("/rest/v1") ||
    pathname.startsWith("/auth/v1") ||
    host.endsWith("supabase.co") ||
    host === "fonts.googleapis.com" ||
    host === "fonts.gstatic.com" ||
    host.endsWith("google-analytics.com") ||
    host.endsWith("googletagmanager.com") ||
    host.endsWith("doubleclick.net") ||
    host.endsWith("googlesyndication.com") ||
    host.endsWith("plausible.io") ||
    host.endsWith("usefathom.com") ||
    host.includes("umami") ||
    host.includes("segment") ||
    host.includes("mixpanel") ||
    host.includes("amplitude")
  );
}

function watchForbiddenRequests(page: Page) {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (isForbiddenRequest(request.url())) requests.push(request.url());
  });
  return requests;
}

async function gotoOk(page: Page, route: string) {
  const response = await page.goto(new URL(route, baseUrl).toString(), {
    waitUntil: "domcontentloaded",
  });
  assert(response?.ok() === true, `${route} returned HTTP ${response?.status() ?? "unknown"}.`);
}

async function sameOriginFetch(page: Page, route: string) {
  return page.evaluate(async (path) => {
    const response = await fetch(path, { cache: "no-store" });
    return {
      ok: response.ok,
      status: response.status,
      contentType: response.headers.get("content-type"),
      text: await response.text(),
    };
  }, route);
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
  assert(state.fontLinks === 0, `${route} contains Google Fonts markup.`);
  assert(state.trackingScripts === 0, `${route} contains tracking or advertising markup.`);
}

async function assertNoOverflow(page: Page, route: string) {
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  assert(
    dimensions.document <= dimensions.viewport,
    `${route} overflows horizontally: ${JSON.stringify(dimensions)}`,
  );
}

function assertOnlyHostingSecurityCookies(
  cookies: Awaited<ReturnType<BrowserContext["cookies"]>>,
  label: string,
) {
  const unexpected = cookies.filter(
    (cookie) =>
      cookie.name !== "__dpl" &&
      cookie.name !== "cf_clearance" &&
      !cookie.name.startsWith("__cf_"),
  );
  assert(
    unexpected.length === 0,
    `${label} created non-hosting cookies: ${unexpected.map((cookie) => cookie.name).join(", ")}`,
  );
}

async function assertInstallability(page: Page) {
  assert(new URL(baseUrl).protocol === "https:", "Public V0 is not served over HTTPS.");

  const manifestResponse = await sameOriginFetch(page, "/manifest.webmanifest");
  assert(manifestResponse.ok, `Manifest returned HTTP ${manifestResponse.status}.`);
  assert(
    manifestResponse.contentType?.startsWith("application/manifest+json") === true,
    `Unexpected manifest content type: ${manifestResponse.contentType}`,
  );
  const manifest = JSON.parse(manifestResponse.text) as {
    id?: string;
    name?: string;
    short_name?: string;
    start_url?: string;
    scope?: string;
    display?: string;
    icons?: Array<{ src?: string; sizes?: string; type?: string; purpose?: string }>;
  };

  assert(manifest.id === "/", `Unexpected manifest id: ${manifest.id}`);
  assert(manifest.name === "Arar Buluruz", `Unexpected manifest name: ${manifest.name}`);
  assert(manifest.short_name === "Arar Buluruz", "Manifest short_name is missing.");
  assert(manifest.start_url === "/", `Unexpected start_url: ${manifest.start_url}`);
  assert(manifest.scope === "/", `Unexpected scope: ${manifest.scope}`);
  assert(manifest.display === "standalone", `Unexpected display: ${manifest.display}`);

  const requiredIcons = [
    manifest.icons?.find((icon) => icon.sizes === "192x192" && icon.type === "image/png"),
    manifest.icons?.find(
      (icon) => icon.sizes === "512x512" && icon.type === "image/png" && icon.purpose === "any",
    ),
    manifest.icons?.find(
      (icon) =>
        icon.sizes === "512x512" && icon.type === "image/png" && icon.purpose === "maskable",
    ),
  ];
  assert(requiredIcons.every(Boolean), "Required installability icons are missing.");

  for (const icon of requiredIcons) {
    const iconResponse = await sameOriginFetch(page, icon!.src!);
    assert(iconResponse.ok, `${icon!.src} returned HTTP ${iconResponse.status}.`);
    assert(
      iconResponse.contentType?.startsWith("image/png") === true,
      `${icon!.src} is not image/png.`,
    );
  }

  await page.waitForFunction(
    async () => Boolean((await navigator.serviceWorker.getRegistration("/"))?.active),
    undefined,
    { timeout: 20_000 },
  );
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, undefined, {
    timeout: 20_000,
  });

  const cacheState = await page.evaluate(async () => {
    const names = await caches.keys();
    const paths: string[] = [];
    for (const name of names) {
      const cache = await caches.open(name);
      paths.push(...(await cache.keys()).map((request) => new URL(request.url).pathname));
    }
    return { names, paths };
  });
  assert(cacheState.names.includes("arar-buluruz-v0-shell-v1"), "Expected V0 shell cache is missing.");
  assert(cacheState.paths.includes("/offline.html"), "Offline fallback is not cached.");
  assert(
    cacheState.paths.every((value) => !value.startsWith("/ara") && !value.startsWith("/ilan/")),
    `Dynamic listing content entered the cache: ${JSON.stringify(cacheState.paths)}`,
  );
}

async function verifyDesktop() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    serviceWorkers: "allow",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  page.setDefaultNavigationTimeout(20_000);
  const forbiddenRequests = watchForbiddenRequests(page);

  try {
    await gotoOk(page, "/");
    await page.getByTestId("v0-notice").waitFor();
    await page.getByText("İlanlar örnektir", { exact: false }).waitFor();
    await page.getByRole("link", { name: "Gizlilik" }).waitFor();
    await assertInstallability(page);
    await assertNoTrackingMarkup(page, "/");
    await assertNoOverflow(page, "/");
    await page.screenshot({ path: path.join(evidenceDir, "public-desktop-home.png"), fullPage: true });

    await gotoOk(page, "/ara?q=trakt%C3%B6r&il=T%C3%BCm+T%C3%BCrkiye&sirala=yakin");
    await page.getByText("ilan bulundu", { exact: false }).waitFor();
    await page.getByText("Yakın (örnek)", { exact: true }).first().waitFor();
    const detailHref = await page.locator('a[href^="/ilan/"]').first().getAttribute("href");
    assert(detailHref, "Synthetic search did not expose a listing detail link.");
    await assertNoTrackingMarkup(page, "/ara");

    await gotoOk(page, detailHref);
    await page.getByText("İlanlar örnektir", { exact: false }).waitFor();
    await assertNoTrackingMarkup(page, detailHref);

    const listingId = detailHref.split("/").filter(Boolean).at(-1);
    assert(listingId, "Listing ID could not be derived.");
    await gotoOk(page, `/sikayet/${listingId}`);
    await page.getByRole("heading", { level: 1, name: "Şikâyet demosu" }).waitFor();
    assert(
      (await page.locator("form, input, textarea, select").count()) === 0,
      "Complaint data collection is active.",
    );

    await gotoOk(page, "/ilan-ver");
    await page.getByRole("heading", { level: 1, name: "İlan verme demosu" }).waitFor();
    assert(
      (await page.locator("form, input, textarea, select").count()) === 0,
      "Listing data collection is active.",
    );

    await gotoOk(page, "/giris");
    await page.getByText("Pilot sürecinde giriş bulunmuyor.", { exact: true }).waitFor();
    assert((await page.locator("input").count()) === 0, "Account input is active.");

    await gotoOk(page, "/gizlilik");
    await page.getByRole("heading", { level: 1, name: "Gizlilik" }).waitFor();
    await page.getByText("synthetic/mock ilanlarla", { exact: false }).waitFor();
    await page.getByText("Reklam ve analytics kullanılmaz", { exact: false }).waitFor();
    await page.getByText("Zorunlu olmayan çerez veya tracker", { exact: false }).waitFor();
    await page.getByText("teknik erişim kayıtları tutabilir", { exact: false }).waitFor();
    await page.getByText("merkezi telefon ve WhatsApp hattıdır", { exact: false }).waitFor();
    assert(
      (await page.locator("form, input, textarea, select").count()) === 0,
      "Privacy page collects data.",
    );
    await assertNoTrackingMarkup(page, "/gizlilik");
    await assertNoOverflow(page, "/gizlilik");
    await page.screenshot({ path: path.join(evidenceDir, "public-desktop-privacy.png"), fullPage: true });

    assertOnlyHostingSecurityCookies(await context.cookies(baseUrl), "Public desktop V0");
    assert(
      forbiddenRequests.length === 0,
      `Public V0 made a forbidden request: ${forbiddenRequests.join(" | ")}`,
    );
  } finally {
    await context.close();
    await browser.close();
  }
}

async function verifyMobileOffline() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    serviceWorkers: "allow",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  page.setDefaultNavigationTimeout(20_000);
  const forbiddenRequests = watchForbiddenRequests(page);

  try {
    await gotoOk(page, "/");
    await page.getByTestId("v0-notice").waitFor();
    await page.getByRole("link", { name: "Gizlilik" }).waitFor();
    await assertInstallability(page);
    await assertNoTrackingMarkup(page, "/ mobile");
    await assertNoOverflow(page, "/ mobile");
    await page.screenshot({ path: path.join(evidenceDir, "public-mobile-home.png"), fullPage: true });

    await gotoOk(page, "/gizlilik");
    await page.getByRole("heading", { level: 1, name: "Gizlilik" }).waitFor();
    await assertNoOverflow(page, "/gizlilik mobile");
    await page.screenshot({ path: path.join(evidenceDir, "public-mobile-privacy.png"), fullPage: true });

    assertOnlyHostingSecurityCookies(await context.cookies(baseUrl), "Public mobile V0");
    assert(
      forbiddenRequests.length === 0,
      `Mobile public V0 made a forbidden request: ${forbiddenRequests.join(" | ")}`,
    );

    await context.setOffline(true);
    await page.evaluate(() => window.location.assign("/offline-public-probe"));
    await page.getByRole("heading", { level: 1, name: "Bağlantı yok" }).waitFor();
    await page.getByText("dinamik ilanları çevrimdışı saklamaz", { exact: false }).waitFor();
    await assertNoOverflow(page, "/offline-public-probe");
    await page.screenshot({ path: path.join(evidenceDir, "public-mobile-offline.png"), fullPage: true });
  } finally {
    await context.setOffline(false);
    await context.close();
    await browser.close();
  }
}

await verifyDesktop();
await verifyMobileOffline();
console.log("Published V0 verification passed.");
