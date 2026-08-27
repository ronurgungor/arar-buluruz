import fs from "node:fs";
import path from "node:path";
import { deflateSync } from "node:zlib";
import { chromium, type Page, type Response as PlaywrightResponse } from "playwright";

const publicBaseUrl = process.env.PUBLIC_BASE_URL ?? "http://127.0.0.1:4173";
const founderBaseUrl = process.env.FOUNDER_BASE_URL ?? "http://127.0.0.1:4175";
const backendOrigin = process.env.BACKEND_ORIGIN;
const anonKey = process.env.BACKEND_ANON_KEY;
const serviceRoleKey = process.env.BACKEND_SERVICE_ROLE_KEY;
const verificationCode = process.env.SYNTHETIC_VERIFICATION_CODE ?? "424242";
if (!backendOrigin || !anonKey || !serviceRoleKey) {
  throw new Error("BACKEND_ORIGIN, BACKEND_ANON_KEY and BACKEND_SERVICE_ROLE_KEY are required.");
}

const resultsDir = path.resolve("test-results/stage1-self-service");
fs.mkdirSync(resultsDir, { recursive: true });

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

function makeSyntheticPng(seed: number): Uint8Array {
  const signature = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);
  view.setUint32(0, 2, false);
  view.setUint32(4, 2, false);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const a = seed & 0xff;
  const scanlines = concatBytes(
    new Uint8Array([0, a, 0x34, 0x56, 0xff, 0x78, 0x9a, 0xbc, 0xff]),
    new Uint8Array([0, 0x33, a, 0x77, 0xff, 0xaa, 0xbb, a, 0xff]),
  );
  return concatBytes(
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", new Uint8Array(deflateSync(scanlines))),
    pngChunk("IEND", new Uint8Array()),
  );
}

const anonHeaders = {
  apikey: anonKey,
  Authorization: `Bearer ${anonKey}`,
  "content-type": "application/json",
};
const serviceHeaders = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  "content-type": "application/json",
};

async function anonListingRows(listingId: string): Promise<unknown[]> {
  const url = new URL(`${backendOrigin}/rest/v1/listings`);
  url.searchParams.set("id", `eq.${listingId}`);
  url.searchParams.set("select", "id");
  const response = await fetch(url, { headers: anonHeaders });
  assert(response.ok, `Anonymous listing probe failed: ${response.status}`);
  return (await response.json()) as unknown[];
}

async function publicPhotoManifest(listingId: string): Promise<Array<{ object_path: string }>> {
  const response = await fetch(`${backendOrigin}/rest/v1/rpc/get_public_listing_photos`, {
    method: "POST",
    headers: anonHeaders,
    body: JSON.stringify({ p_listing_id: listingId }),
  });
  assert(response.ok, `Public photo manifest probe failed: ${response.status}`);
  return (await response.json()) as Array<{ object_path: string }>;
}

async function privilegedPhotoInventory(
  listingId: string,
): Promise<Array<{ object_path: string }>> {
  const response = await fetch(`${backendOrigin}/rest/v1/rpc/get_listing_photo_inventory`, {
    method: "POST",
    headers: serviceHeaders,
    body: JSON.stringify({ p_listing_id: listingId }),
  });
  assert(response.ok, `Privileged photo inventory probe failed: ${response.status}`);
  return (await response.json()) as Array<{ object_path: string }>;
}

async function assertAnonDirectWritesDenied(): Promise<void> {
  const directInsert = await fetch(`${backendOrigin}/rest/v1/listings`, {
    method: "POST",
    headers: { ...anonHeaders, Prefer: "return=minimal" },
    body: JSON.stringify({
      title: "Forbidden direct insert",
      description: "Anonymous clients must never create listing rows directly.",
      price_amount: 1,
      province: "Tekirdağ",
      district: "Çorlu",
      seller_display_name: "Forbidden",
      status: "pending",
    }),
  });
  assert(
    !directInsert.ok,
    `Anonymous direct listing INSERT unexpectedly succeeded: ${directInsert.status}`,
  );

  const directStorage = await fetch(
    `${backendOrigin}/storage/v1/object/listing_photos/forbidden/direct-write.webp`,
    {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        "content-type": "image/webp",
        "x-upsert": "false",
      },
      body: new Uint8Array([0x52, 0x49, 0x46, 0x46]),
    },
  );
  assert(
    !directStorage.ok,
    `Anonymous direct Storage write unexpectedly succeeded: ${directStorage.status}`,
  );
}

async function assertSignedObjectUnavailable(objectPath: string): Promise<void> {
  const encoded = objectPath.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(
    `${backendOrigin}/storage/v1/object/sign/listing_photos/${encoded}`,
    {
      method: "POST",
      headers: anonHeaders,
      body: JSON.stringify({ expiresIn: 60 }),
    },
  );
  assert(!response.ok, `Inactive/private photo unexpectedly remained signable: ${response.status}`);
}

async function assertNoHorizontalOverflow(page: Page, route: string): Promise<void> {
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  assert(dimensions.document <= dimensions.viewport, `${route} has horizontal overflow`);
}

async function assertStyledPilot(page: Page): Promise<void> {
  const style = await page
    .getByRole("link", { name: "İlan Ver", exact: true })
    .evaluate((element) => {
      const computed = getComputedStyle(element);
      return {
        display: computed.display,
        minHeight: computed.minHeight,
        borderRadius: computed.borderRadius,
        backgroundColor: computed.backgroundColor,
      };
    });
  assert(style.display !== "inline", `Pilot CTA appears browser-default: ${JSON.stringify(style)}`);
  assert(parseFloat(style.minHeight) >= 40, `Pilot CTA CSS did not load: ${JSON.stringify(style)}`);
  assert(parseFloat(style.borderRadius) > 10, `Pilot CTA radius missing: ${JSON.stringify(style)}`);
  assert(
    style.backgroundColor !== "rgba(0, 0, 0, 0)",
    `Pilot CTA background missing: ${JSON.stringify(style)}`,
  );
}

async function submitListing(
  page: Page,
  input: {
    title: string;
    phone: string;
    contact: "phone" | "whatsapp" | "phone_whatsapp";
    expectVerification: boolean;
    photoSeed: number;
  },
): Promise<string> {
  await page.goto(`${publicBaseUrl}/ilan-ver`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { level: 1, name: "İlan Ver" }).waitFor();
  await assertNoHorizontalOverflow(page, "/ilan-ver");

  await page.getByTestId("stage1-photo-input").setInputFiles({
    name: `synthetic-${input.photoSeed}.png`,
    mimeType: "image/png",
    buffer: Buffer.from(makeSyntheticPng(input.photoSeed)),
  });
  await page.getByAltText("Seçilen fotoğraf 1", { exact: true }).waitFor();
  await page.getByRole("button", { name: /Devam/ }).click();

  const category = page.getByLabel("Kategori", { exact: true });
  try {
    await category.waitFor();
  } catch (error) {
    const pageText = (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 1200);
    throw new Error(
      `Photo step did not advance. Runtime errors: ${runtimeErrors.join(" | ") || "none"}. Page: ${pageText}`,
      { cause: error },
    );
  }
  await category.selectOption("home");
  await page.getByLabel("Başlık", { exact: true }).fill(input.title);
  await page.getByLabel("Durum", { exact: true }).selectOption("good");
  await page.getByLabel("Fiyat (TL)", { exact: true }).fill("1250");
  await page.getByRole("button", { name: /Devam/ }).click();

  await page
    .getByLabel("Açıklama", { exact: true })
    .fill("Sentetik Stage 1 self-service kabul ilanı; yalnız test verisi içerir.");
  await page.getByRole("button", { name: /Devam/ }).click();

  await page.getByLabel("İlanda görünecek ad", { exact: true }).fill("Sentetik Satıcı");
  await page.getByLabel("Telefon numarası", { exact: true }).fill(input.phone);
  await page
    .getByLabel(
      input.contact === "phone_whatsapp"
        ? "Telefon + WhatsApp"
        : input.contact === "phone"
          ? "Telefon"
          : "WhatsApp",
      { exact: true },
    )
    .check();
  await page
    .getByText(/Özel kişi olarak ara sıra ilan veriyorum/)
    .locator("..")
    .getByRole("checkbox")
    .check();
  await page
    .getByText(/Fotoğraf ve metni paylaşmaya yetkim var/)
    .locator("..")
    .getByRole("checkbox")
    .check();
  await page
    .getByText(/Bu telefon bana ait/)
    .locator("..")
    .getByRole("checkbox")
    .check();

  await page.getByRole("button", { name: "İlanı gönder" }).click();
  if (input.expectVerification) {
    await page.getByLabel("6 haneli doğrulama kodu", { exact: true }).waitFor();
    await page.getByLabel("6 haneli doğrulama kodu", { exact: true }).fill(verificationCode);
    await page.getByRole("button", { name: "Doğrula ve gönder" }).click();
  } else {
    assert(
      (await page.getByLabel("6 haneli doğrulama kodu", { exact: true }).count()) === 0,
      "Reusable capability unexpectedly requested another verification code.",
    );
  }

  await page.getByRole("heading", { level: 1, name: "İlanınız incelemeye alındı" }).waitFor();
  const idText = await page.getByText(/^İlan no:/).textContent();
  const listingId = idText?.replace(/^İlan no:\s*/, "").trim() ?? "";
  assert(/^[0-9a-f-]{36}$/i.test(listingId), `Pending listing id missing: ${idText}`);
  return listingId;
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const sellerPage = await context.newPage();
const founderPage = await context.newPage();
const buyerPage = await context.newPage();
const runtimeErrors: string[] = [];
const privilegedBrowserMutations: string[] = [];
const assetFailures: string[] = [];

for (const page of [sellerPage, founderPage, buyerPage]) {
  page.on("pageerror", (error) => runtimeErrors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(`console: ${message.text()}`);
  });
  page.on("response", (response: PlaywrightResponse) => {
    const url = response.url();
    if (
      (url.includes("/assets/") || /\.(?:css|js)(?:\?|$)/.test(url)) &&
      response.status() >= 400
    ) {
      assetFailures.push(`${response.status()} ${url}`);
    }
  });
  page.on("request", (request) => {
    if (!request.url().startsWith(backendOrigin)) return;
    const url = new URL(request.url());
    const sensitive =
      (url.pathname === "/rest/v1/listings" && request.method() !== "GET") ||
      url.pathname.endsWith("/rpc/register_sanitized_listing_photo") ||
      url.pathname.endsWith("/rpc/get_listing_photo_inventory") ||
      (url.pathname.startsWith("/storage/v1/object/listing_photos") &&
        !url.pathname.startsWith("/storage/v1/object/sign/listing_photos") &&
        request.method() !== "GET");
    if (sensitive) privilegedBrowserMutations.push(`${request.method()} ${url.pathname}`);
  });
}

try {
  await buyerPage.goto(publicBaseUrl, { waitUntil: "networkidle" });
  await assertStyledPilot(buyerPage);
  assert(
    (await buyerPage.locator("[data-ad-placement]").count()) === 0,
    "Disabled home ad slot left visible DOM.",
  );
  assert(assetFailures.length === 0, `Pilot CSS/JS asset failures: ${assetFailures.join(" | ")}`);
  await assertAnonDirectWritesDenied();

  const phone = "+12025550188";
  const title = `Stage1 both contact ${Date.now()}`;
  const listingId = await submitListing(sellerPage, {
    title,
    phone,
    contact: "phone_whatsapp",
    expectVerification: true,
    photoSeed: 17,
  });
  await sellerPage.screenshot({
    path: path.join(resultsDir, "seller-pending-success.png"),
    fullPage: true,
  });

  assert(
    (await anonListingRows(listingId)).length === 0,
    "Pending listing became anonymously readable.",
  );
  assert(
    (await publicPhotoManifest(listingId)).length === 0,
    "Pending photo manifest became public.",
  );
  const pendingInventory = await privilegedPhotoInventory(listingId);
  assert(
    pendingInventory.length === 1,
    "Pending listing did not retain one sanitized private photo.",
  );
  const originalObjectPath = pendingInventory[0].object_path;

  await founderPage.goto(`${founderBaseUrl}/kurucu`, { waitUntil: "networkidle" });
  await founderPage.getByRole("heading", { level: 1, name: "İlan moderasyonu" }).waitFor();
  const pendingCard = founderPage.getByTestId(`moderation-listing-${listingId}`);
  await pendingCard.waitFor();
  await pendingCard.getByText("İncelemede", { exact: true }).waitFor();
  await pendingCard.getByText(/Telefon kontrolü:/).waitFor();
  await pendingCard.getByText(/Özel satıcı beyanı:/).waitFor();
  await pendingCard.getByText(/İçerik hakları beyanı:/).waitFor();
  const moderationImage = pendingCard.getByAltText(`${title} moderasyon fotoğrafı`);
  await moderationImage.waitFor();
  const moderationDecoded = await moderationImage.evaluate((image) => ({
    complete: (image as HTMLImageElement).complete,
    width: (image as HTMLImageElement).naturalWidth,
  }));
  assert(
    moderationDecoded.complete && moderationDecoded.width > 0,
    "Founder could not preview sanitized private photo.",
  );
  await pendingCard.getByRole("button", { name: "Yayınla" }).click();
  await founderPage.getByText("İlan yayınlandı.", { exact: true }).waitFor();

  await buyerPage.goto(`${publicBaseUrl}/ara?q=${encodeURIComponent("Stage1 both")}`, {
    waitUntil: "networkidle",
  });
  const resultLink = buyerPage.getByRole("link", { name: new RegExp(title) }).first();
  await resultLink.waitFor();
  assert(
    (await buyerPage.locator("[data-ad-placement]").count()) === 0,
    "Disabled search ad slot left visible DOM.",
  );
  await resultLink.click();
  await buyerPage.waitForLoadState("networkidle");
  await buyerPage.getByRole("heading", { level: 1, name: title }).waitFor();
  const hero = buyerPage.getByAltText(`${title} fotoğraf 1`);
  const heroSrc = await hero.getAttribute("src");
  assert(
    heroSrc?.includes("/storage/v1/object/sign/listing_photos/"),
    `Public photo is not signed: ${heroSrc}`,
  );
  const heroDecoded = await hero.evaluate((image) => ({
    complete: (image as HTMLImageElement).complete,
    width: (image as HTMLImageElement).naturalWidth,
  }));
  assert(heroDecoded.complete && heroDecoded.width > 0, "Signed public photo did not decode.");
  const phoneAction = buyerPage.getByRole("link", { name: "Ara", exact: true });
  const whatsAppAction = buyerPage.getByRole("link", { name: "WhatsApp’tan yaz", exact: true });
  expectHref(await phoneAction.getAttribute("href"), `tel:${phone}`);
  expectHref(await whatsAppAction.getAttribute("href"), `https://wa.me/${phone.slice(1)}`);
  assert(
    (await buyerPage.locator("[data-ad-placement]").count()) === 0,
    "Disabled detail ad slot left visible DOM.",
  );
  await buyerPage.screenshot({
    path: path.join(resultsDir, "published-phone-whatsapp.png"),
    fullPage: true,
  });

  await founderPage.goto(`${founderBaseUrl}/kurucu`, { waitUntil: "networkidle" });
  const publishedCard = founderPage.getByTestId(`moderation-listing-${listingId}`);
  await publishedCard.getByRole("button", { name: "Yayından kaldır" }).click();
  await founderPage.getByText("İlan yayından kaldırıldı.", { exact: true }).waitFor();
  assert((await anonListingRows(listingId)).length === 0, "Unpublished listing remained public.");
  assert(
    (await publicPhotoManifest(listingId)).length === 0,
    "Unpublished photo manifest remained public.",
  );
  await assertSignedObjectUnavailable(originalObjectPath);

  await founderPage.goto(`${founderBaseUrl}/kurucu`, { waitUntil: "networkidle" });
  await founderPage
    .getByTestId(`moderation-listing-${listingId}`)
    .getByRole("button", { name: "Sil" })
    .click();
  await founderPage.getByText("İlan ve fotoğrafları silindi.", { exact: true }).waitFor();
  const deletedProbe = await fetch(
    `${backendOrigin}/rest/v1/listings?id=eq.${listingId}&select=id`,
    { headers: serviceHeaders },
  );
  assert(
    deletedProbe.ok && ((await deletedProbe.json()) as unknown[]).length === 0,
    "Deleted listing row remained.",
  );
  assert(
    (await privilegedPhotoInventory(listingId)).length === 0,
    "Deleted listing photo metadata remained.",
  );
  const encodedDeletedPath = originalObjectPath.split("/").map(encodeURIComponent).join("/");
  const deletedObject = await fetch(
    `${backendOrigin}/storage/v1/object/listing_photos/${encodedDeletedPath}`,
    { headers: serviceHeaders },
  );
  assert(!deletedObject.ok, `Deleted Storage object remained readable: ${deletedObject.status}`);

  const rejectTitle = `Stage1 reject ${Date.now()}`;
  const rejectId = await submitListing(sellerPage, {
    title: rejectTitle,
    phone,
    contact: "phone",
    expectVerification: false,
    photoSeed: 29,
  });
  assert((await anonListingRows(rejectId)).length === 0, "Second pending listing became public.");
  await founderPage.goto(`${founderBaseUrl}/kurucu`, { waitUntil: "networkidle" });
  const rejectCard = founderPage.getByTestId(`moderation-listing-${rejectId}`);
  await rejectCard.getByRole("button", { name: "Reddet" }).click();
  await founderPage.getByText("İlan reddedildi.", { exact: true }).waitFor();
  assert((await anonListingRows(rejectId)).length === 0, "Rejected listing became public.");
  await founderPage.goto(`${founderBaseUrl}/kurucu`, { waitUntil: "networkidle" });
  await founderPage
    .getByTestId(`moderation-listing-${rejectId}`)
    .getByRole("button", { name: "Sil" })
    .click();
  await founderPage.getByText("İlan ve fotoğrafları silindi.", { exact: true }).waitFor();
  assert(
    (await privilegedPhotoInventory(rejectId)).length === 0,
    "Rejected listing cleanup left photo metadata.",
  );

  assert(
    privilegedBrowserMutations.length === 0,
    `Browser performed privileged backend mutations: ${privilegedBrowserMutations.join(" | ")}`,
  );
  assert(
    assetFailures.length === 0,
    `CSS/JS assets failed during Stage-1 journey: ${assetFailures.join(" | ")}`,
  );
  assert(runtimeErrors.length === 0, `Browser runtime errors: ${runtimeErrors.join(" | ")}`);
  console.log(
    "Stage-1 seller submission → pending → moderation → publish/contact → unpublish/delete + reject browser acceptance passed.",
  );
} finally {
  await browser.close();
}

function expectHref(actual: string | null, expected: string): void {
  assert(actual === expected, `Expected href ${expected}; received ${actual}`);
}
