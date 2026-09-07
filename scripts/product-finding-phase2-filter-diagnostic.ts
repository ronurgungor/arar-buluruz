import fs from "node:fs";
import path from "node:path";
import { deflateSync } from "node:zlib";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

const publicBaseUrl = process.env.PUBLIC_BASE_URL ?? "http://127.0.0.1:4173";
const backendOrigin = process.env.BACKEND_ORIGIN;
const anonKey = process.env.BACKEND_ANON_KEY;
if (!backendOrigin || !anonKey) {
  throw new Error("BACKEND_ORIGIN and BACKEND_ANON_KEY are required.");
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

function observe(page: Page, errors: string[]): void {
  page.on("pageerror", (error) => errors.push(`pageerror:${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console:${message.text()}`);
  });
}

async function createPage(context: BrowserContext, errors: string[]): Promise<Page> {
  const page = await context.newPage();
  observe(page, errors);
  return page;
}

async function submitAutomobile(page: Page, seed: number): Promise<{ id: string; title: string }> {
  const title = `Mercedes B 150 phase2 delta ${seed}-${Date.now()}`;
  await page.goto(`${publicBaseUrl}/ilan-ver`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { level: 1, name: "İlan Ver" }).waitFor();
  await page.getByTestId("stage1-photo-input").setInputFiles({
    name: `phase2-delta-${seed}.png`,
    mimeType: "image/png",
    buffer: Buffer.from(makeSyntheticPng(seed)),
  });
  await page.getByAltText("Seçilen fotoğraf 1", { exact: true }).waitFor();
  await page.getByRole("button", { name: /Devam/ }).click();

  await page.getByLabel("Kategori", { exact: true }).selectOption("vehicle");
  await page.getByLabel("Ürün tipi", { exact: true }).selectOption("automobile");
  await page.getByLabel("Marka", { exact: true }).fill("Mercedes");
  await page.getByLabel("Model", { exact: true }).fill("B 150");
  await page.getByLabel("Model yılı", { exact: true }).fill("2016");
  await page.getByLabel("Kilometre", { exact: true }).fill("118000");
  await page.getByLabel("Vites", { exact: true }).selectOption("automatic");
  await page.getByLabel("Yakıt", { exact: true }).selectOption("gasoline");
  await page.getByLabel("Kasa tipi", { exact: true }).selectOption("hatchback");
  await page.getByLabel("Başlık", { exact: true }).fill(title);
  await page.getByLabel("Ücretsiz veriyorum", { exact: true }).check();
  await page.getByRole("button", { name: /Devam/ }).click();

  await page.getByLabel("İl", { exact: true }).selectOption("Tekirdağ");
  await page.getByLabel("İlçe", { exact: true }).selectOption("Çorlu");
  await page.getByRole("button", { name: /Devam/ }).click();
  await page.getByLabel("İlanda görünecek ad", { exact: true }).fill("Phase 2 Satıcı");
  await page.getByLabel("Telefon numarası", { exact: true }).fill("+12025550188");
  await page.getByRole("button", { name: "İlanı yayınla" }).click();
  await page.getByTestId("seller-recovery-code").waitFor();
  await page.getByRole("button", { name: "Kodu kaydettim, ilanı yayınla" }).click();
  await page.getByRole("heading", { level: 1, name: "İlanın yayınlandı" }).waitFor();

  const success = page.getByTestId("listing-published-success");
  const id = (await success.getAttribute("data-listing-id")) ?? "";
  assert(/^[0-9a-f-]{36}$/i.test(id), "Seller journey did not produce a listing id.");

  const url = new URL(`${backendOrigin}/rest/v1/listings`);
  url.searchParams.set("id", `eq.${id}`);
  url.searchParams.set("select", "id,product_type,product_attributes,search_keywords");
  const response = await fetch(url, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
  });
  assert(response.ok, `Persisted listing lookup failed: ${response.status}`);
  const rows = (await response.json()) as Array<{
    id: string;
    product_type: string | null;
    product_attributes: Record<string, unknown>;
    search_keywords: string[];
  }>;
  assert(rows.length === 1, "Persisted seller fixture was not public.");
  assert(rows[0]?.product_type === "automobile", "Persisted product type was not Automobile.");
  assert(rows[0]?.product_attributes.km === 118000, "Persisted km did not equal 118000.");
  assert(rows[0]?.search_keywords.includes("B 150"), "Persisted search keywords omitted B 150.");
  return { id, title };
}

async function recordState(page: Page, label: string, errors: string[]): Promise<void> {
  const automobile = page.getByRole("button", { name: "Otomobil", exact: true });
  const kmMax = page.getByLabel("Kilometre maksimum", { exact: true });
  console.log(
    `PHASE2_SELLER_DELTA_STATE ${JSON.stringify({
      label,
      url: page.url(),
      drawerDialogs: await page.getByRole("dialog").count(),
      automobilePressed:
        (await automobile.count()) > 0
          ? await automobile.first().getAttribute("aria-pressed")
          : null,
      yearMinCount: await page.getByLabel("Model yılı minimum", { exact: true }).count(),
      yearMaxCount: await page.getByLabel("Model yılı maksimum", { exact: true }).count(),
      kmMinCount: await page.getByLabel("Kilometre minimum", { exact: true }).count(),
      kmMaxCount: await kmMax.count(),
      kmMaxVisible: (await kmMax.count()) > 0 ? await kmMax.first().isVisible() : false,
      kmMaxEnabled: (await kmMax.count()) > 0 ? await kmMax.first().isEnabled() : false,
      errors,
    })}`,
  );
}

async function exerciseKmFilter(page: Page, label: string, errors: string[]): Promise<boolean> {
  try {
    await page.getByRole("button", { name: /^Filtreler/ }).click();
    await page.getByLabel("Filtre il", { exact: true }).selectOption("Tekirdağ");
    await page.getByLabel("Filtre ilçe", { exact: true }).selectOption("Çorlu");
    await page.getByLabel("Minimum fiyat", { exact: true }).fill("0");
    await page.getByLabel("Maksimum fiyat", { exact: true }).fill("5000");
    await page.getByLabel("Filtre kategori", { exact: true }).selectOption("vehicle");
    await page.getByRole("button", { name: "Otomobil", exact: true }).click();
    await page.getByLabel("Model yılı minimum", { exact: true }).fill("2010");
    await page.getByLabel("Model yılı maksimum", { exact: true }).fill("2020");
    await recordState(page, `${label}-before-km`, errors);
    await page.screenshot({
      path: path.join(resultsDir, `${label}-before-km.png`),
      fullPage: true,
    });
    const kmMax = page.getByLabel("Kilometre maksimum", { exact: true });
    await kmMax.fill("120000", { timeout: 5000 });
    return (await kmMax.inputValue()) === "120000";
  } catch (error) {
    await recordState(page, `${label}-failure`, errors);
    console.log(`PHASE2_SELLER_DELTA_THROWN ${label} ${String(error)}`);
    return false;
  }
}

async function runFreshBuyerInSellerBrowser(): Promise<boolean> {
  const browser = await chromium.launch({ headless: true });
  const errors: string[] = [];
  try {
    const ownerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const ownerPage = await createPage(ownerContext, errors);
    await submitAutomobile(ownerPage, 51);

    const buyerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const buyerPage = await createPage(buyerContext, errors);
    await buyerPage.goto(`${publicBaseUrl}/ara?q=b150`, { waitUntil: "networkidle" });
    const passed = await exerciseKmFilter(buyerPage, "seller-then-fresh-buyer", errors);
    console.log(
      `PHASE2_SELLER_DELTA_RESULT ${JSON.stringify({ test: "seller-then-fresh-buyer", passed, errors })}`,
    );
    return passed;
  } finally {
    await browser.close();
  }
}

async function runSameUserPath(): Promise<boolean> {
  const browser = await chromium.launch({ headless: true });
  const errors: string[] = [];
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await createPage(context, errors);
    await submitAutomobile(page, 52);
    await page.getByRole("link", { name: "Arar Buluruz ana sayfa", exact: true }).click();
    await page.waitForURL(`${publicBaseUrl}/`);
    await page.getByLabel("Ne arıyorsun?", { exact: true }).fill("b150");
    await page.getByRole("button", { name: "Ara", exact: true }).click();
    await page.waitForURL(/\/ara/);
    const passed = await exerciseKmFilter(page, "same-user-seller-search", errors);
    console.log(
      `PHASE2_SELLER_DELTA_RESULT ${JSON.stringify({ test: "same-user-seller-search", passed, errors })}`,
    );
    return passed;
  } finally {
    await browser.close();
  }
}

async function runSellerCompatibilityBuyer(): Promise<boolean> {
  const browser = await chromium.launch({ headless: true });
  const errors: string[] = [];
  try {
    const ownerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const ownerPage = await createPage(ownerContext, errors);
    const fixture = await submitAutomobile(ownerPage, 53);

    const compatibilityContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const compatibilityPage = await createPage(compatibilityContext, errors);
    for (const query of ["b150", "b 150"]) {
      await compatibilityPage.goto(`${publicBaseUrl}/ara?q=${encodeURIComponent(query)}`, {
        waitUntil: "networkidle",
      });
      await compatibilityPage
        .getByRole("link", { name: new RegExp(fixture.title) })
        .first()
        .waitFor();
    }
    await compatibilityContext.close();

    const buyerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const buyerPage = await createPage(buyerContext, errors);
    await buyerPage.goto(`${publicBaseUrl}/ara?q=b150`, { waitUntil: "networkidle" });
    const passed = await exerciseKmFilter(buyerPage, "seller-compat-then-buyer", errors);
    console.log(
      `PHASE2_SELLER_DELTA_RESULT ${JSON.stringify({ test: "seller-compat-then-buyer", passed, errors })}`,
    );
    return passed;
  } finally {
    await browser.close();
  }
}

const sellerThenFreshBuyer = await runFreshBuyerInSellerBrowser();
const sameUserSellerSearch = await runSameUserPath();
assert(
  sameUserSellerSearch,
  "Actual same-user seller-to-search path failed; this is a runtime defect.",
);

let sellerCompatibilityBuyer: boolean | null = null;
if (sellerThenFreshBuyer) {
  sellerCompatibilityBuyer = await runSellerCompatibilityBuyer();
}

const classification = !sellerThenFreshBuyer
  ? "PROCESS_LOCAL_CROSS_CONTEXT_INTERFERENCE"
  : sellerCompatibilityBuyer === false
    ? "PROCESS_LOCAL_MULTI_ACTOR_INTERFERENCE"
    : "TARGETED_DELTAS_PASS";

console.log(
  `PHASE2_SELLER_DELTA_SUMMARY ${JSON.stringify({
    sellerThenFreshBuyer,
    sameUserSellerSearch,
    sellerCompatibilityBuyer,
    classification,
  })}`,
);
