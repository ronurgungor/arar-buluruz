import path from "node:path";
import { chromium } from "playwright";
import {
  HarnessMonitor,
  anonListingRows,
  assert,
  assertAnonDirectWritesDenied,
  assertResponsiveRoute,
  ownerPhone,
  publicBaseUrl,
  publicPhotoManifest,
  resultsDir,
  submitListing,
  writeHandoff,
} from "./stage1-self-service-browser-e2e-shared";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
const monitor = new HarnessMonitor();
monitor.observePage(page);

try {
  await page.goto(publicBaseUrl, { waitUntil: "networkidle" });
  assert((await page.locator("[data-ad-placement]").count()) === 0, "Disabled home ad slot left DOM.");
  await assertResponsiveRoute(page, `${publicBaseUrl}/ilan-ver`, "/ilan-ver", "İlan Ver");
  await assertAnonDirectWritesDenied();

  const title = `Mercedes B 150 phase2 ${Date.now()}`;
  const submission = await submitListing(page, monitor, {
    title,
    phone: ownerPhone,
    expectBootstrap: true,
    photoSeed: 17,
    province: "Tekirdağ",
    district: "Çorlu",
    isFree: true,
    withCondition: false,
    withDescription: false,
    category: "vehicle",
    productType: "automobile",
    productAttributes: {
      make: "Mercedes",
      model: "B 150",
      year: 2016,
      km: 118000,
      transmission: "automatic",
      fuel: "gasoline",
      body_type: "hatchback",
    },
  });
  assert(submission.recoveryCode, "Initial seller recovery code was not captured.");

  const rows = await anonListingRows(submission.listingId);
  const row = rows[0];
  assert(rows.length === 1 && row?.price_is_free === true, "Auto-published listing was not immediately public with Free state.");
  assert(
    row?.product_type === "automobile" &&
      row.product_attributes_version === 1 &&
      row.product_attributes.make === "Mercedes" &&
      row.product_attributes.model === "B 150" &&
      row.product_attributes.year === 2016 &&
      row.product_attributes.km === 118000 &&
      row.product_attributes.transmission === "automatic",
    `Structured seller fields were not persisted: ${JSON.stringify(rows)}`,
  );
  assert(
    row.search_keywords.includes("Mercedes") && row.search_keywords.includes("B 150"),
    "System search keywords were not derived from persisted structured fields.",
  );
  const manifest = await publicPhotoManifest(submission.listingId);
  assert(manifest.length === 1, "Auto-published listing did not expose one trusted photo.");
  assert(
    manifest[0]?.object_path.startsWith(`${submission.listingId}/`),
    "Public trusted-photo metadata was not listing-owned.",
  );

  for (const query of ["b150", "b 150"]) {
    await page.goto(`${publicBaseUrl}/ara?q=${encodeURIComponent(query)}`, { waitUntil: "networkidle" });
    await page.getByRole("link", { name: new RegExp(title) }).first().waitFor();
    await page.getByText("Ücretsiz", { exact: true }).first().waitFor();
  }

  const sessionCookie = (await context.cookies()).find((cookie) => cookie.name === "arar_seller_session");
  assert(sessionCookie, "Opaque seller session cookie was not stored by the browser.");
  assert(sessionCookie.httpOnly, "Seller session cookie is not HttpOnly.");
  assert(sessionCookie.secure, "Seller session cookie is not Secure.");

  writeHandoff(
    { listingId: submission.listingId, title },
    { recoveryCode: submission.recoveryCode, sessionCookie },
  );
  await page.screenshot({
    path: path.join(resultsDir, "phase2-seller-create.png"),
    fullPage: true,
  });
  monitor.assertClean();
  console.log("Phase 2 seller creation process passed.");
} finally {
  await context.close();
  await browser.close();
}
