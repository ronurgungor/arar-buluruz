import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const publicBaseUrl = process.env.PUBLIC_BASE_URL ?? "http://127.0.0.1:4173";
const resultsDir = path.resolve("test-results/stage1-self-service");
fs.mkdirSync(resultsDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();

try {
  await page.goto(`${publicBaseUrl}/ara?q=b150`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /^Filtreler/ }).click();
  await page.getByLabel("Filtre il", { exact: true }).selectOption("Tekirdağ");
  await page.getByLabel("Filtre ilçe", { exact: true }).selectOption("Çorlu");
  await page.getByLabel("Minimum fiyat", { exact: true }).fill("0");
  await page.getByLabel("Maksimum fiyat", { exact: true }).fill("5000");
  await page.getByLabel("Filtre kategori", { exact: true }).selectOption("vehicle");
  await page.getByRole("button", { name: "Otomobil", exact: true }).click();
  await page.getByLabel("Model yılı minimum", { exact: true }).fill("2010");
  await page.getByLabel("Model yılı maksimum", { exact: true }).fill("2020");

  const diagnostic = await page.evaluate(() => ({
    url: window.location.href,
    dialogs: Array.from(document.querySelectorAll('[role="dialog"]')).map((element) => ({
      state: element.getAttribute("data-state"),
      ariaHidden: element.getAttribute("aria-hidden"),
      text: (element.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 1500),
    })),
    controls: Array.from(document.querySelectorAll<HTMLElement>("[aria-label]")).map((element) => ({
      tag: element.tagName,
      label: element.getAttribute("aria-label"),
      value: element instanceof HTMLInputElement || element instanceof HTMLSelectElement ? element.value : null,
      disabled:
        element instanceof HTMLInputElement || element instanceof HTMLSelectElement
          ? element.disabled
          : null,
    })),
    automobileButtons: Array.from(document.querySelectorAll("button")).flatMap((element) =>
      element.textContent?.trim() === "Otomobil"
        ? [{ pressed: element.getAttribute("aria-pressed"), state: element.getAttribute("data-state") }]
        : [],
    ),
  }));

  console.log(`PHASE2_FILTER_DIAGNOSTIC ${JSON.stringify(diagnostic)}`);
  await page.screenshot({
    path: path.join(resultsDir, "phase2-filter-drawer-after-year.png"),
    fullPage: true,
  });

  const kmMinimum = page.getByLabel("Kilometre minimum", { exact: true });
  const kmMaximum = page.getByLabel("Kilometre maksimum", { exact: true });
  console.log(
    `PHASE2_FILTER_COUNTS kmMinimum=${await kmMinimum.count()} kmMaximum=${await kmMaximum.count()} automobilePressed=${await page.getByRole("button", { name: "Otomobil", exact: true }).getAttribute("aria-pressed")}`,
  );
  await kmMaximum.fill("120000");
  console.log(`PHASE2_FILTER_KM_VALUE ${await kmMaximum.inputValue()}`);
} finally {
  await context.close();
  await browser.close();
}
