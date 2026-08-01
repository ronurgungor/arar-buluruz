import { chromium, type Page } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:4174";
const ALL_CITIES = "Tüm Türkiye";
const ALL_DISTRICTS = "Tüm ilçeler";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function searchUrl(search: Record<string, string>) {
  return `${baseUrl}/ara?${new URLSearchParams(search).toString()}`;
}

async function gotoOk(page: Page, url: string) {
  const response = await page.goto(url, { waitUntil: "domcontentloaded" });
  assert(response?.ok() === true, `${url} returned HTTP ${response?.status() ?? "unknown"}.`);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();
page.setDefaultTimeout(15_000);
page.setDefaultNavigationTimeout(15_000);

try {
  console.log("V0 search: validating accentless Turkish search");
  await gotoOk(
    page,
    searchUrl({ q: "traktor", il: ALL_CITIES, ilce: ALL_DISTRICTS, sirala: "yeni" }),
  );
  await page.getByText("Sahibinden temiz bahçe traktörü", { exact: true }).waitFor();
  await page.getByText("Traktör römorku, 5 ton", { exact: true }).waitFor();

  console.log("V0 search: rejecting an inside-word substring match");
  await gotoOk(page, searchUrl({ q: "oto", il: ALL_CITIES, ilce: ALL_DISTRICTS, sirala: "yeni" }));
  await page.getByText("2016 model sedan otomobil, düşük km", { exact: true }).waitFor();
  assert(
    (await page.getByText("Su motoru, 1.5 HP, garantili", { exact: true }).count()) === 0,
    'The query "oto" matched inside the word "motoru".',
  );

  console.log("V0 search: canonicalizing invalid location URL state");
  await gotoOk(page, searchUrl({ q: "", il: "Atlantis", ilce: "Nowhere", sirala: "yeni" }));
  await page.waitForURL((url) => {
    return (
      url.searchParams.get("il") === ALL_CITIES && url.searchParams.get("ilce") === ALL_DISTRICTS
    );
  });
  const citySelect = page.getByLabel("Konum");
  const districtSelect = page.getByLabel("İlçe");
  assert((await citySelect.inputValue()) === ALL_CITIES, "Invalid city was not clamped.");
  assert(
    (await districtSelect.inputValue()) === ALL_DISTRICTS,
    "Invalid district was not clamped.",
  );
  assert(await districtSelect.isDisabled(), "District remained enabled after city clamp.");

  console.log("V0 search: canonicalizing a city-incompatible district");
  await gotoOk(page, searchUrl({ q: "", il: "Konya", ilce: "Karşıyaka", sirala: "yeni" }));
  await page.waitForURL((url) => {
    return url.searchParams.get("il") === "Konya" && url.searchParams.get("ilce") === ALL_DISTRICTS;
  });
  assert((await citySelect.inputValue()) === "Konya", "Valid city was not preserved.");
  assert(
    (await districtSelect.inputValue()) === ALL_DISTRICTS,
    "District from another city was not clamped.",
  );

  console.log("V0 search: preserving a valid city and district URL state");
  await gotoOk(page, searchUrl({ q: "", il: "Konya", ilce: "Çumra", sirala: "yeni" }));
  await page.getByText("Sahibinden temiz bahçe traktörü", { exact: true }).waitFor();
  assert((await citySelect.inputValue()) === "Konya", "Valid city changed unexpectedly.");
  assert((await districtSelect.inputValue()) === "Çumra", "Valid district changed unexpectedly.");
} finally {
  await context.close();
  await browser.close();
}

console.log("V0 search and URL browser validation passed.");
