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

async function anonListingRows(
  listingId: string,
): Promise<
  Array<{ id: string; title: string; price_is_free: boolean; province: string; district: string }>
> {
  const url = new URL(`${backendOrigin}/rest/v1/listings`);
  url.searchParams.set("id", `eq.${listingId}`);
  url.searchParams.set("select", "id,title,price_is_free,province,district");
  const response = await fetch(url, { headers: anonHeaders });
  assert(response.ok, `Anonymous listing probe failed: ${response.status}`);
  return (await response.json()) as Array<{
    id: string;
    title: string;
    price_is_free: boolean;
    province: string;
    district: string;
  }>;
}

async function anonRowsByTitle(title: string): Promise<Array<{ id: string }>> {
  const url = new URL(`${backendOrigin}/rest/v1/listings`);
  url.searchParams.set("title", `eq.${title}`);
  url.searchParams.set("select", "id");
  const response = await fetch(url, { headers: anonHeaders });
  assert(response.ok, `Anonymous title probe failed: ${response.status}`);
  return (await response.json()) as Array<{ id: string }>;
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
      province: "İstanbul",
      district: "Kadıköy",
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

async function assertDetailUnavailable(
  page: Page,
  listingId: string,
  title: string,
): Promise<void> {
  await page.goto(`${publicBaseUrl}/ilan/${listingId}`, { waitUntil: "networkidle" });
  assert(
    (await page.getByRole("heading", { level: 1, name: title }).count()) === 0,
    "Inactive listing detail remained publicly renderable.",
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
    province: string;
    district: string;
    isFree: boolean;
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

  await page.getByLabel("Kategori", { exact: true }).selectOption("vehicle");
  await page.getByLabel("Başlık", { exact: true }).fill(input.title);
  await page.getByLabel("Durum", { exact: true }).selectOption("good");
  if (input.isFree) {
    await page.getByLabel("Ücretsiz veriyorum", { exact: true }).check();
    assert(
      (await page.getByLabel("Fiyat (TL)", { exact: true }).inputValue()) === "",
      "Free state left an active-looking typed price.",
    );
  } else {
    await page.getByLabel("Fiyat (TL)", { exact: true }).fill("1250");
  }
  await page.getByRole("button", { name: /Devam/ }).click();

  await page
    .getByLabel("Açıklama", { exact: true })
    .fill("Sentetik near-final ilan; yalnız otomatik kabul testi verisi içerir.");
  await page.getByLabel("İl", { exact: true }).selectOption(input.province);
  await page.getByLabel("İlçe", { exact: true }).selectOption(input.district);
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

  await page.getByRole("button", { name: "İlanı yayınla" }).click();
  if (input.expectVerification) {
    await page.getByLabel("6 haneli doğrulama kodu", { exact: true }).waitFor();
    await page.getByLabel("6 haneli doğrulama kodu", { exact: true }).fill(verificationCode);

    let transientFailure = "";
    let stopProbe = false;
    const probe = (async () => {
      while (!stopProbe) {
        const rows = await anonRowsByTitle(input.title);
        if (rows[0]?.id) {
          const manifest = await publicPhotoManifest(rows[0].id);
          if (manifest.length !== 1) {
            transientFailure = "A public listing became visible before its trusted photo manifest.";
            return;
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    })();

    await page.getByRole("button", { name: "Doğrula ve yayınla" }).click();
    await page.getByRole("heading", { level: 1, name: "İlanın yayınlandı" }).waitFor();
    stopProbe = true;
    await probe;
    assert(!transientFailure, transientFailure);
  } else {
    assert(
      (await page.getByLabel("6 haneli doğrulama kodu", { exact: true }).count()) === 0,
      "Reusable capability unexpectedly requested another verification code.",
    );
    await page.getByRole("heading", { level: 1, name: "İlanın yayınlandı" }).waitFor();
  }

  const idText = await page.getByText(/^İlan no:/).textContent();
  const listingId = idText?.replace(/^İlan no:\s*/, "").trim() ?? "";
  assert(/^[0-9a-f-]{36}$/i.test(listingId), `Published listing id missing: ${idText}`);
  return listingId;
}

async function openOwnerListings(page: Page, phone: string): Promise<void> {
  await page.goto(`${publicBaseUrl}/ilanlarim`, { waitUntil: "networkidle" });
  await page.getByLabel("İlanlarım telefon numarası", { exact: true }).fill(phone);
  await page.getByRole("button", { name: "Telefonumu doğrula" }).click();
}

async function verifyFreshSellerManagement(page: Page, phone: string): Promise<void> {
  await openOwnerListings(page, phone);
  await page.getByLabel("İlanlarım doğrulama kodu", { exact: true }).waitFor();
  await page.getByLabel("İlanlarım doğrulama kodu", { exact: true }).fill(verificationCode);
  await page.getByRole("button", { name: "Doğrula ve ilanlarımı göster" }).click();
}

function expectHref(actual: string | null, expected: string): void {
  assert(actual === expected, `Expected href ${expected}; received ${actual}`);
}

const browser = await chromium.launch({ headless: true });
const ownerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
const otherContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
const ownerPage = await ownerContext.newPage();
const buyerPage = await ownerContext.newPage();
const otherSellerPage = await otherContext.newPage();
const founderPage = await ownerContext.newPage();
const runtimeErrors: string[] = [];
const privilegedBrowserMutations: string[] = [];
const assetFailures: string[] = [];

for (const page of [ownerPage, buyerPage, otherSellerPage, founderPage]) {
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
      url.pathname.endsWith("/rpc/complete_and_publish_listing_submission") ||
      (url.pathname.startsWith("/storage/v1/object/listing_photos") &&
        !url.pathname.startsWith("/storage/v1/object/sign/listing_photos") &&
        request.method() !== "GET");
    if (sensitive) privilegedBrowserMutations.push(`${request.method()} ${url.pathname}`);
  });
}

try {
  await buyerPage.goto(publicBaseUrl, { waitUntil: "networkidle" });
  await assertAnonDirectWritesDenied();
  assert(
    (await buyerPage.locator("[data-ad-placement]").count()) === 0,
    "Disabled home ad slot left DOM.",
  );

  const ownerPhone = "+12025550188";
  const otherPhone = "+12025550199";
  const title = `Mercedes B 150 near final ${Date.now()}`;
  const listingId = await submitListing(ownerPage, {
    title,
    phone: ownerPhone,
    contact: "phone_whatsapp",
    expectVerification: true,
    photoSeed: 17,
    province: "Tekirdağ",
    district: "Çorlu",
    isFree: true,
  });

  const publicRows = await anonListingRows(listingId);
  assert(
    publicRows.length === 1 && publicRows[0]?.price_is_free === true,
    "Auto-published listing was not immediately public with Free state.",
  );
  const publicManifest = await publicPhotoManifest(listingId);
  assert(publicManifest.length === 1, "Auto-published listing did not expose one trusted photo.");
  const originalObjectPath = publicManifest[0].object_path;

  for (const query of ["b150", "b 150"]) {
    await buyerPage.goto(`${publicBaseUrl}/ara?q=${encodeURIComponent(query)}`, {
      waitUntil: "networkidle",
    });
    const result = buyerPage.getByRole("link", { name: new RegExp(title) }).first();
    await result.waitFor();
    await buyerPage.getByText("Ücretsiz", { exact: true }).first().waitFor();
  }

  await buyerPage
    .getByRole("link", { name: new RegExp(title) })
    .first()
    .click();
  await buyerPage.waitForLoadState("networkidle");
  await buyerPage.getByRole("heading", { level: 1, name: title }).waitFor();
  await buyerPage.getByText("Ücretsiz", { exact: true }).waitFor();
  const hero = buyerPage.getByAltText(`${title} fotoğraf 1`);
  const heroSrc = await hero.getAttribute("src");
  assert(
    heroSrc?.includes("/storage/v1/object/sign/listing_photos/"),
    `Public photo is not signed: ${heroSrc}`,
  );
  const decoded = await hero.evaluate((image) => ({
    complete: (image as HTMLImageElement).complete,
    width: (image as HTMLImageElement).naturalWidth,
  }));
  assert(decoded.complete && decoded.width > 0, "Signed public photo did not decode.");
  expectHref(
    await buyerPage.getByRole("link", { name: "Ara", exact: true }).getAttribute("href"),
    `tel:${ownerPhone}`,
  );
  expectHref(
    await buyerPage
      .getByRole("link", { name: "WhatsApp’tan yaz", exact: true })
      .getAttribute("href"),
    `https://wa.me/${ownerPhone.slice(1)}`,
  );

  await openOwnerListings(ownerPage, ownerPhone);
  const ownerCard = ownerPage.getByTestId(`seller-listing-${listingId}`);
  await ownerCard.waitFor();
  await ownerCard.getByText(/· Yayında$/).waitFor();

  await verifyFreshSellerManagement(otherSellerPage, otherPhone);
  assert(
    (await otherSellerPage.getByText(title, { exact: true }).count()) === 0,
    "Another verified phone inferred the owner's listing.",
  );
  const otherCapability = await otherSellerPage.evaluate(() => {
    const raw = sessionStorage.getItem("arar-buluruz:stage1-phone-capability");
    return raw ? ((JSON.parse(raw) as { token?: string }).token ?? "") : "";
  });
  assert(otherCapability.length > 20, "Other seller verification capability was not stored.");
  const denied = await otherSellerPage.evaluate(
    async ({ phone, capability, listingId }) => {
      const form = new FormData();
      form.set("action", "seller_unpublish");
      form.set("phone", phone);
      form.set("capability", capability);
      form.set("listingId", listingId);
      const response = await fetch("/ilanlarim", { method: "POST", body: form });
      return { status: response.status, body: await response.json() };
    },
    { phone: otherPhone, capability: otherCapability, listingId },
  );
  assert(
    denied.status === 403 &&
      typeof denied.body === "object" &&
      denied.body !== null &&
      (denied.body as { code?: string }).code === "NOT_AUTHORIZED",
    `Cross-phone mutation did not fail generically: ${JSON.stringify(denied)}`,
  );

  await ownerCard.getByRole("button", { name: "Düzenle" }).click();
  await ownerPage.getByLabel("İlanlarım başlık").fill(`${title} güncel`);
  await ownerPage.getByLabel("Ücretsiz veriyorum").uncheck();
  await ownerPage.getByLabel("İlanlarım fiyat").fill("4321");
  await ownerPage.getByLabel("İlanlarım il").selectOption("İstanbul");
  await ownerPage.getByLabel("İlanlarım ilçe").selectOption("Kadıköy");
  await ownerPage.getByRole("button", { name: "Değişiklikleri kaydet" }).click();
  await ownerPage.getByText("İlan güncellendi.", { exact: true }).waitFor();

  const updatedRows = await anonListingRows(listingId);
  assert(
    updatedRows.length === 1 &&
      updatedRows[0]?.price_is_free === false &&
      updatedRows[0]?.province === "İstanbul" &&
      updatedRows[0]?.district === "Kadıköy",
    `Seller edit did not reach public row: ${JSON.stringify(updatedRows)}`,
  );

  const updatedCard = ownerPage.getByTestId(`seller-listing-${listingId}`);
  await updatedCard.getByRole("button", { name: "Yayından kaldır" }).click();
  await ownerPage.getByText("İlan yayından kaldırıldı.", { exact: true }).waitFor();
  assert(
    (await anonListingRows(listingId)).length === 0,
    "Seller-unpublished listing remained public.",
  );
  assert(
    (await publicPhotoManifest(listingId)).length === 0,
    "Seller-unpublished photo remained public.",
  );
  await assertSignedObjectUnavailable(originalObjectPath);
  await assertDetailUnavailable(buyerPage, listingId, `${title} güncel`);

  await ownerPage
    .getByTestId(`seller-listing-${listingId}`)
    .getByRole("button", { name: "Satıldı" })
    .click();
  await ownerPage.getByText("İlan satıldı olarak işaretlendi.", { exact: true }).waitFor();
  await ownerPage
    .getByTestId(`seller-listing-${listingId}`)
    .getByRole("button", { name: "Sil" })
    .click();
  await ownerPage.getByRole("button", { name: "Evet, sil" }).click();
  await ownerPage.getByText("İlan silindi.", { exact: true }).waitFor();
  assert(
    (await anonListingRows(listingId)).length === 0,
    "Seller-deleted listing row remained public.",
  );
  assert(
    (await privilegedPhotoInventory(listingId)).length === 0,
    "Seller delete left photo metadata.",
  );
  const encodedDeletedPath = originalObjectPath.split("/").map(encodeURIComponent).join("/");
  const deletedObject = await fetch(
    `${backendOrigin}/storage/v1/object/listing_photos/${encodedDeletedPath}`,
    { headers: serviceHeaders },
  );
  assert(!deletedObject.ok, `Seller delete left Storage object: ${deletedObject.status}`);

  const founderTitle = `Founder takedown B 150 ${Date.now()}`;
  const founderListingId = await submitListing(ownerPage, {
    title: founderTitle,
    phone: ownerPhone,
    contact: "phone",
    expectVerification: false,
    photoSeed: 29,
    province: "İstanbul",
    district: "Kadıköy",
    isFree: false,
  });
  const founderInventory = await privilegedPhotoInventory(founderListingId);
  assert(
    founderInventory.length === 1,
    "Founder-takedown fixture did not retain one trusted photo.",
  );
  const founderObjectPath = founderInventory[0].object_path;
  assert(
    (await anonListingRows(founderListingId)).length === 1,
    "Founder fixture did not auto-publish.",
  );

  await founderPage.goto(`${founderBaseUrl}/kurucu`, { waitUntil: "networkidle" });
  await founderPage.getByRole("heading", { level: 1, name: "İlan moderasyonu" }).waitFor();
  const founderCard = founderPage.getByTestId(`moderation-listing-${founderListingId}`);
  await founderCard.waitFor();
  await founderCard.getByText("Yayında", { exact: true }).waitFor();
  assert(
    (await founderCard.getByRole("button", { name: "Yayınla" }).count()) === 0,
    "Founder UI still exposed normal publication as a moderation step.",
  );
  assert(
    (await founderCard.getByRole("button", { name: "Reddet" }).count()) === 0,
    "Founder UI still exposed pending rejection as the normal product path.",
  );
  await founderCard.getByRole("button", { name: "Yayından kaldır" }).click();
  await founderPage.getByText("İlan yayından kaldırıldı.", { exact: true }).waitFor();
  assert(
    (await anonListingRows(founderListingId)).length === 0,
    "Founder takedown remained public.",
  );
  assert(
    (await publicPhotoManifest(founderListingId)).length === 0,
    "Founder takedown photo remained public.",
  );
  await assertSignedObjectUnavailable(founderObjectPath);
  await assertDetailUnavailable(buyerPage, founderListingId, founderTitle);

  await founderPage.goto(`${founderBaseUrl}/kurucu`, { waitUntil: "networkidle" });
  await founderPage
    .getByTestId(`moderation-listing-${founderListingId}`)
    .getByRole("button", { name: "Sil" })
    .click();
  await founderPage.getByText("İlan ve ilişkili fotoğraflar silindi.", { exact: true }).waitFor();

  await ownerPage.screenshot({
    path: path.join(resultsDir, "near-final-owner-management.png"),
    fullPage: true,
  });
  await buyerPage.screenshot({
    path: path.join(resultsDir, "near-final-public-state.png"),
    fullPage: true,
  });

  assert(
    privilegedBrowserMutations.length === 0,
    `Browser performed privileged backend mutations: ${privilegedBrowserMutations.join(" | ")}`,
  );
  assert(assetFailures.length === 0, `CSS/JS asset failures: ${assetFailures.join(" | ")}`);
  assert(runtimeErrors.length === 0, `Browser runtime errors: ${runtimeErrors.join(" | ")}`);

  console.log(
    "Near-final browser acceptance passed: trusted self-service auto-publish -> public search/detail/contact -> verified-phone ownership isolation/edit/unpublish/sold/delete -> founder post-moderation takedown.",
  );
} finally {
  await ownerContext.close();
  await otherContext.close();
  await browser.close();
}
