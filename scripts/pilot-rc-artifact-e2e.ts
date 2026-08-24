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
const resultsDir = path.resolve("test-results/hosted-rc");
fs.mkdirSync(resultsDir, { recursive: true });

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

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

async function ensureServiceWorkerControl(page: Page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    const controlled = await page.evaluate(() => navigator.serviceWorker.controller !== null);
    if (controlled) return;
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(300);
  }
  throw new Error("pilot-rc service worker did not control the page.");
}

async function assertManifestAndInstallability(context: BrowserContext, page: Page) {
  const manifestResponse = await context.request.get(`${baseUrl}/manifest.webmanifest`);
  assert(manifestResponse.ok(), `Manifest HTTP ${manifestResponse.status()}.`);
  const manifest = (await manifestResponse.json()) as Record<string, unknown>;
  assert(manifest.id === "/", "Manifest id is not canonical.");
  assert(manifest.start_url === "/", "Manifest start_url is not canonical.");
  assert(manifest.scope === "/", "Manifest scope is not canonical.");
  assert(manifest.display === "standalone", "Manifest display is not standalone.");

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
    const photoSrc = await signedPhoto.getAttribute("src");
    assert(
      photoSrc?.includes("/storage/v1/object/sign/listing_photos/"),
      "pilot-rc detail did not use signed private Storage.",
    );
    assert(
      await signedPhoto.evaluate((image) => (image as HTMLImageElement).naturalWidth > 0),
      "pilot-rc signed photo did not decode.",
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

    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.route(`${backendOrigin}/**`, (route) => route.abort("failed"));
    await page.getByLabel("Ne arıyorsun?", { exact: true }).fill("outage-proof");
    await page.getByRole("button", { name: "Ara" }).click();
    await page.getByText("İlanlar henüz gösterilemiyor.", { exact: true }).waitFor();
    await page
      .getByText("İlanlar şu anda güvenli biçimde yüklenemiyor.", { exact: false })
      .waitFor();
    await page.unroute(`${backendOrigin}/**`);

    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await ensureServiceWorkerControl(page);
    await desktop.setOffline(true);
    await page.goto(`${baseUrl}/ara?q=offline-proof`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { level: 1, name: "Bağlantı yok" }).waitFor();
    await page.getByText("Dinamik ilanlar çevrimdışı saklanmaz.", { exact: false }).waitFor();
    assert(
      (await page.getByText(baselineTitle, { exact: true }).count()) === 0,
      "Offline fallback exposed stale dynamic listing data.",
    );
    await desktop.setOffline(false);

    assert(
      runtimeErrors.length === 0,
      `pilot-rc desktop runtime errors: ${runtimeErrors.join(" | ")}`,
    );
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

    console.log(
      "pilot-rc production artifact desktop/mobile/PWA/offline/navigation/fail-closed proof passed.",
    );
  } finally {
    await browser.close();
  }
} finally {
  await terminate(server);
}
