import fs from "node:fs";
import path from "node:path";
import { chromium, type Browser, type Page } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:4173";
const visibleListingId = "00000000-0000-4000-8000-000000000101";
const draftListingId = "00000000-0000-4000-8000-000000000102";
const expiredListingId = "00000000-0000-4000-8000-000000000103";
const whatsappUrlPattern = /^https:\/\/wa\.me\//;
const expectedNotFoundConsoleError =
  "console: Failed to load resource: the server responded with a status of 404 ()";
const resultsDir = path.resolve("test-results/gate1-browser");
fs.mkdirSync(resultsDir, { recursive: true });

type BrowserProfile = {
  name: string;
  viewport: { width: number; height: number };
  isMobile: boolean;
  hasTouch: boolean;
};

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function assertNoHorizontalOverflow(page: Page, profile: string, route: string) {
  const dimensions = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));

  assert(
    dimensions.documentWidth <= dimensions.viewportWidth,
    `${profile} ${route} has horizontal overflow: ${JSON.stringify(dimensions)}`,
  );
}

function readWhatsAppMessage(href: string, profile: string, context: string): string {
  const url = new URL(href);
  assert(
    url.protocol === "https:" && url.hostname === "wa.me",
    `${profile} ${context} did not use the controlled WhatsApp origin: ${href}`,
  );

  const message = url.searchParams.get("text");
  assert(message, `${profile} ${context} did not include a WhatsApp text payload.`);
  return message;
}

function assertMessageLines(
  message: string,
  expectedLines: string[],
  profile: string,
  context: string,
) {
  for (const line of expectedLines) {
    assert(
      message.includes(line),
      `${profile} ${context} WhatsApp payload is missing ${JSON.stringify(line)}: ${message}`,
    );
  }
}

async function captureWhatsAppNavigation(
  page: Page,
  trigger: () => Promise<void>,
  profile: string,
  context: string,
): Promise<string> {
  await page.route(whatsappUrlPattern, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<!doctype html><html><body>WhatsApp navigation intercepted.</body></html>",
    });
  });

  try {
    const requestPromise = page.waitForRequest((request) => {
      const url = new URL(request.url());
      return url.protocol === "https:" && url.hostname === "wa.me";
    });

    await trigger();
    const request = await requestPromise;
    assert(request.method() === "GET", `${profile} ${context} WhatsApp request was not a GET.`);
    await page.waitForLoadState("domcontentloaded");
    return request.url();
  } finally {
    await page.unroute(whatsappUrlPattern);
  }
}

async function assertHiddenListingNotFound(
  page: Page,
  profile: string,
  listingId: string,
  hiddenTitle: string,
) {
  const response = await page.goto(`${baseUrl}/ilan/${listingId}`, { waitUntil: "networkidle" });
  assert(response, `${profile} hidden listing navigation did not return a response.`);
  assert(
    response.status() === 404,
    `${profile} hidden listing ${listingId} returned HTTP ${response.status()} instead of 404.`,
  );

  await page.getByRole("heading", { level: 1, name: "404" }).waitFor();
  assert(
    (await page.getByText("Page not found", { exact: true }).count()) === 1,
    `${profile} hidden listing ${listingId} did not render the safe not-found state.`,
  );
  assert(
    (await page.getByText(hiddenTitle, { exact: true }).count()) === 0,
    `${profile} hidden listing ${listingId} exposed its title on the detail route.`,
  );
  assert(
    (await page.getByRole("link", { name: "WhatsApp" }).count()) === 0,
    `${profile} hidden listing ${listingId} exposed a contact action.`,
  );
  await assertNoHorizontalOverflow(page, profile, `/ilan/${listingId}`);
}

function consumeExpectedNotFoundConsoleErrors(runtimeErrors: string[], profile: string) {
  assert(
    runtimeErrors.length === 2 &&
      runtimeErrors.every((error) => error === expectedNotFoundConsoleError),
    `${profile} hidden listing routes emitted unexpected browser errors: ${runtimeErrors.join(" | ")}`,
  );
  runtimeErrors.splice(0, runtimeErrors.length);
}

function assertCleanRuntime(runtimeErrors: string[], authRequests: string[], profile: string) {
  assert(
    runtimeErrors.length === 0,
    `${profile} browser runtime errors: ${runtimeErrors.join(" | ")}`,
  );
  assert(
    authRequests.length === 0,
    `${profile} unexpectedly called product auth endpoints: ${authRequests.join(" | ")}`,
  );
}

async function runProfile(browser: Browser, profile: BrowserProfile) {
  const context = await browser.newContext({
    viewport: profile.viewport,
    isMobile: profile.isMobile,
    hasTouch: profile.hasTouch,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const runtimeErrors: string[] = [];
  const authRequests: string[] = [];

  page.on("pageerror", (error) => runtimeErrors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(`console: ${message.text()}`);
  });
  page.on("request", (request) => {
    const requestUrl = new URL(request.url());
    if (requestUrl.pathname.startsWith("/auth/v1")) authRequests.push(request.url());
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

  const detailWhatsAppHref = await page
    .getByRole("link", { name: "WhatsApp" })
    .getAttribute("href");
  assert(detailWhatsAppHref, `${profile.name} visible listing did not expose a WhatsApp href.`);
  const detailMessage = readWhatsAppMessage(
    detailWhatsAppHref,
    profile.name,
    "visible listing detail",
  );
  assertMessageLines(
    detailMessage,
    [`İlan ID: ${visibleListingId}`],
    profile.name,
    "visible listing detail",
  );

  await assertNoHorizontalOverflow(page, profile.name, "/ilan/$id");
  await page.screenshot({
    path: path.join(resultsDir, `${profile.name}-detail.png`),
    fullPage: true,
  });

  assertCleanRuntime(runtimeErrors, authRequests, profile.name);
  await assertHiddenListingNotFound(
    page,
    profile.name,
    draftListingId,
    "Draft integration listing",
  );
  await assertHiddenListingNotFound(
    page,
    profile.name,
    expiredListingId,
    "Expired integration listing",
  );
  consumeExpectedNotFoundConsoleErrors(runtimeErrors, profile.name);

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

  const sellerName = `${profile.name} E2E Satıcı`;
  const listingTitle = `${profile.name} E2E ilanı`;
  const listingPrice = "4321";
  const listingProvince = "Tekirdağ";
  const listingDistrict = "Çorlu";
  const listingDescription = `${profile.name} kabul testi için ayrıntılı ilan açıklaması.`;

  await page.getByLabel("İlanda görünecek ad", { exact: true }).fill(sellerName);
  await page.getByLabel("Başlık", { exact: true }).fill(listingTitle);
  await page.getByLabel("Fiyat (TL)", { exact: true }).fill(listingPrice);
  await page.getByRole("combobox").selectOption({ label: listingProvince });
  await page.getByLabel("İlçe", { exact: true }).fill(listingDistrict);
  await page.getByLabel("Açıklama", { exact: true }).fill(listingDescription);

  const applicationHref = await captureWhatsAppNavigation(
    page,
    () => page.getByRole("button", { name: "WhatsApp ile başvur" }).click(),
    profile.name,
    "listing application",
  );
  const applicationMessage = readWhatsAppMessage(
    applicationHref,
    profile.name,
    "listing application",
  );
  assertMessageLines(
    applicationMessage,
    [
      `İlanda görünecek ad: ${sellerName}`,
      `Başlık: ${listingTitle}`,
      `Fiyat: ${listingPrice} TL`,
      `Konum: ${listingProvince} / ${listingDistrict}`,
      `Açıklama: ${listingDescription}`,
    ],
    profile.name,
    "listing application",
  );

  await page.goto(`${baseUrl}/sikayet/${visibleListingId}`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { level: 1, name: "Şikâyet Et" }).waitFor();
  assert(
    (await page.getByText("Veritabanına public kayıt yazılmaz.", { exact: false }).count()) === 1,
    `${profile.name} complaint route did not disclose the no-public-write boundary.`,
  );

  const complaintReason = "Yanlış fiyat";
  const complaintDetails = `${profile.name} fiyat açıklaması uyuşmuyor.`;
  await page.getByLabel(complaintReason, { exact: true }).check();
  await page.getByPlaceholder("Kısa açıklama (isteğe bağlı)").fill(complaintDetails);

  const complaintHref = await captureWhatsAppNavigation(
    page,
    () => page.getByRole("button", { name: "WhatsApp ile bildir" }).click(),
    profile.name,
    "listing complaint",
  );
  const complaintMessage = readWhatsAppMessage(complaintHref, profile.name, "listing complaint");
  assertMessageLines(
    complaintMessage,
    [`İlan ID: ${visibleListingId}`, `Sebep: ${complaintReason}`, `Açıklama: ${complaintDetails}`],
    profile.name,
    "listing complaint",
  );

  assertCleanRuntime(runtimeErrors, authRequests, profile.name);
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
