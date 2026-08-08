import path from "node:path";
import { chromium, type BrowserContext, type Page } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:4174";
const serverEntry = path.resolve(".output/server/index.mjs");
const operationTimeoutMs = 20_000;

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function bounded<T>(label: string, operation: () => Promise<T>): Promise<T> {
  console.log(`V0 PWA DIAG START: ${label}`);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      operation(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`V0 PWA DIAG TIMEOUT: ${label} exceeded ${operationTimeoutMs}ms`)),
          operationTimeoutMs,
        );
      }),
    ]);
    console.log(`V0 PWA DIAG PASS: ${label}`);
    return result;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function closeBounded(label: string, operation: () => Promise<void>) {
  try {
    const closed = await Promise.race([
      operation().then(() => true),
      Bun.sleep(5_000).then(() => false),
    ]);
    console.log(`V0 PWA DIAG CLEANUP ${closed ? "PASS" : "TIMEOUT"}: ${label}`);
  } catch (error) {
    console.error(`V0 PWA DIAG cleanup error: ${label}`, error);
  }
}

async function waitForServerReady() {
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      const response = await fetch(baseUrl, {
        cache: "no-store",
        signal: AbortSignal.timeout(1_000),
      });
      if (response.ok) return;
    } catch {
      // Retry until the bounded readiness window closes.
    }
    await Bun.sleep(500);
  }
  throw new Error("Diagnostic preview server did not become ready.");
}

async function gotoOk(page: Page, url: string) {
  const response = await page.goto(url, { waitUntil: "domcontentloaded" });
  assert(response?.ok() === true, `${url} returned HTTP ${response?.status() ?? "unknown"}.`);
}

async function assertManifest(context: BrowserContext) {
  const response = await context.request.get(`${baseUrl}/manifest.webmanifest`);
  assert(response.ok(), `Manifest returned HTTP ${response.status()}.`);
  const manifest = (await response.json()) as { icons?: Array<{ src?: string }> };
  for (const icon of manifest.icons ?? []) {
    if (!icon.src) continue;
    const iconResponse = await context.request.get(new URL(icon.src, baseUrl).toString());
    assert(iconResponse.ok(), `${icon.src} returned HTTP ${iconResponse.status()}.`);
  }
}

async function readServiceWorkerState(page: Page) {
  return page.evaluate(async () => {
    const registration = await Promise.race([
      navigator.serviceWorker.getRegistration("/"),
      new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 1_000)),
    ]);
    return {
      active: Boolean(registration?.active),
      controlled: navigator.serviceWorker.controller !== null,
    };
  });
}

async function ensureControlledServiceWorker(page: Page) {
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    const state = await readServiceWorkerState(page);
    if (state.active && state.controlled) return;
    if (state.active && !state.controlled && attempt % 5 === 0) {
      await page.reload({ waitUntil: "domcontentloaded", timeout: 15_000 });
    }
    await page.waitForTimeout(500);
  }
  throw new Error(
    `Service worker did not control diagnostic page: ${JSON.stringify(await readServiceWorkerState(page))}`,
  );
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
  assert(state.names.length === 1, `Unexpected caches: ${JSON.stringify(state.names)}`);
  assert(state.paths.includes("/offline.html"), "Offline fallback is not precached.");
}

async function assertNoTrackingMarkup(page: Page) {
  await page.evaluate(() => ({
    fontLinks: document.querySelectorAll("link[href]").length,
    scripts: document.querySelectorAll("script[src]").length,
  }));
}

async function assertNoHorizontalOverflow(page: Page) {
  await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
}

if (!(await Bun.file(serverEntry).exists())) {
  throw new Error("Diagnostic production output is missing.");
}

const server = Bun.spawn(["bun", serverEntry], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    HOST: "127.0.0.1",
    PORT: "4174",
    NITRO_HOST: "127.0.0.1",
    NITRO_PORT: "4174",
  },
  stdout: "inherit",
  stderr: "inherit",
});

async function stopServer() {
  if (server.exitCode !== null) return;
  server.kill();
  const exited = await Promise.race([
    server.exited.then(() => true),
    Bun.sleep(5_000).then(() => false),
  ]);
  console.log(`V0 PWA DIAG CLEANUP ${exited ? "PASS" : "TIMEOUT"}: server exit`);
  if (!exited && server.exitCode === null) {
    server.kill(9);
    await Promise.race([server.exited, Bun.sleep(2_000)]);
  }
}

let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
let context: BrowserContext | undefined;

try {
  await waitForServerReady();
  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    serviceWorkers: "allow",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  page.setDefaultNavigationTimeout(15_000);

  await bounded("manifest", () => assertManifest(context!));
  await bounded("home goto", () => gotoOk(page, baseUrl));
  await bounded("home notice", () => page.getByTestId("v0-notice").waitFor());
  await bounded("home sample notice", () =>
    page.getByText("İlanlar örnektir", { exact: false }).waitFor(),
  );
  await bounded("home privacy link", () => page.getByRole("link", { name: "Gizlilik" }).waitFor());
  await bounded("service worker control", () => ensureControlledServiceWorker(page));
  await bounded("cache boundary", () => assertCacheBoundary(page));
  await bounded("home tracking markup", () => assertNoTrackingMarkup(page));
  await bounded("home overflow", () => assertNoHorizontalOverflow(page));
  await bounded("home screenshot", () =>
    page
      .screenshot({ path: "test-results/v0-pwa/diagnostic-home.png", fullPage: true })
      .then(() => undefined),
  );

  const searchUrl = `${baseUrl}/ara?q=trakt%C3%B6r&il=T%C3%BCm+T%C3%BCrkiye&sirala=yeni`;
  await bounded("search goto", () => gotoOk(page, searchUrl));
  await bounded("search result count", () =>
    page.getByText("ilan bulundu", { exact: false }).waitFor(),
  );
  await bounded("search sample sort", () =>
    page.getByText("Yakın (örnek)", { exact: true }).first().waitFor(),
  );
  await bounded("search tracking markup", () => assertNoTrackingMarkup(page));
  await bounded("search overflow", () => assertNoHorizontalOverflow(page));

  const filterUrl = `${baseUrl}/ara?q=&il=T%C3%BCm+T%C3%BCrkiye&ilce=T%C3%BCm+il%C3%A7eler&sirala=yeni`;
  await bounded("filter goto", () => gotoOk(page, filterUrl));
  const citySelect = page.getByLabel("Konum");
  const districtSelect = page.getByLabel("İlçe");
  await bounded("filter district visible", () => districtSelect.waitFor());
  await bounded("filter district disabled", async () => {
    assert(await districtSelect.isDisabled(), "District should start disabled.");
  });
  await bounded("filter select Konya", () => citySelect.selectOption({ label: "Konya" }));
  await bounded("filter Konya URL", () =>
    page.waitForURL(
      (url) =>
        url.searchParams.get("il") === "Konya" && url.searchParams.get("ilce") === "Tüm ilçeler",
    ),
  );
  await bounded("filter select Çumra", () => districtSelect.selectOption({ label: "Çumra" }));
  await bounded("filter Çumra URL", () =>
    page.waitForURL((url) => url.searchParams.get("ilce") === "Çumra"),
  );
  await bounded("filter Konya listing", () =>
    page.getByText("Sahibinden temiz bahçe traktörü", { exact: true }).waitFor(),
  );
  await bounded("filter select İzmir", () => citySelect.selectOption({ label: "İzmir" }));
  await bounded("filter İzmir URL", () =>
    page.waitForURL(
      (url) =>
        url.searchParams.get("il") === "İzmir" && url.searchParams.get("ilce") === "Tüm ilçeler",
    ),
  );
  await bounded("filter İzmir listing", () =>
    page.getByText("Ahşap yemek masası ve 4 sandalye", { exact: true }).waitFor(),
  );
  await bounded("filter overflow", () => assertNoHorizontalOverflow(page));

  const detailHref = await bounded("detail href", () =>
    page.locator('a[href^="/ilan/"]').first().getAttribute("href"),
  );
  assert(detailHref, "Diagnostic search did not expose a listing-detail link.");
  await bounded("detail goto", () => gotoOk(page, `${baseUrl}${detailHref}`));
  await bounded("detail tracking", () => assertNoTrackingMarkup(page));
  await bounded("detail overflow", () => assertNoHorizontalOverflow(page));

  const listingId = detailHref.split("/").filter(Boolean).at(-1);
  assert(listingId, "Diagnostic listing ID is missing.");
  await bounded("complaint goto", () => gotoOk(page, `${baseUrl}/sikayet/${listingId}`));
  await bounded("complaint heading", () =>
    page.getByRole("heading", { level: 1, name: "Şikâyet demosu" }).waitFor(),
  );
  await bounded("complaint controls", async () => {
    assert((await page.locator("form, input, textarea, select").count()) === 0, "Complaint controls exist.");
  });
  await bounded("complaint tracking", () => assertNoTrackingMarkup(page));

  await bounded("demo listing goto", () => gotoOk(page, `${baseUrl}/ilan-ver`));
  await bounded("demo listing heading", () =>
    page.getByRole("heading", { level: 1, name: "Demo ilan oluşturma" }).waitFor(),
  );
  await bounded("demo listing form count", async () => {
    assert((await page.locator("form").count()) === 1, "Demo listing form is missing.");
  });
  await bounded("demo listing contact controls", async () => {
    assert(
      (await page.locator('input[type="email"], input[type="tel"]').count()) === 0,
      "Demo listing contact controls exist.",
    );
  });
  await bounded("demo listing sales field", async () => {
    assert(
      (await page.getByText("Satış bağlantısı (isteğe bağlı)", { exact: true }).count()) === 0,
      "Frozen sales field exists.",
    );
  });
  await bounded("demo listing tracking", () => assertNoTrackingMarkup(page));
  await bounded("demo listing overflow", () => assertNoHorizontalOverflow(page));

  await bounded("login goto", () => gotoOk(page, `${baseUrl}/giris`));
  await bounded("login message", () =>
    page.getByText("Pilot sürecinde giriş bulunmuyor.", { exact: true }).waitFor(),
  );
  await bounded("login inputs", async () => {
    assert((await page.locator("input").count()) === 0, "Login inputs exist.");
  });
  await bounded("login tracking", () => assertNoTrackingMarkup(page));

  await bounded("privacy goto", () => gotoOk(page, `${baseUrl}/gizlilik`));
  await bounded("privacy heading", () =>
    page.getByRole("heading", { level: 1, name: "Gizlilik" }).waitFor(),
  );
  await bounded("privacy tracking", () => assertNoTrackingMarkup(page));
  await bounded("privacy overflow", () => assertNoHorizontalOverflow(page));
  await bounded("privacy screenshot", () =>
    page
      .screenshot({ path: "test-results/v0-pwa/diagnostic-privacy.png", fullPage: true })
      .then(() => undefined),
  );

  console.log("V0 PWA DIAG COMPLETE");
} finally {
  if (context) await closeBounded("context.close", () => context!.close());
  if (browser) await closeBounded("browser.close", () => browser!.close());
  await stopServer();
}
