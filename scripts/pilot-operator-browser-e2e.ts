import fs from "node:fs";
import path from "node:path";
import { deflateSync } from "node:zlib";
import { chromium, type Page } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:4173";
const backendOrigin = process.env.BACKEND_ORIGIN;
if (!backendOrigin) throw new Error("BACKEND_ORIGIN is required for operator browser proof.");

const resultsDir = path.resolve("test-results/gate1-browser");
fs.mkdirSync(resultsDir, { recursive: true });
const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

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
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
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

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
const runtimeErrors: string[] = [];
const sensitiveBrowserMutations: string[] = [];
page.on("pageerror", (error) => runtimeErrors.push(`pageerror: ${error.message}`));
page.on("console", (message) => {
  if (message.type() === "error") runtimeErrors.push(`console: ${message.text()}`);
});
page.on("request", (request) => {
  if (!request.url().startsWith(backendOrigin)) return;
  const url = new URL(request.url());
  const sensitive =
    (url.pathname === "/rest/v1/listings" && request.method() !== "GET") ||
    url.pathname.endsWith("/rpc/register_sanitized_listing_photo") ||
    url.pathname.endsWith("/rpc/get_listing_photo_inventory") ||
    (url.pathname.startsWith("/storage/v1/object/listing_photos") && request.method() !== "GET");
  if (sensitive) sensitiveBrowserMutations.push(`${request.method()} ${url.pathname}`);
});

const title = "Operator sentetik fotoğraflı ilan";
const seller = "Operator Sentetik Satıcı";
const contactE164 = "+12025550155";

try {
  await page.goto(`${baseUrl}/kurucu`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { level: 1, name: "Kurucu pilot işlemleri" }).waitFor();
  assert(
    (await page.getByRole("link", { name: "Giriş" }).count()) === 0,
    "Operator header exposed a login CTA.",
  );
  await assertNoHorizontalOverflow(page, "/kurucu");

  await page.locator('input[name="privacyNoticeDelivered"]').check();
  await page.locator('input[name="privateSellerDeclaration"]').check();
  await page.locator('input[name="contentRightsDeclaration"]').check();
  await page.getByLabel("İlanda görünecek ad", { exact: true }).fill(seller);
  await page.getByLabel("Başlık", { exact: true }).fill(title);
  await page.getByLabel("Fiyat (TL)", { exact: true }).fill("9876.50");
  await page.getByLabel("Satıcı telefonu (E.164)", { exact: true }).fill(contactE164);
  await page
    .getByLabel("Açıklama", { exact: true })
    .fill("Kurucu arayüzü ve gerçek private fotoğraf zinciri için sentetik kabul ilanı.");
  await page.getByTestId("operator-photo-input").setInputFiles({
    name: "untrusted-source.png",
    mimeType: "image/png",
    buffer: Buffer.from(makeSyntheticPng()),
  });

  await page.getByRole("button", { name: "Pending ilan ve fotoğrafı kaydet" }).click();
  await page.getByText("Pending ilan ve güvenli fotoğraf kaydedildi.", { exact: true }).waitFor();
  const card = page.locator("li").filter({ hasText: title });
  await card.waitFor();
  assert(
    (await card.getByText("İncelemede", { exact: true }).count()) === 1,
    "Created listing is not pending.",
  );
  assert(
    (await card.getByText(/1 fotoğraf/).count()) === 1,
    "Created listing does not have one photo.",
  );
  await card.getByText(/phone · \+1202555/).waitFor();
  const testId = await card.getAttribute("data-testid");
  assert(
    testId?.startsWith("operator-listing-"),
    "Operator listing card did not expose its synthetic identity.",
  );
  const listingId = testId.slice("operator-listing-".length);
  await page.screenshot({ path: path.join(resultsDir, "operator-pending.png"), fullPage: true });

  const pendingResponse = await page.goto(`${baseUrl}/ilan/${listingId}`, {
    waitUntil: "networkidle",
  });
  assert(pendingResponse?.status() === 404, "Pending operator listing became publicly readable.");
  runtimeErrors.splice(0, runtimeErrors.length);

  await page.goto(`${baseUrl}/kurucu`, { waitUntil: "networkidle" });
  await page.getByLabel("Telefon kontrolü tamamlandı", { exact: true }).check();
  await page
    .getByText(/Numaram ilanla ilgili iletişim için kamuya açık yayımlansın/)
    .locator("..")
    .getByRole("checkbox")
    .check();
  await page
    .locator("li")
    .filter({ hasText: title })
    .getByRole("button", { name: "Yayınla" })
    .click();
  await page.getByText("İlan yayınlandı.", { exact: true }).waitFor();

  await page.goto(`${baseUrl}/ara?q=operator`, { waitUntil: "networkidle" });
  await page
    .getByRole("link", { name: new RegExp(title) })
    .first()
    .waitFor();
  const collectionPhoto = page.getByAltText(title).first();
  const collectionSrc = await collectionPhoto.getAttribute("src");
  assert(
    collectionSrc?.includes("/storage/v1/object/sign/listing_photos/"),
    `Collection did not render signed private photo: ${collectionSrc}`,
  );
  assert(
    await collectionPhoto.evaluate((image) => (image as HTMLImageElement).naturalWidth > 0),
    "Collection signed photo did not decode.",
  );

  await page.goto(`${baseUrl}/ilan/${listingId}`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { level: 1, name: title }).waitFor();
  const detailPhoto = page.getByAltText(`${title} fotoğraf 1`);
  const detailSrc = await detailPhoto.getAttribute("src");
  assert(
    detailSrc?.includes("/storage/v1/object/sign/listing_photos/"),
    `Detail did not render signed private photo: ${detailSrc}`,
  );
  assert(
    await detailPhoto.evaluate((image) => (image as HTMLImageElement).naturalWidth > 0),
    "Detail signed photo did not decode.",
  );
  const contactLink = page.getByRole("link", { name: "Satıcıyı ara" });
  assert(
    (await contactLink.getAttribute("href")) === `tel:${contactE164}`,
    "Published seller phone drifted.",
  );
  assert(
    (await page.locator('a[href*="wa.me"]').count()) === 0,
    "Published listing exposed a WhatsApp CTA.",
  );
  await page.screenshot({
    path: path.join(resultsDir, "operator-published-detail.png"),
    fullPage: true,
  });

  await page.goto(`${baseUrl}/kurucu`, { waitUntil: "networkidle" });
  await page
    .locator("li")
    .filter({ hasText: title })
    .getByRole("button", { name: "Yayından kaldır" })
    .click();
  await page.getByText("İlan yayından kaldırıldı.", { exact: true }).waitFor();
  const unpublishedResponse = await page.goto(`${baseUrl}/ilan/${listingId}`, {
    waitUntil: "networkidle",
  });
  assert(unpublishedResponse?.status() === 404, "Unpublished listing remained publicly readable.");
  runtimeErrors.splice(0, runtimeErrors.length);

  await page.goto(`${baseUrl}/kurucu`, { waitUntil: "networkidle" });
  page.once("dialog", (dialog) => void dialog.accept());
  await page.locator("li").filter({ hasText: title }).getByRole("button", { name: "Sil" }).click();
  await page.getByText("İlan ve ilişkili Storage objeleri silindi.", { exact: true }).waitFor();
  assert(
    (await page.locator("li").filter({ hasText: title }).count()) === 0,
    "Hard-deleted listing remained in operator inventory.",
  );

  await page.goto(`${baseUrl}/ara?q=operator`, { waitUntil: "networkidle" });
  assert(
    (await page.getByText(title, { exact: true }).count()) === 0,
    "Hard-deleted listing remained visible in public search.",
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}/kurucu`, { waitUntil: "networkidle" });
  await assertNoHorizontalOverflow(page, "/kurucu mobile");
  await page.screenshot({ path: path.join(resultsDir, "operator-mobile.png"), fullPage: true });

  assert(
    sensitiveBrowserMutations.length === 0,
    `Browser directly performed privileged backend mutations: ${sensitiveBrowserMutations.join(" | ")}`,
  );
  assert(
    runtimeErrors.length === 0,
    `Operator browser runtime errors: ${runtimeErrors.join(" | ")}`,
  );
  console.log("Pilot operator phone-only app-UI create/photo/publish/unpublish/delete E2E passed.");
} finally {
  await context.close();
  await browser.close();
}
