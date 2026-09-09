import fs from "node:fs";
import path from "node:path";
import { deflateSync } from "node:zlib";
import type { BrowserContext, Cookie, Page, Response as PlaywrightResponse } from "playwright";

export const publicBaseUrl = process.env.PUBLIC_BASE_URL ?? "http://127.0.0.1:4173";
export const founderBaseUrl = process.env.FOUNDER_BASE_URL ?? "http://127.0.0.1:4175";
export const backendOrigin = process.env.BACKEND_ORIGIN ?? "";
export const anonKey = process.env.BACKEND_ANON_KEY ?? "";
export const serviceRoleKey = process.env.BACKEND_SERVICE_ROLE_KEY ?? "";
export const handoffDir =
  process.env.PHASE2_HANDOFF_DIR ?? path.resolve("test-results/phase2-handoff");
export const publicHandoffPath = path.join(handoffDir, "public.json");
export const privateHandoffPath = path.join(handoffDir, "private.json");
export const resultsDir = path.resolve("test-results/stage1-self-service");
export const ownerPhone = "+12025550188";
export const otherPhone = "+12025550199";

fs.mkdirSync(handoffDir, { recursive: true });
fs.mkdirSync(resultsDir, { recursive: true });

export function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export function requirePublicBackend(): void {
  assert(backendOrigin.length > 0, "BACKEND_ORIGIN is required.");
  assert(anonKey.length > 0, "BACKEND_ANON_KEY is required.");
}

export function requireServiceBackend(): void {
  requirePublicBackend();
  assert(serviceRoleKey.length > 0, "BACKEND_SERVICE_ROLE_KEY is required.");
}

export type PublicHandoff = {
  listingId: string;
  title: string;
};

export type PrivateHandoff = {
  recoveryCode: string;
  sessionCookie: Cookie;
};

export function writeHandoff(publicState: PublicHandoff, privateState: PrivateHandoff): void {
  fs.writeFileSync(publicHandoffPath, `${JSON.stringify(publicState)}\n`, { encoding: "utf-8" });
  fs.writeFileSync(privateHandoffPath, `${JSON.stringify(privateState)}\n`, {
    encoding: "utf-8",
    mode: 0o600,
  });
  fs.chmodSync(privateHandoffPath, 0o600);
}

export function readPublicHandoff(): PublicHandoff {
  return JSON.parse(fs.readFileSync(publicHandoffPath, "utf-8")) as PublicHandoff;
}

export function readPrivateHandoff(): PrivateHandoff {
  return JSON.parse(fs.readFileSync(privateHandoffPath, "utf-8")) as PrivateHandoff;
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

export function makeSyntheticPng(seed: number): Uint8Array {
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

type ExpectedHttpFailureStatus = 401 | 403 | 404;
type HttpFailureExpectation = {
  page: Page;
  status: ExpectedHttpFailureStatus;
  method: string;
  pathname: string;
  label: string;
};
type ConsoleFailureAllowance = { page: Page; status: ExpectedHttpFailureStatus; label: string };

export class HarnessMonitor {
  private readonly expectedResponses: HttpFailureExpectation[] = [];
  private readonly consoleAllowances: ConsoleFailureAllowance[] = [];
  private readonly runtimeErrors: string[] = [];
  private readonly privilegedBrowserMutations: string[] = [];
  private readonly assetFailures: string[] = [];

  expectHttpFailureOnce(
    page: Page,
    status: ExpectedHttpFailureStatus,
    method: string,
    pathname: string,
    label: string,
  ): void {
    this.expectedResponses.push({ page, status, method: method.toUpperCase(), pathname, label });
  }

  expectUnauthorizedOnce(page: Page, method: string, pathname: string, label: string): void {
    this.expectHttpFailureOnce(page, 401, method, pathname, label);
  }

  observePage(page: Page): void {
    page.on("pageerror", (error) => this.runtimeErrors.push(`pageerror: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() !== "error") return;
      const text = message.text();
      const match = text.match(
        /^Failed to load resource: the server responded with a status of (401|403|404)\b/,
      );
      if (match) {
        const status = Number(match[1]) as ExpectedHttpFailureStatus;
        const index = this.consoleAllowances.findIndex(
          (allowance) => allowance.page === page && allowance.status === status,
        );
        if (index >= 0) {
          this.consoleAllowances.splice(index, 1);
          return;
        }
      }
      this.runtimeErrors.push(`console: ${text}`);
    });
    page.on("response", (response: PlaywrightResponse) => {
      const url = response.url();
      const status = response.status();
      if (status === 401 || status === 403 || status === 404) {
        const method = response.request().method().toUpperCase();
        const pathname = new URL(url).pathname;
        const index = this.expectedResponses.findIndex(
          (expectation) =>
            expectation.page === page &&
            expectation.status === status &&
            expectation.method === method &&
            expectation.pathname === pathname,
        );
        if (index >= 0) {
          const [expectation] = this.expectedResponses.splice(index, 1);
          this.consoleAllowances.push({
            page,
            status,
            label: expectation?.label ?? `${method} ${pathname}`,
          });
        } else {
          this.runtimeErrors.push(`unexpected HTTP ${status}: ${method} ${pathname}`);
        }
      }
      if ((url.includes("/assets/") || /\.(?:css|js)(?:\?|$)/.test(url)) && status >= 400) {
        this.assetFailures.push(`${status} ${url}`);
      }
    });
    page.on("request", (request) => {
      if (!backendOrigin || !request.url().startsWith(backendOrigin)) return;
      const url = new URL(request.url());
      const sensitive =
        (url.pathname === "/rest/v1/listings" && request.method() !== "GET") ||
        url.pathname.endsWith("/rpc/register_sanitized_listing_photo") ||
        url.pathname.endsWith("/rpc/get_listing_photo_inventory") ||
        url.pathname.endsWith("/rpc/complete_and_publish_listing_submission") ||
        (url.pathname.startsWith("/storage/v1/object/listing_photos") &&
          !url.pathname.startsWith("/storage/v1/object/sign/listing_photos") &&
          request.method() !== "GET");
      if (sensitive) this.privilegedBrowserMutations.push(`${request.method()} ${url.pathname}`);
    });
  }

  assertClean(): void {
    assert(
      this.privilegedBrowserMutations.length === 0,
      `Browser performed privileged backend mutations: ${this.privilegedBrowserMutations.join(" | ")}`,
    );
    assert(
      this.expectedResponses.length === 0,
      `Expected negative HTTP responses did not occur: ${this.expectedResponses
        .map((item) => `${item.status} ${item.method} ${item.pathname} (${item.label})`)
        .join(" | ")}`,
    );
    assert(
      this.consoleAllowances.length === 0,
      `Expected negative-path console allowances were not consumed: ${this.consoleAllowances
        .map((item) => `${item.status} (${item.label})`)
        .join(" | ")}`,
    );
    assert(
      this.assetFailures.length === 0,
      `CSS/JS asset failures: ${this.assetFailures.join(" | ")}`,
    );
    assert(
      this.runtimeErrors.length === 0,
      `Browser runtime errors: ${this.runtimeErrors.join(" | ")}`,
    );
  }
}

const anonHeaders = () => ({
  apikey: anonKey,
  Authorization: `Bearer ${anonKey}`,
  "content-type": "application/json",
});
const serviceHeaders = () => ({
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  "content-type": "application/json",
});

export type ListingRow = {
  id: string;
  title: string;
  price_is_free: boolean;
  province: string;
  district: string;
  contact_e164: string;
  product_type: string | null;
  product_attributes_version: number | null;
  product_attributes: Record<string, unknown>;
  search_keywords: string[];
};

export async function anonListingRows(listingId: string): Promise<ListingRow[]> {
  requirePublicBackend();
  const url = new URL(`${backendOrigin}/rest/v1/listings`);
  url.searchParams.set("id", `eq.${listingId}`);
  url.searchParams.set(
    "select",
    "id,title,price_is_free,province,district,contact_e164,product_type,product_attributes_version,product_attributes,search_keywords",
  );
  const response = await fetch(url, { headers: anonHeaders() });
  assert(response.ok, `Anonymous listing probe failed: ${response.status}`);
  return (await response.json()) as ListingRow[];
}

export async function anonRowsByTitle(title: string): Promise<Array<{ id: string }>> {
  requirePublicBackend();
  const url = new URL(`${backendOrigin}/rest/v1/listings`);
  url.searchParams.set("title", `eq.${title}`);
  url.searchParams.set("select", "id");
  const response = await fetch(url, { headers: anonHeaders() });
  assert(response.ok, `Anonymous title probe failed: ${response.status}`);
  return (await response.json()) as Array<{ id: string }>;
}

export async function publicPhotoManifest(
  listingId: string,
): Promise<Array<{ object_path: string }>> {
  requirePublicBackend();
  const response = await fetch(`${backendOrigin}/rest/v1/rpc/get_public_listing_photos`, {
    method: "POST",
    headers: anonHeaders(),
    body: JSON.stringify({ p_listing_id: listingId }),
  });
  assert(response.ok, `Public photo manifest probe failed: ${response.status}`);
  return (await response.json()) as Array<{ object_path: string }>;
}

export async function privilegedPhotoInventory(
  listingId: string,
): Promise<Array<{ object_path: string }>> {
  requireServiceBackend();
  const response = await fetch(`${backendOrigin}/rest/v1/rpc/get_listing_photo_inventory`, {
    method: "POST",
    headers: serviceHeaders(),
    body: JSON.stringify({ p_listing_id: listingId }),
  });
  assert(response.ok, `Privileged photo inventory probe failed: ${response.status}`);
  return (await response.json()) as Array<{ object_path: string }>;
}

export async function assertAnonDirectWritesDenied(): Promise<void> {
  requirePublicBackend();
  const directInsert = await fetch(`${backendOrigin}/rest/v1/listings`, {
    method: "POST",
    headers: { ...anonHeaders(), Prefer: "return=minimal" },
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

export async function assertSignedObjectUnavailable(objectPath: string): Promise<void> {
  requirePublicBackend();
  const encoded = objectPath.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(
    `${backendOrigin}/storage/v1/object/sign/listing_photos/${encoded}`,
    {
      method: "POST",
      headers: anonHeaders(),
      body: JSON.stringify({ expiresIn: 60 }),
    },
  );
  assert(!response.ok, `Inactive/private photo unexpectedly remained signable: ${response.status}`);
}

export async function assertStorageObjectDeleted(objectPath: string): Promise<void> {
  requireServiceBackend();
  const encoded = objectPath.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(`${backendOrigin}/storage/v1/object/listing_photos/${encoded}`, {
    headers: serviceHeaders(),
  });
  assert(!response.ok, `Seller delete left Storage object: ${response.status}`);
}

export async function assertNoHorizontalOverflow(page: Page, route: string): Promise<void> {
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  assert(dimensions.document <= dimensions.viewport, `${route} has horizontal overflow`);
}

export async function assertResponsiveRoute(
  page: Page,
  url: string,
  route: string,
  heading: string,
): Promise<void> {
  for (const viewport of [
    { width: 360, height: 780 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1280, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(url, { waitUntil: "networkidle" });
    await page.getByRole("heading", { level: 1, name: heading, exact: true }).waitFor();
    await assertNoHorizontalOverflow(page, `${route} @ ${viewport.width}px`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
}

export async function submitListing(
  page: Page,
  monitor: HarnessMonitor,
  input: {
    title: string;
    phone: string;
    expectBootstrap: boolean;
    photoSeed: number;
    province: string;
    district: string;
    isFree: boolean;
    category?: "vehicle" | "electronics";
    productType?: string;
    productAttributes?: Record<string, string | number>;
    withCondition?: boolean;
    withDescription?: boolean;
  },
): Promise<{ listingId: string; recoveryCode: string | null }> {
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

  await page.getByLabel("Kategori", { exact: true }).selectOption(input.category ?? "vehicle");
  if (input.productType) {
    await page.getByLabel("Ürün tipi", { exact: true }).selectOption(input.productType);
    const attributes = input.productAttributes ?? {};
    const textFields: Record<string, string> = {
      make: "Marka",
      model: "Model",
      brand: "Marka",
    };
    const numberFields: Record<string, string> = { year: "Model yılı", km: "Kilometre" };
    const selectFields: Record<string, string> = {
      transmission: "Vites",
      fuel: "Yakıt",
      body_type: "Kasa tipi",
      storage_gb: "Depolama",
    };
    for (const [key, label] of Object.entries(textFields)) {
      const value = attributes[key];
      if (value !== undefined) await page.getByLabel(label, { exact: true }).fill(String(value));
    }
    for (const [key, label] of Object.entries(numberFields)) {
      const value = attributes[key];
      if (value !== undefined) await page.getByLabel(label, { exact: true }).fill(String(value));
    }
    for (const [key, label] of Object.entries(selectFields)) {
      const value = attributes[key];
      if (value !== undefined)
        await page.getByLabel(label, { exact: true }).selectOption(String(value));
    }
  }
  await page.getByLabel("Başlık", { exact: true }).fill(input.title);
  if (input.withCondition !== false) {
    await page.getByLabel("Durum", { exact: true }).selectOption("good");
  } else {
    assert(
      (await page.getByLabel("Durum", { exact: true }).inputValue()) === "",
      "Optional condition unexpectedly started with a value.",
    );
  }
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

  if (input.withDescription !== false) {
    await page
      .getByLabel("Açıklama", { exact: true })
      .fill("Sentetik ürün kabul testi açıklaması.");
  } else {
    assert(
      (await page.getByLabel("Açıklama", { exact: true }).inputValue()) === "",
      "Optional description unexpectedly started with content.",
    );
  }
  await page.getByLabel("İl", { exact: true }).selectOption(input.province);
  await page.getByLabel("İlçe", { exact: true }).selectOption(input.district);
  await page.getByRole("button", { name: /Devam/ }).click();

  await page.getByLabel("İlanda görünecek ad", { exact: true }).fill("Sentetik Satıcı");
  await page.getByLabel("Telefon numarası", { exact: true }).fill(input.phone);
  assert(
    (await page.getByText("İletişim tercihi", { exact: true }).count()) === 0,
    "Contact preference selector is still visible.",
  );
  assert(
    (await page.locator('input[type="checkbox"]').count()) === 0,
    "Obsolete declaration checkbox is still visible in publication step.",
  );
  assert(
    (await page
      .getByText("Telefon numaran ilanda herkese açık görünür.", { exact: true })
      .count()) === 1,
    "Public-phone disclosure must be visible exactly once.",
  );
  assert(
    (await page.getByText(/doğrulanmış telefon|telefonunu doğrula|doğrulama kodu/i).count()) === 0,
    "Ordinary-goods publication still exposes phone-verification claims.",
  );
  await page
    .getByText(/İlanı yayınlayarak/)
    .first()
    .waitFor();

  if (input.expectBootstrap) {
    monitor.expectUnauthorizedOnce(
      page,
      "POST",
      "/ilan-ver",
      "initial submission requires seller session",
    );
  }
  await page.getByRole("button", { name: "İlanı yayınla" }).click();

  let recoveryCode: string | null = null;
  if (input.expectBootstrap) {
    const recovery = page.getByTestId("seller-recovery-code");
    await recovery.waitFor();
    recoveryCode = (await recovery.textContent())?.trim() ?? "";
    assert(
      /^ABR1\.[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{32}$/.test(recoveryCode),
      "Recovery code format is invalid.",
    );

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
      }
    })();
    await page.getByRole("button", { name: "Kodu kaydettim, ilanı yayınla" }).click();
    await page.getByRole("heading", { level: 1, name: "İlanın yayınlandı" }).waitFor();
    stopProbe = true;
    await probe;
    assert(!transientFailure, transientFailure);
  } else {
    assert(
      (await page.getByTestId("seller-recovery-code").count()) === 0,
      "Existing seller session unexpectedly created another recovery credential.",
    );
    await page.getByRole("heading", { level: 1, name: "İlanın yayınlandı" }).waitFor();
  }

  const success = page.getByTestId("listing-published-success");
  const listingId = (await success.getAttribute("data-listing-id")) ?? "";
  assert(/^[0-9a-f-]{36}$/i.test(listingId), "Published listing id data attribute is missing.");
  await success.getByRole("link", { name: "İlanı görüntüle", exact: true }).waitFor();
  await success.getByRole("link", { name: "İlanlarım", exact: true }).waitFor();
  return { listingId, recoveryCode };
}

export async function openOwnerListings(page: Page): Promise<void> {
  await page.goto(`${publicBaseUrl}/ilanlarim`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { level: 1, name: "İlanlarım" }).waitFor();
}

export async function waitForSellerResolvedState(
  page: Page,
  expected: "recovery" | "inventory",
  listingId?: string,
): Promise<void> {
  if (expected === "recovery") {
    await page.getByLabel("İlanlarım kurtarma kodu", { exact: true }).waitFor({ state: "visible" });
    return;
  }
  assert(listingId, "Inventory resolved-state wait requires listingId.");
  await page.getByTestId(`seller-listing-${listingId}`).waitFor({ state: "visible" });
}

export async function recoverOwnerListings(page: Page, recoveryCode: string): Promise<string> {
  await page.getByLabel("İlanlarım kurtarma kodu", { exact: true }).fill(recoveryCode);
  await page.getByRole("button", { name: "Kurtarmayı hazırla" }).click();
  const candidate = page.getByTestId("candidate-seller-recovery-code");
  await candidate.waitFor();
  const candidateCode = (await candidate.textContent())?.trim() ?? "";
  assert(
    /^ABR1\.[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{32}$/.test(candidateCode),
    "Pre-commit recovery candidate format is invalid.",
  );
  assert(
    (await page.getByTestId("rotated-seller-recovery-code").count()) === 0,
    "Recovery rotated before the pre-generated candidate was acknowledged.",
  );
  await page.getByRole("button", { name: "Yeni kodu kaydettim, erişimi kurtar" }).click();
  const rotated = page.getByTestId("rotated-seller-recovery-code");
  await rotated.waitFor();
  const nextCode = (await rotated.textContent())?.trim() ?? "";
  assert(
    nextCode === candidateCode,
    "Server recovery did not preserve the pre-generated candidate.",
  );
  return nextCode;
}

export async function restoreCookie(context: BrowserContext, cookie: Cookie): Promise<void> {
  await context.addCookies([
    {
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite,
    },
  ]);
}

export function expectHref(actual: string | null, expected: string): void {
  assert(actual === expected, `Expected href ${expected}; received ${actual}`);
}