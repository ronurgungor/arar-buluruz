import path from "node:path";
import { chromium, type Page } from "playwright";
import {
  HarnessMonitor,
  anonListingRows,
  assert,
  assertResponsiveRoute,
  assertSignedObjectUnavailable,
  assertStorageObjectDeleted,
  founderBaseUrl,
  openOwnerListings,
  otherPhone,
  ownerPhone,
  privilegedPhotoInventory,
  publicBaseUrl,
  publicPhotoManifest,
  readPrivateHandoff,
  readPublicHandoff,
  recoverOwnerListings,
  requireServiceBackend,
  resultsDir,
  restoreCookie,
  submitListing,
  waitForSellerResolvedState,
} from "./stage1-self-service-browser-e2e-shared";

requireServiceBackend();
const { listingId, title } = readPublicHandoff();
const privateState = readPrivateHandoff();
let ownerRecoveryCode = privateState.recoveryCode;

const browser = await chromium.launch({ headless: true });
const ownerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
const otherContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
const staleContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
const ownerPage = await ownerContext.newPage();
const otherPage = await otherContext.newPage();
const stalePage = await staleContext.newPage();
const founderPage = await ownerContext.newPage();
const monitor = new HarnessMonitor();
for (const page of [ownerPage, otherPage, stalePage, founderPage]) monitor.observePage(page);

async function assertDetailUnavailable(page: Page, targetId: string, targetTitle: string): Promise<void> {
  monitor.expectHttpFailureOnce(page, 404, "GET", `/ilan/${targetId}`, "inactive listing detail stays hidden");
  await page.goto(`${publicBaseUrl}/ilan/${targetId}`, { waitUntil: "networkidle" });
  assert((await page.getByRole("heading", { level: 1, name: targetTitle }).count()) === 0, "Inactive listing detail remained publicly renderable.");
}

try {
  await restoreCookie(ownerContext, privateState.sessionCookie);
  await openOwnerListings(ownerPage);
  await waitForSellerResolvedState(ownerPage, "inventory", listingId);
  await assertResponsiveRoute(ownerPage, `${publicBaseUrl}/ilanlarim`, "/ilanlarim", "İlanlarım");
  await waitForSellerResolvedState(ownerPage, "inventory", listingId);

  const originalSessionCookie = (await ownerContext.cookies()).find((cookie) => cookie.name === "arar_seller_session");
  assert(originalSessionCookie, "Restored seller session cookie was not stored by the browser.");
  assert(originalSessionCookie.httpOnly, "Seller session cookie is not HttpOnly.");
  assert(originalSessionCookie.secure, "Seller session cookie is not Secure.");
  const originalManifest = await publicPhotoManifest(listingId);
  assert(originalManifest.length === 1, "Seller-management fixture lost its trusted photo.");
  const originalObjectPath = originalManifest[0].object_path;

  await ownerContext.clearCookies();
  monitor.expectUnauthorizedOnce(ownerPage, "POST", "/ilanlarim", "cookie loss requires recovery");
  await openOwnerListings(ownerPage);
  await waitForSellerResolvedState(ownerPage, "recovery");
  assert(
    (await ownerPage.evaluate(() => Object.keys(window.localStorage).some((key) => key.includes("seller-phone")))) === false,
    "Seller phone remains coupled to localStorage.",
  );
  ownerRecoveryCode = await recoverOwnerListings(ownerPage, ownerRecoveryCode);
  await waitForSellerResolvedState(ownerPage, "inventory", listingId);

  await restoreCookie(staleContext, originalSessionCookie);
  monitor.expectUnauthorizedOnce(stalePage, "POST", "/ilanlarim", "recovery revokes stale session");
  await openOwnerListings(stalePage);
  await waitForSellerResolvedState(stalePage, "recovery");

  monitor.expectUnauthorizedOnce(ownerPage, "POST", "/ilanlarim", "recovery replay is rejected");
  const replay = await ownerPage.evaluate(async (code) => {
    const randomPart = (byteLength: number) => {
      const bytes = new Uint8Array(byteLength);
      crypto.getRandomValues(bytes);
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
    };
    const form = new FormData();
    form.set("action", "seller_recover");
    form.set("recoveryCode", code);
    form.set("replacementRecoveryCode", `ABR1.${randomPart(12)}.${randomPart(24)}`);
    const response = await fetch("/ilanlarim", { method: "POST", body: form, credentials: "same-origin" });
    return { status: response.status, body: await response.json() };
  }, privateState.recoveryCode);
  assert(
    replay.status === 401 &&
      typeof replay.body === "object" &&
      replay.body !== null &&
      (replay.body as { code?: string }).code === "RECOVERY_FAILED",
    `Consumed recovery code replay did not fail: ${JSON.stringify(replay)}`,
  );

  await ownerPage.getByRole("button", { name: "Bu cihazdan çıkış yap" }).click();
  await ownerPage.getByText("Bu cihazdaki satıcı oturumu kapatıldı.", { exact: true }).waitFor();
  await waitForSellerResolvedState(ownerPage, "recovery");
  monitor.expectUnauthorizedOnce(ownerPage, "POST", "/ilanlarim", "logout revokes current session");
  const afterLogout = await ownerPage.evaluate(async () => {
    const form = new FormData();
    form.set("action", "seller_list");
    const response = await fetch("/ilanlarim", { method: "POST", body: form, credentials: "same-origin" });
    return response.status;
  });
  assert(afterLogout === 401, `Revoked logout session unexpectedly authorized: ${afterLogout}`);

  ownerRecoveryCode = await recoverOwnerListings(ownerPage, ownerRecoveryCode);
  await waitForSellerResolvedState(ownerPage, "inventory", listingId);
  const ownerCard = ownerPage.getByTestId(`seller-listing-${listingId}`);
  await ownerCard.getByText("Yayında", { exact: true }).waitFor();

  const otherTitle = `Other seller isolation ${Date.now()}`;
  const otherSubmission = await submitListing(otherPage, monitor, {
    title: otherTitle,
    phone: otherPhone,
    expectBootstrap: true,
    photoSeed: 23,
    province: "İzmir",
    district: "Konak",
    isFree: false,
    category: "electronics",
    productType: "phone",
    productAttributes: { brand: "Apple", model: "iPhone 13", storage_gb: 128 },
    withCondition: true,
    withDescription: true,
  });
  await openOwnerListings(otherPage);
  await waitForSellerResolvedState(otherPage, "inventory", otherSubmission.listingId);
  assert((await otherPage.getByText(title, { exact: true }).count()) === 0, "Seller B inferred Seller A's listing.");

  monitor.expectHttpFailureOnce(otherPage, 403, "POST", "/ilanlarim", "cross-seller_id mutation is denied");
  const denied = await otherPage.evaluate(async (targetListingId) => {
    const form = new FormData();
    form.set("action", "seller_unpublish");
    form.set("listingId", targetListingId);
    const response = await fetch("/ilanlarim", { method: "POST", body: form, credentials: "same-origin" });
    return { status: response.status, body: await response.json() };
  }, listingId);
  assert(
    denied.status === 403 &&
      typeof denied.body === "object" &&
      denied.body !== null &&
      (denied.body as { code?: string }).code === "NOT_AUTHORIZED",
    `Cross-seller mutation did not fail generically: ${JSON.stringify(denied)}`,
  );

  await ownerCard.getByRole("button", { name: "Düzenle" }).click();
  await ownerPage.getByLabel("İlanlarım başlık").fill(`${title} güncel`);
  await ownerPage.getByLabel("İlanlarım kategori", { exact: true }).selectOption("electronics");
  assert((await ownerPage.getByLabel("Marka", { exact: true }).count()) === 0, "Category transition retained incompatible automobile attributes.");
  await ownerPage.getByLabel("Ürün tipi", { exact: true }).selectOption("phone");
  await ownerPage.getByLabel("Marka", { exact: true }).fill("Samsung");
  await ownerPage.getByLabel("Model", { exact: true }).fill("Galaxy S21");
  await ownerPage.getByLabel("Depolama", { exact: true }).selectOption("256");
  await ownerPage.getByLabel("Ücretsiz veriyorum").uncheck();
  await ownerPage.getByLabel("İlanlarım fiyat").fill("4321");
  await ownerPage.getByLabel("İlanlarım telefon", { exact: true }).fill(otherPhone);
  await ownerPage.getByLabel("İlanlarım il", { exact: true }).selectOption("İstanbul");
  await ownerPage.getByLabel("İlanlarım ilçe", { exact: true }).selectOption("Kadıköy");
  await ownerPage.getByRole("button", { name: "Değişiklikleri kaydet" }).click();
  await ownerPage.getByText("İlan güncellendi.", { exact: true }).waitFor();

  const updatedRows = await anonListingRows(listingId);
  const updated = updatedRows[0];
  assert(
    updatedRows.length === 1 &&
      updated?.price_is_free === false &&
      updated.province === "İstanbul" &&
      updated.district === "Kadıköy" &&
      updated.contact_e164 === otherPhone &&
      updated.product_type === "phone" &&
      updated.product_attributes_version === 1 &&
      updated.product_attributes.brand === "Samsung" &&
      updated.product_attributes.storage_gb === 256 &&
      updated.product_attributes.make === undefined &&
      updated.product_attributes.km === undefined &&
      updated.product_attributes.year === undefined,
    `Seller edit did not transition/persist structured fields: ${JSON.stringify(updatedRows)}`,
  );

  monitor.expectHttpFailureOnce(otherPage, 403, "POST", "/ilanlarim", "matching public phone does not transfer ownership");
  const samePhoneDenied = await otherPage.evaluate(async (targetListingId) => {
    const form = new FormData();
    form.set("action", "seller_unpublish");
    form.set("listingId", targetListingId);
    const response = await fetch("/ilanlarim", { method: "POST", body: form, credentials: "same-origin" });
    return response.status;
  }, listingId);
  assert(samePhoneDenied === 403, "Matching public phone transferred seller authorization.");

  const updatedCard = ownerPage.getByTestId(`seller-listing-${listingId}`);
  await updatedCard.getByRole("button", { name: "Yayından kaldır" }).click();
  await ownerPage.getByText("İlan yayından kaldırıldı.", { exact: true }).waitFor();
  assert((await anonListingRows(listingId)).length === 0, "Seller-unpublished listing remained public.");
  assert((await publicPhotoManifest(listingId)).length === 0, "Seller-unpublished photo remained public.");
  await assertSignedObjectUnavailable(originalObjectPath);
  await assertDetailUnavailable(ownerPage, listingId, `${title} güncel`);
  await openOwnerListings(ownerPage);
  await waitForSellerResolvedState(ownerPage, "inventory", listingId);

  await ownerPage.getByTestId(`seller-listing-${listingId}`).getByRole("button", { name: "Satıldı" }).click();
  await ownerPage.getByText("İlan satıldı olarak işaretlendi.", { exact: true }).waitFor();
  await ownerPage.getByTestId(`seller-listing-${listingId}`).getByRole("button", { name: "Sil" }).click();
  await ownerPage.getByRole("button", { name: "Evet, sil" }).click();
  await ownerPage.getByText("İlan silindi.", { exact: true }).waitFor();
  assert((await anonListingRows(listingId)).length === 0, "Seller-deleted listing row remained public.");
  assert((await privilegedPhotoInventory(listingId)).length === 0, "Seller delete left photo metadata.");
  await assertStorageObjectDeleted(originalObjectPath);

  const founderTitle = `Founder takedown phone ${Date.now()}`;
  const founderSubmission = await submitListing(ownerPage, monitor, {
    title: founderTitle,
    phone: ownerPhone,
    expectBootstrap: false,
    photoSeed: 29,
    province: "İstanbul",
    district: "Kadıköy",
    isFree: false,
    category: "electronics",
    productType: "phone",
    productAttributes: { brand: "Samsung", model: "Galaxy S22", storage_gb: 128 },
    withCondition: true,
    withDescription: true,
  });
  const founderInventory = await privilegedPhotoInventory(founderSubmission.listingId);
  assert(founderInventory.length === 1, "Founder-takedown fixture did not retain one trusted photo.");
  const founderObjectPath = founderInventory[0].object_path;
  assert((await anonListingRows(founderSubmission.listingId)).length === 1, "Founder fixture did not auto-publish.");

  await founderPage.goto(`${founderBaseUrl}/kurucu`, { waitUntil: "networkidle" });
  await founderPage.getByRole("heading", { level: 1, name: "İlan moderasyonu" }).waitFor();
  const founderCard = founderPage.getByTestId(`moderation-listing-${founderSubmission.listingId}`);
  await founderCard.waitFor();
  await founderCard.getByText("Yayında", { exact: true }).waitFor();
  assert((await founderCard.getByRole("button", { name: "Yayınla" }).count()) === 0, "Founder UI still exposed normal publication as a moderation step.");
  assert((await founderCard.getByRole("button", { name: "Reddet" }).count()) === 0, "Founder UI still exposed pending rejection as the normal product path.");
  await founderCard.getByRole("button", { name: "Yayından kaldır" }).click();
  await founderPage.getByText("İlan yayından kaldırıldı.", { exact: true }).waitFor();
  assert((await anonListingRows(founderSubmission.listingId)).length === 0, "Founder takedown remained public.");
  assert((await publicPhotoManifest(founderSubmission.listingId)).length === 0, "Founder takedown photo remained public.");
  await assertSignedObjectUnavailable(founderObjectPath);
  await assertDetailUnavailable(ownerPage, founderSubmission.listingId, founderTitle);

  await founderPage.goto(`${founderBaseUrl}/kurucu`, { waitUntil: "networkidle" });
  await founderPage.getByTestId(`moderation-listing-${founderSubmission.listingId}`).getByRole("button", { name: "Sil" }).click();
  await founderPage.getByText("İlan ve ilişkili fotoğraflar silindi.", { exact: true }).waitFor();

  await ownerPage.screenshot({ path: path.join(resultsDir, "phase2-seller-management.png"), fullPage: true });
  monitor.assertClean();
  console.log("Phase 2 seller management and security process passed.");
} finally {
  await ownerContext.close();
  await otherContext.close();
  await staleContext.close();
  await browser.close();
}
