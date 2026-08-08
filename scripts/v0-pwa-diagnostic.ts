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
    await Promise.race([operation(), Bun.sleep(5_000)]);
  } catch (error) {
    console.error(`V0 PWA DIAG cleanup error: ${label}`, error);
  }
}

let server: ReturnType<typeof Bun.spawn> | undefined;

async function waitForServerReady() {
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      const response = await fetch(baseUrl, {
        cache: "no-store",
        signal: AbortSignal.timeout(1_000),
      });
      if (response.ok) return;
    } catch {}
    await Bun.sleep(500);
  }
  throw new Error("Diagnostic preview server did not become ready.");
}

async function stopServer() {
  const activeServer = server;
  if (!activeServer || activeServer.exitCode !== null) return;
  activeServer.kill();
  const exited = await Promise.race([
    activeServer.exited.then(() => true),
    Bun.sleep(5_000).then(() => false),
  ]);
  if (!exited && activeServer.exitCode === null) activeServer.kill(9);
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
  throw new Error(`Service worker did not control diagnostic page: ${JSON.stringify(await readServiceWorkerState(page))}`);
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

if (!(await Bun.file(serverEntry).exists())) throw new Error("Diagnostic production output is missing.");

server = Bun.spawn(["bun", serverEntry], {
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

let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
let context: BrowserContext | undefined;

try {
  await waitForServerReady();
  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: "allow" });
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  page.setDefaultNavigationTimeout(15_000);

  await bounded("manifest", () => assertManifest(context!));
  await bounded("home goto", () => gotoOk(page, baseUrl));
  await bounded("home notice", () => page.getByTestId("v0-notice").waitFor());
  await bounded("home sample notice", () => page.getByText("İlanlar örnektir", { exact: false }).waitFor());
  await bounded("home privacy link", () => page.getByRole("link", { name: "Gizlilik" }).waitFor());
  await bounded("service worker control", () => ensureControlledServiceWorker(page));
  await bounded("cache boundary", () => assertCacheBoundary(page));
  await bounded("home tracking markup", () => assertNoTrackingMarkup(page));
  await bounded("home overflow", () => assertNoHorizontalOverflow(page));
  await bounded("home screenshot", () => page.screenshot({ path: "test-results/v0-pwa/diagnostic-home.png", fullPage: true }).then(() => undefined));

  const searchUrl = `${baseUrl}/ara?q=trakt%C3%B6r&il=T%C3%BCm+T%C3%BCrkiye&sirala=yeni`;
  await bounded("search goto", () => gotoOk(page, searchUrl));
  await bounded("search result count", () => page.getByText("ilan bulundu", { exact: false }).waitFor());
  await bounded("search sample sort", () => page.getByText("Yakın (örnek)", { exact: true }).first().waitFor());
  await bounded("search tracking markup", () => assertNoTrackingMarkup(page));
  await bounded("search overflow", () => assertNoHorizontalOverflow(page));

  console.log("V0 PWA DIAG COMPLETE");
} finally {
  if (context) await closeBounded("context.close", () => context!.close());
  if (browser) await closeBounded("browser.close", () => browser!.close());
  await stopServer();
}
