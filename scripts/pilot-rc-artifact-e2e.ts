import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { chromium, type BrowserContext, type Page } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:4174";
const backendOrigin = process.env.BACKEND_ORIGIN;
if (!backendOrigin) throw new Error("BACKEND_ORIGIN is required for pilot-RC artifact proof.");

const serverEntry = path.resolve(".output/server/index.mjs");
if (!(await Bun.file(serverEntry).exists())) {
  throw new Error("pilot-rc production artifact is missing.");
}
const manifestPath = path.resolve(".output/public/manifest.webmanifest");
if (!(await Bun.file(manifestPath).exists())) {
  throw new Error("pilot-rc finalized manifest is missing.");
}
const diskManifestBytes = Buffer.from(await Bun.file(manifestPath).arrayBuffer());
const diskManifestText = diskManifestBytes.toString("utf8");
const diskManifest = JSON.parse(diskManifestText) as Record<string, unknown>;
const diskManifestSha256 = createHash("sha256").update(diskManifestBytes).digest("hex");
console.log(
  `pilot-rc disk manifest JSON.parse passed: ${diskManifestBytes.byteLength} bytes, sha256=${diskManifestSha256}.`,
);

const resultsDir = path.resolve("test-results/hosted-rc");
fs.mkdirSync(resultsDir, { recursive: true });

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertManifestFields(manifest: Record<string, unknown>, label: string) {
  for (const [field, expected] of Object.entries({
    id: "/",
    name: "Arar Buluruz",
    short_name: "Arar Buluruz",
    lang: "tr",
    start_url: "/",
    scope: "/",
    display: "standalone",
  })) {
    assert(
      manifest[field] === expected,
      `${label} field ${field} drifted from ${JSON.stringify(expected)}.`,
    );
  }
}

function assertManifestResidueAbsent(manifestText: string, label: string) {
  const normalized = manifestText.toLocaleLowerCase("tr-TR");
  for (const forbidden of [
    "v0 test sürümü",
    "pilot release candidate",
    "yalnız sentetik test verisi",
    "gerçek veri girişi kapalıdır",
    "geliştirme ortamında",
  ]) {
    assert(!normalized.includes(forbidden), `${label} exposed internal/test text: ${forbidden}`);
  }
}

assertManifestFields(diskManifest, "Disk manifest");
assertManifestResidueAbsent(diskManifestText, "Disk manifest");

async function waitForServerReady() {
  for (let attempt = 1; attempt <= 60; attempt += 1) {
    try {
      const response = await fetch(baseUrl, {
        cache: "no-store",
        signal: AbortSignal.timeout(1000),
      });
      if (response.ok) return;
    } catch {
      // production server is still starting
    }
    await Bun.sleep(1000);
  }
  throw new Error("pilot-rc production server did not become ready.");
}

async function waitForServerDown() {
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      await fetch(baseUrl, {
        cache: "no-store",
        signal: AbortSignal.timeout(300),
      });
    } catch {
      return;
    }
    await Bun.sleep(100);
  }
  throw new Error("pilot-rc production server remained reachable after termination.");
}

async function terminate(child: ReturnType<typeof Bun.spawn>) {
  if (child.exitCode !== null) return;
  child.kill();
  const exited = await Promise.race([child.exited, Bun.sleep(5000).then(() => null)]);
  if (exited === null && child.exitCode === null) child.kill(9);
}

async function assertNoHorizontalOverflow(page: Page, label: string) {
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  assert(
    dimensions.document <= dimensions.viewport,
    `${label} horizontally overflowed: ${JSON.stringify(dimensions)}`,
  );
}

type ServiceWorkerSnapshot = {
  secureContext: boolean;
  navigatorOnline: boolean;
  registrations: Array<{
    scope: string;
    installing: { scriptURL: string; state: string } | null;
    waiting: { scriptURL: string; state: string } | null;
    active: { scriptURL: string; state: string } | null;
  }>;
  controller: { scriptURL: string; state: string } | null;
  cacheNames: string[];
  offlineFallback: { status: number; url: string; text: string } | null;
};

async function readServiceWorkerSnapshot(page: Page): Promise<ServiceWorkerSnapshot> {
  return page.evaluate(async () => {
    const describeWorker = (worker: ServiceWorker | null) =>
      worker ? { scriptURL: worker.scriptURL, state: worker.state } : null;
    const registrations = await navigator.serviceWorker.getRegistrations();
    const cacheNames = await caches.keys();
    const fallback = await caches.match("/offline.html");
    return {
      secureContext: window.isSecureContext,
      navigatorOnline: navigator.onLine,
      registrations: registrations.map((registration) => ({
        scope: registration.scope,
        installing: describeWorker(registration.installing),
        waiting: describeWorker(registration.waiting),
        active: describeWorker(registration.active),
      })),
      controller: describeWorker(navigator.serviceWorker.controller),
      cacheNames,
      offlineFallback: fallback
        ? {
            status: fallback.status,
            url: fallback.url,
            text: await fallback.clone().text(),
          }
        : null,
    };
  });
}

function hasControllingWorker(snapshot: ServiceWorkerSnapshot) {
  return (
    snapshot.registrations.some((registration) => registration.active?.state === "activated") &&
    snapshot.controller?.state === "activated"
  );
}

async function ensureServiceWorkerControl(page: Page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });

  let reloads = 0;
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    const snapshot = await readServiceWorkerSnapshot(page);
    if (hasControllingWorker(snapshot)) {
      console.log(
        `pilot-rc service worker control diagnostic: reloads=${reloads} state=${JSON.stringify(snapshot)}.`,
      );
      return snapshot;
    }

    if (attempt % 5 === 0) {
      await page.reload({ waitUntil: "domcontentloaded" });
      reloads += 1;
    }
    await page.waitForTimeout(300);
  }

  const snapshot = await readServiceWorkerSnapshot(page);
  throw new Error(`pilot-rc service worker did not control the page: ${JSON.stringify(snapshot)}.`);
}

async function assertManifestAndInstallability(context: BrowserContext, page: Page) {
  const manifestResponse = await context.request.get(`${baseUrl}/manifest.webmanifest`);
  const servedManifestBytes = Buffer.from(await manifestResponse.body());
  const servedManifestText = servedManifestBytes.toString("utf8");
  const servedManifestSha256 = createHash("sha256").update(servedManifestBytes).digest("hex");
  const contentType = manifestResponse.headers()["content-type"] ?? "[missing]";
  const byteIdentical = servedManifestBytes.equals(diskManifestBytes);
  const preview = JSON.stringify(servedManifestText.slice(0, 240));

  console.log(
    `pilot-rc served manifest diagnostic: status=${manifestResponse.status()} content-type=${JSON.stringify(contentType)} bytes=${servedManifestBytes.byteLength} sha256=${servedManifestSha256} disk-byte-identical=${byteIdentical} preview=${preview}`,
  );

  assert(manifestResponse.ok(), `Manifest HTTP ${manifestResponse.status()}.`);
  assert(
    contentType.toLocaleLowerCase("en-US").includes("json"),
    `Manifest content-type is not JSON-compatible: ${contentType}.`,
  );

  const manifest = (await manifestResponse.json()) as Record<string, unknown>;
  assertManifestFields(manifest, "Served manifest");
  assertManifestResidueAbsent(servedManifestText, "Served manifest");
  assert(
    byteIdentical,
    `Served manifest differs from finalized disk artifact: disk=${diskManifestSha256} served=${servedManifestSha256}.`,
  );

  const session = await context.newCDPSession(page);
  const result = (await session.send("Page.getInstallabilityErrors")) as {
    installabilityErrors?: unknown[];
  };
  assert(
    Array.isArray(result.installabilityErrors) && result.installabilityErrors.length === 0,
    `Chromium reported installability errors: ${JSON.stringify(result.installabilityErrors)}`,
  );
}

async function assertNoResidue(page: Page, label: string) {
  const body = (await page.locator("body").innerText()).toLocaleLowerCase("tr-TR");
  for (const forbidden of [
    "v0 test sürümü",
    "ilanlar örnektir",
    "demo ilan",
    "giriş demosu",
    "mock ilan",
    "pilot release candidate",
    "yalnız sentetik test verisi",
    "gerçek veri girişi kapalıdır",
    "bu geliştirme ortamında",
    "developer",
    "debug",
  ]) {
    assert(!body.includes(forbidden), `${label} exposed pilot-inappropriate text: ${forbidden}`);
  }
  assert(
    (await page.getByRole("link", { name: "Giriş" }).count()) === 0,
    `${label} exposed a login CTA.`,
  );
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

try {
  await waitForServerReady();
  const browser = await chromium.launch({ headless: true });
  try {
    const desktop = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      serviceWorkers: "allow",
    });
    const page = await desktop.newPage();
    page.setDefaultTimeout(20_000);
    page.setDefaultNavigationTimeout(20_000);
    const runtimeErrors: string[] = [];
    page.on("pageerror", (error) => runtimeErrors.push(`pageerror: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error") runtimeErrors.push(`console: ${message.text()}`);
    });

    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.getByText("Ne arıyorsan yaz, gerisini biz bulalım.", { exact: true }).waitFor();
    await page.getByRole("link", { name: "İlan Başvurusu" }).waitFor();
    await assertNoResidue(page, "home");
    await assertNoHorizontalOverflow(page, "home desktop");
    await ensureServiceWorkerControl(page);
    await assertManifestAndInstallability(desktop, page);
    await page.screenshot({
      path: path.join(resultsDir, "pilot-rc-desktop-home.png"),
      fullPage: true,
    });

    const loginResponse = await page.goto(`${baseUrl}/giris`, { waitUntil: "domcontentloaded" });
    assert(loginResponse?.status() === 404, `pilot-rc /giris returned ${loginResponse?.status()}.`);
    const operatorResponse = await page.goto(`${baseUrl}/kurucu`, {
      waitUntil: "domcontentloaded",
    });
    assert(
      operatorResponse?.status() === 404,
      `public pilot-rc /kurucu returned ${operatorResponse?.status()}.`,
    );
    const operatorPostResponse = await desktop.request.post(`${baseUrl}/kurucu`, {
      form: { action: "list" },
      failOnStatusCode: false,
    });
    assert(
      operatorPostResponse.status() === 404,
      `public pilot-rc POST /kurucu returned ${operatorPostResponse.status()}.`,
    );
    runtimeErrors.length = 0;

    await page.goto(`${baseUrl}/ilan-ver`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { level: 1, name: "İlan Başvurusu" }).waitFor();
    await assertNoResidue(page, "pilot intake");
    assert(
      (await page.locator('input[type="password"], input[type="email"]').count()) === 0,
      "Pilot intake exposed account fields.",
    );

    await page.goto(`${baseUrl}/gizlilik`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { level: 1, name: "Gizlilik" }).waitFor();
    await page.getByText("hesap açmadan ilan keşfi", { exact: false }).waitFor();
    await assertNoResidue(page, "privacy");

    await page.goto(`${baseUrl}/ara?q=Sentetik+migration`, { waitUntil: "networkidle" });
    const baselineTitle = "Sentetik migration fotoğraf ilanı";
    await page.getByText(baselineTitle, { exact: true }).waitFor();
    await assertNoResidue(page, "collection");
    const detailHref = await page
      .getByRole("link", { name: new RegExp(baselineTitle) })
      .first()
      .getAttribute("href");
    assert(
      detailHref?.startsWith("/ilan/"),
      "Hosted baseline listing did not expose a detail route.",
    );
    await page
      .getByRole("link", { name: new RegExp(baselineTitle) })
      .first()
      .click();
    await page.getByRole("heading", { level: 1, name: baselineTitle }).waitFor();
    const signedPhoto = page.getByAltText(`${baselineTitle} fotoğraf 1`);
    await signedPhoto.waitFor({ state: "visible" });
    const photoSrc = await signedPhoto.getAttribute("src");
    assert(
      photoSrc?.includes("/storage/v1/object/sign/listing_photos/"),
      "pilot-rc detail did not use signed private Storage.",
    );
    const decodedPhoto = await signedPhoto.evaluate(async (image) => {
      const htmlImage = image as HTMLImageElement;
      let decodeError: string | null = null;
      try {
        await htmlImage.decode();
      } catch (error) {
        decodeError = error instanceof Error ? error.message : String(error);
      }
      return {
        complete: htmlImage.complete,
        naturalWidth: htmlImage.naturalWidth,
        naturalHeight: htmlImage.naturalHeight,
        decodeError,
      };
    });
    console.log(
      `pilot-rc signed photo browser decode diagnostic: complete=${decodedPhoto.complete} naturalWidth=${decodedPhoto.naturalWidth} naturalHeight=${decodedPhoto.naturalHeight} decodeError=${JSON.stringify(decodedPhoto.decodeError)}.`,
    );
    assert(
      decodedPhoto.naturalWidth > 0,
      `pilot-rc signed photo did not decode: ${JSON.stringify(decodedPhoto)}.`,
    );
    const contact = page.getByRole("link", { name: "WhatsApp’tan yaz" });
    assert(
      (await contact.getAttribute("href")) === "https://wa.me/12025550141",
      "Hosted baseline seller contact drifted.",
    );
    await page.goBack({ waitUntil: "networkidle" });
    assert(
      new URL(page.url()).searchParams.get("q") === "Sentetik migration",
      "Back navigation did not preserve search state.",
    );
    await page.getByText(baselineTitle, { exact: true }).waitFor();

    await page.goto(`${baseUrl}/ara?q=hosted-rc-empty-74a1`, { waitUntil: "networkidle" });
    await page.getByText("Sonuç bulunamadı", { exact: true }).first().waitFor();
    await assertNoHorizontalOverflow(page, "empty state desktop");
    assert(
      runtimeErrors.length === 0,
      `pilot-rc positive desktop runtime errors: ${runtimeErrors.join(" | ")}`,
    );

    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.route(`${backendOrigin}/**`, (route) => route.abort("failed"));
    await page.getByLabel("Ne arıyorsun?", { exact: true }).fill("outage-proof");
    await page.getByRole("button", { name: "Ara" }).click();
    await page.getByText("İlanlar henüz gösterilemiyor.", { exact: true }).waitFor();
    await page
      .getByText("İlanlar şu anda güvenli biçimde yüklenemiyor.", { exact: false })
      .waitFor();
    await page.unroute(`${backendOrigin}/**`);
    runtimeErrors.length = 0;
    await desktop.close();

    const mobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      serviceWorkers: "allow",
    });
    const mobilePage = await mobile.newPage();
    mobilePage.setDefaultTimeout(20_000);
    await mobilePage.goto(baseUrl, { waitUntil: "networkidle" });
    await mobilePage.getByRole("link", { name: "İlan Başvurusu" }).waitFor();
    await assertNoResidue(mobilePage, "mobile home");
    await assertNoHorizontalOverflow(mobilePage, "mobile home");
    await mobilePage.getByLabel("Ne arıyorsun?", { exact: true }).fill("Sentetik migration");
    await mobilePage.getByRole("button", { name: "Ara" }).click();
    await mobilePage.getByText(baselineTitle, { exact: true }).waitFor();
    await assertNoHorizontalOverflow(mobilePage, "mobile collection");
    await mobilePage.screenshot({
      path: path.join(resultsDir, "pilot-rc-mobile-search.png"),
      fullPage: true,
    });
    await mobile.close();

    const offlineContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      serviceWorkers: "allow",
    });
    const offlinePage = await offlineContext.newPage();
    offlinePage.setDefaultTimeout(20_000);
    offlinePage.setDefaultNavigationTimeout(20_000);
    const offlineConsoleErrors: string[] = [];
    const offlinePageErrors: string[] = [];
    const offlineRequestFailures: string[] = [];
    const offlineDocumentResponses: string[] = [];
    offlinePage.on("console", (message) => {
      if (message.type() === "error") offlineConsoleErrors.push(message.text());
    });
    offlinePage.on("pageerror", (error) => offlinePageErrors.push(error.message));
    offlinePage.on("requestfailed", (request) => {
      offlineRequestFailures.push(
        `${request.method()} ${request.url()} ${request.failure()?.errorText ?? "[unknown]"}`,
      );
    });
    offlinePage.on("response", (response) => {
      if (response.request().resourceType() === "document") {
        offlineDocumentResponses.push(
          `${response.status()} ${response.url()} fromServiceWorker=${response.fromServiceWorker()}`,
        );
      }
    });

    try {
      await offlinePage.goto(baseUrl, { waitUntil: "networkidle" });
      const initialSnapshot = await ensureServiceWorkerControl(offlinePage);
      assert(
        initialSnapshot.secureContext,
        "pilot-rc offline proof did not run in a secure context.",
      );
      assert(
        initialSnapshot.registrations.length === 1,
        `pilot-rc offline proof saw unexpected service worker registrations: ${JSON.stringify(initialSnapshot.registrations)}.`,
      );
      assert(
        initialSnapshot.offlineFallback?.status === 200 &&
          initialSnapshot.offlineFallback.text.includes("<h1>Bağlantı yok</h1>"),
        `pilot-rc service worker cache did not contain the fail-closed offline fallback: ${JSON.stringify(initialSnapshot.offlineFallback)}.`,
      );

      const beforeOutageSnapshot = await ensureServiceWorkerControl(offlinePage);
      assert(
        hasControllingWorker(beforeOutageSnapshot),
        `pilot-rc lost service worker control before the real offline navigation: ${JSON.stringify(beforeOutageSnapshot)}.`,
      );
      assert(
        beforeOutageSnapshot.offlineFallback?.text.includes("<h1>Bağlantı yok</h1>") === true,
        "pilot-rc offline fallback disappeared from Cache Storage before the outage.",
      );

      offlineConsoleErrors.length = 0;
      offlinePageErrors.length = 0;
      offlineRequestFailures.length = 0;
      offlineDocumentResponses.length = 0;
      await offlineContext.setOffline(true);
      await terminate(server);
      await waitForServerDown();

      const offlineUrl = `${baseUrl}/ara?q=offline-proof`;
      let offlineNavigationError: string | null = null;
      let offlineNavigationResponse: Awaited<ReturnType<Page["waitForNavigation"]>> = null;
      try {
        const navigationPromise = offlinePage.waitForNavigation({ waitUntil: "domcontentloaded" });
        await offlinePage.evaluate((url) => {
          window.location.assign(url);
        }, offlineUrl);
        offlineNavigationResponse = await navigationPromise;
        await offlinePage.waitForLoadState("domcontentloaded");
      } catch (error) {
        offlineNavigationError = error instanceof Error ? error.message : String(error);
      }

      assert(
        offlineNavigationError === null && offlineNavigationResponse !== null,
        `pilot-rc real offline navigation failed before the service worker fallback could respond: ${offlineNavigationError}.`,
      );
      assert(
        offlinePage.url() === offlineUrl,
        `pilot-rc offline navigation landed on an unexpected URL: ${offlinePage.url()}.`,
      );
      assert(
        offlineNavigationResponse.fromServiceWorker(),
        `pilot-rc offline navigation was not fulfilled by the controlling service worker: ${offlineNavigationResponse.url()}.`,
      );
      assert(
        offlineNavigationResponse.ok(),
        `pilot-rc service worker offline fallback returned HTTP ${offlineNavigationResponse.status()}.`,
      );

      const afterNavigationSnapshot = await readServiceWorkerSnapshot(offlinePage);
      console.log(
        `pilot-rc real offline navigation diagnostic: response=${offlineNavigationResponse.status()} ${offlineNavigationResponse.url()} fromServiceWorker=${offlineNavigationResponse.fromServiceWorker()} error=${JSON.stringify(offlineNavigationError)} pageUrl=${offlinePage.url()} state=${JSON.stringify(afterNavigationSnapshot)} documentResponses=${JSON.stringify(offlineDocumentResponses)} requestFailures=${JSON.stringify(offlineRequestFailures)} consoleErrors=${JSON.stringify(offlineConsoleErrors)} pageErrors=${JSON.stringify(offlinePageErrors)}.`,
      );

      await offlinePage.getByRole("heading", { level: 1, name: "Bağlantı yok" }).waitFor();
      await offlinePage
        .getByText("dinamik ilanları çevrimdışı saklamaz", { exact: false })
        .waitFor();
      assert(
        afterNavigationSnapshot.offlineFallback?.text === (await offlinePage.locator("html").innerHTML()).replace(/^<head>[\s\S]*?<\/head>/, ""),
        "pilot-rc offline fallback response drifted from the cached fail-closed document.",
      );
      assert(
        (await offlinePage.getByText(baselineTitle, { exact: true }).count()) === 0,
        "Offline fallback exposed stale dynamic listing data.",
      );
      assert(
        offlineConsoleErrors.length === 0 && offlinePageErrors.length === 0,
        `pilot-rc offline fallback emitted runtime errors: console=${offlineConsoleErrors.join(" | ")} page=${offlinePageErrors.join(" | ")}`,
      );
      await assertNoHorizontalOverflow(offlinePage, "offline fallback mobile");
      await offlinePage.screenshot({
        path: path.join(resultsDir, "pilot-rc-mobile-offline.png"),
        fullPage: true,
      });
    } finally {
      await offlineContext.setOffline(false).catch(() => undefined);
      await offlineContext.close();
    }

    console.log(
      "pilot-rc production artifact desktop/mobile/PWA/offline/navigation/fail-closed proof passed.",
    );
  } finally {
    await browser.close();
  }
} finally {
  await terminate(server);
}