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

async function assertChevronInset(page: Page, label: string) {
  const select = page.getByLabel(label);
  const metrics = await select.evaluate((element) => {
    const selectElement = element as HTMLSelectElement;
    const selectRect = selectElement.getBoundingClientRect();
    const icon = selectElement.parentElement?.querySelector("svg");
    const iconRect = icon?.getBoundingClientRect();
    const styles = getComputedStyle(selectElement);
    return {
      appearance: styles.appearance,
      paddingRight: Number.parseFloat(styles.paddingRight),
      iconRightInset: iconRect ? selectRect.right - iconRect.right : -1,
    };
  });

  assert(metrics.appearance === "none", `${label} still uses the browser-edge native chevron.`);
  assert(metrics.paddingRight >= 36, `${label} does not reserve enough text/icon spacing.`);
  assert(
    metrics.iconRightInset >= 10 && metrics.iconRightInset <= 14,
    `${label} chevron has an unexpected right inset: ${metrics.iconRightInset}px.`,
  );
}

async function assertNoHorizontalOverflow(page: Page, route: string) {
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  assert(
    dimensions.document <= dimensions.viewport,
    `${route} overflows horizontally: ${JSON.stringify(dimensions)}`,
  );
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
  await assertChevronInset(page, "Konum");
  await assertChevronInset(page, "İlçe");

  console.log("V0 search: exposing the full Istanbul catalog independent from mock supply");
  await gotoOk(page, searchUrl({ q: "", il: "İstanbul", ilce: ALL_DISTRICTS, sirala: "yeni" }));
  const istanbulOptions = await districtSelect.locator("option").allTextContents();
  assert(
    istanbulOptions.length === 40,
    `Istanbul district selector has ${istanbulOptions.length - 1} districts instead of 39.`,
  );
  for (const district of ["Adalar", "Kadıköy", "Şişli", "Zeytinburnu"]) {
    assert(istanbulOptions.includes(district), `Istanbul catalog is missing ${district}.`);
  }

  console.log("V0 search: validating at least three additional province catalogs");
  const provinceChecks: Array<[string, number, string]> = [
    ["Ankara", 25, "Keçiören"],
    ["İzmir", 30, "Konak"],
    ["Tekirdağ", 11, "Süleymanpaşa"],
  ];
  for (const [city, expectedCount, expectedDistrict] of provinceChecks) {
    await gotoOk(page, searchUrl({ q: "", il: city, ilce: ALL_DISTRICTS, sirala: "yeni" }));
    const options = await districtSelect.locator("option").allTextContents();
    assert(
      options.length === expectedCount + 1,
      `${city} district selector has ${options.length - 1} districts instead of ${expectedCount}.`,
    );
    assert(options.includes(expectedDistrict), `${city} catalog is missing ${expectedDistrict}.`);
  }

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

  console.log("V0 search: selecting a catalog district with zero mock supply");
  await gotoOk(page, searchUrl({ q: "", il: "İstanbul", ilce: "Adalar", sirala: "yeni" }));
  await page.getByText("Sonuç bulunamadı", { exact: true }).waitFor();
  assert(
    (await districtSelect.inputValue()) === "Adalar",
    "Zero-supply district was not preserved.",
  );
  assert(
    new URL(page.url()).searchParams.get("ilce") === "Adalar",
    "Zero-supply district disappeared from canonical URL state.",
  );

  await districtSelect.selectOption(ALL_DISTRICTS);
  await page.waitForURL((url) => url.searchParams.get("ilce") === ALL_DISTRICTS);
  await page.getByText("2+1 kiralık daire, asansörlü", { exact: true }).waitFor();

  console.log("V0 search: resetting district when province changes");
  await districtSelect.selectOption("Kadıköy");
  await page.waitForURL((url) => url.searchParams.get("ilce") === "Kadıköy");
  await citySelect.selectOption("Konya");
  await page.waitForURL((url) => {
    return url.searchParams.get("il") === "Konya" && url.searchParams.get("ilce") === ALL_DISTRICTS;
  });
  assert(
    (await districtSelect.inputValue()) === ALL_DISTRICTS,
    "Changing province did not reset the district selection.",
  );
  await assertNoHorizontalOverflow(page, "/ara desktop");
} finally {
  await context.close();
}

console.log("V0 search: validating 390x844 location controls");
const mobileContext = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
const mobilePage = await mobileContext.newPage();
mobilePage.setDefaultTimeout(15_000);
mobilePage.setDefaultNavigationTimeout(15_000);

try {
  await gotoOk(
    mobilePage,
    searchUrl({ q: "", il: "İstanbul", ilce: ALL_DISTRICTS, sirala: "yeni" }),
  );
  await mobilePage.getByLabel("İlçe").waitFor();
  await assertChevronInset(mobilePage, "Konum");
  await assertChevronInset(mobilePage, "İlçe");
  await assertNoHorizontalOverflow(mobilePage, "/ara mobile location controls");
} finally {
  await mobileContext.close();
  await browser.close();
}

console.log("V0 search, location catalog and URL browser validation passed.");
