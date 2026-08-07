import fs from "node:fs";
import path from "node:path";
import { chromium, type Page } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:4174";
const appOrigin = new URL(baseUrl).origin;
const resultsDir = path.resolve("test-results/v0-pwa");
fs.mkdirSync(resultsDir, { recursive: true });

type ForwardingProbe = {
  captureExceptionCalls: number;
  runtimeErrorCalls: number;
};

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function trackAutomaticCrossOriginRequests(page: Page) {
  const requests: string[] = [];

  page.on("request", (request) => {
    let url: URL;
    try {
      url = new URL(request.url());
    } catch {
      return;
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") return;
    if (url.origin === appOrigin) return;

    requests.push(`${request.method()} ${url.toString()}`);
  });

  return requests;
}

async function gotoOk(page: Page, route: string) {
  const url = new URL(route, baseUrl).toString();
  const response = await page.goto(url, { waitUntil: "domcontentloaded" });
  assert(response?.ok() === true, `${url} returned HTTP ${response?.status() ?? "unknown"}.`);
  await page.waitForTimeout(100);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  serviceWorkers: "allow",
});

await context.addInitScript(() => {
  const probe: ForwardingProbe = {
    captureExceptionCalls: 0,
    runtimeErrorCalls: 0,
  };
  const probeWindow = window as typeof window & {
    __v0ForwardingProbe?: ForwardingProbe;
    __lovableEvents?: {
      captureException?: () => void;
    };
    __lovableReportRuntimeError?: () => void;
  };

  Object.defineProperty(probeWindow, "__v0ForwardingProbe", {
    value: probe,
    configurable: false,
    enumerable: false,
    writable: false,
  });

  probeWindow.__lovableEvents = {
    captureException: () => {
      probe.captureExceptionCalls += 1;
      void fetch("https://telemetry.invalid/capture-exception").catch(() => undefined);
    },
  };
  probeWindow.__lovableReportRuntimeError = () => {
    probe.runtimeErrorCalls += 1;
    void fetch("https://telemetry.invalid/runtime-error").catch(() => undefined);
  };
});

const page = await context.newPage();
page.setDefaultTimeout(15_000);
page.setDefaultNavigationTimeout(15_000);
const crossOriginRequests = trackAutomaticCrossOriginRequests(page);

try {
  console.log("V0 privacy: validating automatic requests across public routes");

  await gotoOk(page, "/");
  await page.getByTestId("v0-notice").waitFor();

  await gotoOk(page, "/ara?q=&il=T%C3%BCm+T%C3%BCrkiye&ilce=T%C3%BCm+il%C3%A7eler&sirala=yeni");
  await page.getByText("ilan bulundu", { exact: false }).waitFor();
  const detailHref = await page.locator('a[href^="/ilan/"]').first().getAttribute("href");
  assert(detailHref, "Synthetic V0 search did not expose a detail route.");

  await gotoOk(page, detailHref);
  const listingId = detailHref.split("/").filter(Boolean).at(-1);
  assert(listingId, "Synthetic listing ID could not be derived.");

  await gotoOk(page, `/sikayet/${listingId}`);
  await page.getByRole("heading", { level: 1, name: "Şikâyet demosu" }).waitFor();
  assert(
    (await page.locator("form, input, textarea, select").count()) === 0,
    "Public V0 complaint demo collected data.",
  );

  await gotoOk(page, "/ilan-ver");
  await page.getByRole("heading", { level: 1, name: "İlan verme demosu" }).waitFor();
  assert(
    (await page.locator("form, input, textarea, select").count()) === 0,
    "Public V0 listing demo collected data.",
  );
  assert(
    (await page.getByText("Satış bağlantısı (isteğe bağlı)", { exact: true }).count()) === 0,
    "Public V0 exposed the feature-disabled external sales link field.",
  );
  assert(
    (await page.getByText("Satıcının Shopier sayfasına git", { exact: true }).count()) === 0,
    "Public V0 exposed an external Shopier CTA.",
  );

  await gotoOk(page, "/giris");
  await page.getByText("Pilot sürecinde giriş bulunmuyor.", { exact: true }).waitFor();
  assert((await page.locator("form, input").count()) === 0, "Public V0 rendered account inputs.");

  await gotoOk(page, "/gizlilik");
  await page.getByRole("heading", { level: 1, name: "Gizlilik" }).waitFor();

  console.log("V0 privacy: validating fail-closed error forwarding");
  await gotoOk(page, "/?__v0_error_boundary_probe=enabled");
  await page.getByRole("heading", { level: 1, name: "Bu sayfa yüklenemedi" }).waitFor();
  await page.waitForTimeout(250);

  const forwardingProbe = await page.evaluate(() => {
    const probeWindow = window as typeof window & {
      __v0ForwardingProbe?: ForwardingProbe;
    };
    return probeWindow.__v0ForwardingProbe;
  });
  assert(forwardingProbe, "The controlled error-forwarding probe was not installed.");
  assert(
    forwardingProbe.captureExceptionCalls === 0,
    `Public V0 called captureException ${forwardingProbe.captureExceptionCalls} time(s).`,
  );
  assert(
    forwardingProbe.runtimeErrorCalls === 0,
    `Public V0 called __lovableReportRuntimeError ${forwardingProbe.runtimeErrorCalls} time(s).`,
  );

  await page.screenshot({
    path: path.join(resultsDir, "desktop-error-boundary.png"),
    fullPage: true,
  });

  const cookies = await context.cookies(baseUrl);
  assert(
    cookies.length === 0,
    `Public V0 created cookies: ${cookies.map((cookie) => cookie.name).join(", ")}`,
  );
  assert(
    crossOriginRequests.length === 0,
    `Public V0 made automatic cross-origin requests: ${crossOriginRequests.join(" | ")}`,
  );
} finally {
  await context.close();
  await browser.close();
}

console.log("V0 same-origin privacy browser validation passed.");
