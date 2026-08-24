import fs from "node:fs";
import path from "node:path";
import { deflateSync } from "node:zlib";
import { chromium, type Page } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:4173";
const backendOrigin = process.env.BACKEND_ORIGIN;
const shimOrigin = process.env.SHIM_ORIGIN;
const shimPid = Number(process.env.SHIM_PID ?? "0");
if (!backendOrigin || !shimOrigin || !Number.isInteger(shimPid) || shimPid <= 0) {
  throw new Error(
    "BACKEND_ORIGIN, SHIM_ORIGIN and SHIM_PID are required for hosted operator proof.",
  );
}

const resultsDir = path.resolve("test-results/hosted-rc");
fs.mkdirSync(resultsDir, { recursive: true });
const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const HOSTED_OPERATION_TIMEOUT_MS = 90_000;

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function concatBytes(...parts: readonly Uint8Array[]): Uint8Array {
  const output = new Uint8Array(parts.reduce((sum, part) => sum + part.byteLength, 0));
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.byteLength;
  }
  return output;
}

function uint32BigEndian(value: number): Uint8Array {
  const output = new Uint8Array(4);
  new DataView(output.buffer).setUint32(0, value >>> 0, false);
  return output;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const body = concatBytes(typeBytes, data);
  return concatBytes(uint32BigEndian(data.byteLength), body, uint32BigEndian(crc32(body)));
}

function makeSyntheticPng(): Uint8Array {
  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);
  view.setUint32(0, 2, false);
  view.setUint32(4, 2, false);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const scanlines = concatBytes(
    new Uint8Array([0, 0x12, 0x34, 0x56, 0xff, 0x78, 0x9a, 0xbc, 0xff]),
    new Uint8Array([0, 0x33, 0x55, 0x77, 0xff, 0xaa, 0xbb, 0xcc, 0xff]),
  );
  return concatBytes(
    PNG_SIGNATURE,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", new Uint8Array(deflateSync(scanlines))),
    pngChunk("IEND", new Uint8Array()),
  );
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

async function fillCreateForm(page: Page, title: string, seller: string, contactE164: string) {
  await page.getByLabel("İlanda görünecek ad", { exact: true }).fill(seller);
  await page.getByLabel("Başlık", { exact: true }).fill(title);
  await page.getByLabel("Fiyat (TL)", { exact: true }).fill("9876.50");
  await page.getByLabel("İletişim kanalı", { exact: true }).selectOption("whatsapp");
  await page.getByLabel("Satıcı telefonu (E.164)", { exact: true }).fill(contactE164);
  await page
    .getByLabel("Açıklama", { exact: true })
    .fill("Hosted synthetic RC browser proof için yalnız sentetik kabul ilanı.");
  await page.getByTestId("operator-photo-input").setInputFiles({
    name: "untrusted-source.png",
    mimeType: "image/png",
    buffer: Buffer.from(makeSyntheticPng()),
  });
}

async function createPending(page: Page, title: string, seller: string, contactE164: string) {
  await fillCreateForm(page, title, seller, contactE164);
  const startedAt = Date.now();
  const serverResponsePromise = page
    .waitForResponse(
      (response) =>
        response.request().method() === "POST" && response.url().startsWith(`${baseUrl}/`),
      { timeout: HOSTED_OPERATION_TIMEOUT_MS },
    )
    .catch(() => null);

  await page.getByRole("button", { name: "Pending ilan ve fotoğrafı kaydet" }).click();

  const success = page.getByText("Pending ilan ve güvenli fotoğraf kaydedildi.", { exact: true });
  const failure = page.getByRole("alert");
  let outcome: "success" | "failure" | "timeout" = "timeout";
  const deadline = Date.now() + HOSTED_OPERATION_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (await success.isVisible().catch(() => false)) {
      outcome = "success";
      break;
    }
    if (await failure.isVisible().catch(() => false)) {
      outcome = "failure";
      break;
    }
    await page.waitForTimeout(250);
  }

  const response = await serverResponsePromise;
  const elapsedMs = Date.now() - startedAt;
  const responseStatus = response?.status() ?? "no POST response captured";
  const responsePath = response ? new URL(response.url()).pathname : "unknown";

  if (outcome !== "success") {
    const safeAlert =
      outcome === "failure"
        ? (await failure.textContent())?.trim() || "[empty alert]"
        : "[no success or failure UI before timeout]";
    const buttonText =
      (
        await page
          .getByRole("button", { name: /Kaydediliyor|Pending ilan/ })
          .textContent()
          .catch(() => null)
      )?.trim() ?? "[button unavailable]";
    await page.screenshot({
      path: path.join(resultsDir, "hosted-create-failure.png"),
      fullPage: true,
    });
    throw new Error(
      `Hosted create ${outcome}: elapsed=${elapsedMs}ms alert=${JSON.stringify(safeAlert)} button=${JSON.stringify(buttonText)} POST=${responseStatus} ${responsePath}`,
    );
  }

  assert(response !== null, "Hosted create succeeded in UI without an app server POST response.");
  assert(
    response.ok(),
    `Hosted create UI succeeded but app server POST returned HTTP ${response.status()} ${responsePath}.`,
  );
  console.log(
    `Hosted create server round-trip completed in ${elapsedMs}ms with HTTP ${response.status()} ${responsePath}.`,
  );

  const card = page.locator("li").filter({ hasText: title });
  await card.waitFor();
  await card.getByText("İncelemede", { exact: true }).waitFor();
  assert(
    (await card.getByText(/1 fotoğraf/).count()) === 1,
    "Pending listing did not have one photo.",
  );
  const testId = await card.getAttribute("data-testid");
  assert(
    testId?.startsWith("operator-listing-"),
    "Pending listing identity was not exposed to CI.",
  );
  return { card, listingId: testId.slice("operator-listing-".length) };
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
page.setDefaultTimeout(HOSTED_OPERATION_TIMEOUT_MS);
page.setDefaultNavigationTimeout(HOSTED_OPERATION_TIMEOUT_MS);

const runtimeErrors: string[] = [];
const sensitiveBrowserMutations: string[] = [];
const shimBrowserRequests: string[] = [];
page.on("pageerror", (error) => runtimeErrors.push(`pageerror: ${error.message}`));
page.on("console", (message) => {
  if (message.type() === "error") runtimeErrors.push(`console: ${message.text()}`);
});
page.on("request", (request) => {
  if (request.url().startsWith(shimOrigin)) shimBrowserRequests.push(request.url());
  if (!request.url().startsWith(backendOrigin)) return;
  const url = new URL(request.url());
  const sensitive =
    (url.pathname === "/rest/v1/listings" && request.method() !== "GET") ||
    url.pathname.endsWith("/rpc/register_sanitized_listing_photo") ||
    url.pathname.endsWith("/rpc/get_listing_photo_inventory") ||
    (url.pathname.startsWith("/storage/v1/object/listing_photos") && request.method() !== "GET");
  if (sensitive) sensitiveBrowserMutations.push(`${request.method()} ${url.pathname}`);
});

const publishTitle = "Hosted RC yayın yaşam döngüsü ilanı";
const rejectTitle = "Hosted RC red yaşam döngüsü ilanı";
const seller = "Hosted RC Sentetik Satıcı";
const contactE164 = "+12025550155";

try {
  await page.goto(`${baseUrl}/kurucu`, { waitUntil: "domcontentloaded" });
  const loadingStatus = page.getByText("İlan envanteri yükleniyor…", { exact: true });
  await loadingStatus.waitFor();
  await page.getByRole("heading", { level: 1, name: "Kurucu pilot işlemleri" }).waitFor();
  await page.getByRole("heading", { level: 2, name: "Yeni pending ilan" }).waitFor();
  assert(
    (await page.getByRole("link", { name: "Giriş" }).count()) === 0,
    "Operator header exposed login.",
  );
  await assertNoHorizontalOverflow(page, "/kurucu");

  // Prove the loading state first, then serialize mutations behind a completed inventory read.
  // The previous hosted harness submitted during the deliberately delayed initial inventory request,
  // creating an artificial concurrent founder mutation/read race that does not exist in the local
  // networkidle proof. The lifecycle itself must start only after the founder inventory is settled.
  await loadingStatus.waitFor({ state: "hidden" });
  assert(
    (await page.getByRole("alert").count()) === 0,
    "Initial hosted founder inventory failed before lifecycle proof.",
  );

  const createButton = page.getByRole("button", { name: "Pending ilan ve fotoğrafı kaydet" });
  await createButton.click();
  assert(
    (await page
      .getByLabel("İlanda görünecek ad", { exact: true })
      .evaluate((element) => (element as HTMLInputElement).validity.valueMissing)) === true,
    "Required create fields did not fail closed under browser validation.",
  );

  const first = await createPending(page, publishTitle, seller, contactE164);
  const publishButton = first.card.getByRole("button", { name: "Yayınla" });
  assert(await publishButton.isDisabled(), "Publish was enabled before founder confirmations.");
  await page.screenshot({
    path: path.join(resultsDir, "hosted-operator-pending.png"),
    fullPage: true,
  });

  const pendingResponse = await page.goto(`${baseUrl}/ilan/${first.listingId}`, {
    waitUntil: "networkidle",
  });
  assert(pendingResponse?.status() === 404, "Pending hosted listing was publicly readable.");
  runtimeErrors.splice(0, runtimeErrors.length);

  await page.goto(`${baseUrl}/kurucu`, { waitUntil: "networkidle" });
  await page.getByLabel("İletişim kontrolü tamamlandı", { exact: true }).check();
  await page.getByLabel("Yayın talimatı teyit edildi", { exact: true }).check();
  await page
    .locator("li")
    .filter({ hasText: publishTitle })
    .getByRole("button", { name: "Yayınla" })
    .click();
  await page.getByText("İlan yayınlandı.", { exact: true }).waitFor();
  await page
    .locator("li")
    .filter({ hasText: publishTitle })
    .getByText("Yayında", { exact: true })
    .waitFor();

  await page.goto(`${baseUrl}/ara?q=Hosted+RC+yay%C4%B1n`, { waitUntil: "networkidle" });
  await page
    .getByRole("link", { name: new RegExp(publishTitle) })
    .first()
    .waitFor();
  const collectionPhoto = page.getByAltText(publishTitle).first();
  const collectionSrc = await collectionPhoto.getAttribute("src");
  assert(
    collectionSrc?.includes("/storage/v1/object/sign/listing_photos/"),
    "Collection did not use a signed private photo.",
  );
  assert(
    await collectionPhoto.evaluate((image) => (image as HTMLImageElement).naturalWidth > 0),
    "Collection signed photo did not decode.",
  );

  await page.goto(`${baseUrl}/ilan/${first.listingId}`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { level: 1, name: publishTitle }).waitFor();
  const detailPhoto = page.getByAltText(`${publishTitle} fotoğraf 1`);
  const detailSrc = await detailPhoto.getAttribute("src");
  assert(
    detailSrc?.includes("/storage/v1/object/sign/listing_photos/"),
    "Detail did not use a signed private photo.",
  );
  assert(
    await detailPhoto.evaluate((image) => (image as HTMLImageElement).naturalWidth > 0),
    "Detail signed photo did not decode.",
  );
  const contactHref = await page
    .getByRole("link", { name: "WhatsApp’tan yaz" })
    .getAttribute("href");
  assert(
    contactHref === `https://wa.me/${contactE164.slice(1)}`,
    "Published seller contact was not lifecycle-approved.",
  );
  await page.screenshot({
    path: path.join(resultsDir, "hosted-published-detail.png"),
    fullPage: true,
  });

  await page.goto(`${baseUrl}/kurucu`, { waitUntil: "networkidle" });
  await page
    .locator("li")
    .filter({ hasText: publishTitle })
    .getByRole("button", { name: "Yayından kaldır" })
    .click();
  await page.getByText("İlan yayından kaldırıldı.", { exact: true }).waitFor();
  const unpublishedResponse = await page.goto(`${baseUrl}/ilan/${first.listingId}`, {
    waitUntil: "networkidle",
  });
  assert(unpublishedResponse?.status() === 404, "Unpublished hosted listing remained public.");
  assert(
    (await page.getByRole("link", { name: "WhatsApp’tan yaz" }).count()) === 0,
    "Unpublished listing leaked seller contact.",
  );
  runtimeErrors.splice(0, runtimeErrors.length);

  await page.goto(`${baseUrl}/kurucu`, { waitUntil: "networkidle" });
  const firstCard = page.getByTestId(`operator-listing-${first.listingId}`);
  page.once("dialog", (dialog) => void dialog.accept());
  await firstCard.getByRole("button", { name: "Sil" }).click();
  await page.getByText("İlan ve ilişkili Storage objeleri silindi.", { exact: true }).waitFor();
  await firstCard.waitFor({ state: "detached" });
  assert((await firstCard.count()) === 0, "Deleted published listing remained in operator inventory.");

  const second = await createPending(page, rejectTitle, seller, "+12025550156");
  await second.card.getByRole("button", { name: "Reddet" }).click();
  await page.getByText("İlan reddedildi.", { exact: true }).waitFor();
  await page
    .locator("li")
    .filter({ hasText: rejectTitle })
    .getByText("Reddedildi", { exact: true })
    .waitFor();
  const rejectedResponse = await page.goto(`${baseUrl}/ilan/${second.listingId}`, {
    waitUntil: "networkidle",
  });
  assert(rejectedResponse?.status() === 404, "Rejected hosted listing became public.");
  runtimeErrors.splice(0, runtimeErrors.length);

  await page.goto(`${baseUrl}/kurucu`, { waitUntil: "networkidle" });
  const secondCard = page.getByTestId(`operator-listing-${second.listingId}`);
  page.once("dialog", (dialog) => void dialog.accept());
  await secondCard.getByRole("button", { name: "Sil" }).click();
  await page.getByText("İlan ve ilişkili Storage objeleri silindi.", { exact: true }).waitFor();
  await secondCard.waitFor({ state: "detached" });
  assert((await secondCard.count()) === 0, "Deleted rejected listing remained in operator inventory.");

  await page.goto(`${baseUrl}/ara?q=hosted-rc-no-such-listing-7f4c`, { waitUntil: "networkidle" });
  await page.getByText("Sonuç bulunamadı", { exact: true }).first().waitFor();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}/kurucu`, { waitUntil: "networkidle" });
  await assertNoHorizontalOverflow(page, "/kurucu mobile");
  await page.screenshot({
    path: path.join(resultsDir, "hosted-operator-mobile.png"),
    fullPage: true,
  });

  process.kill(shimPid, "SIGTERM");
  await page.getByRole("button", { name: "Yenile" }).click();
  await page.getByRole("alert").waitFor();
  await page
    .getByText("Kurucu işlemi güvenli biçimde tamamlanamadı. İşlem uygulanmış kabul edilmedi.", {
      exact: true,
    })
    .waitFor();

  assert(
    shimBrowserRequests.length === 0,
    `Browser reached the localhost privileged shim: ${shimBrowserRequests.join(" | ")}`,
  );
  assert(
    sensitiveBrowserMutations.length === 0,
    `Browser performed privileged hosted mutations: ${sensitiveBrowserMutations.join(" | ")}`,
  );
  assert(
    runtimeErrors.length === 0,
    `Hosted operator browser runtime errors: ${runtimeErrors.join(" | ")}`,
  );
  console.log(
    "Hosted founder create/photo/publish/public/contact/unpublish/delete + reject/delete browser journey passed.",
  );
} finally {
  await context.close();
  await browser.close();
}
