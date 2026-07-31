import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "https://arar-buluruz.lovable.app";
const evidenceDir = path.resolve("test-results/public-v0");
fs.mkdirSync(evidenceDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

try {
  const response = await page.goto(
    `${baseUrl}/ara?q=trakt%C3%B6r&il=T%C3%BCm+T%C3%BCrkiye&sirala=yakin`,
    { waitUntil: "domcontentloaded", timeout: 30_000 },
  );
  await page.waitForTimeout(2_000);
  console.log(`Published search HTTP: ${response?.status() ?? "unknown"}`);
  console.log("Published search body:");
  console.log(await page.locator("body").innerText());
  await page.screenshot({
    path: path.join(evidenceDir, "public-search-probe.png"),
    fullPage: true,
  });
} finally {
  await context.close();
  await browser.close();
}
