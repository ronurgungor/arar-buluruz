import { chromium } from "playwright";

const baseUrl = process.env.PUBLIC_BASE_URL ?? "http://127.0.0.1:4173";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function newRecoveryCode(): string {
  const part = (length: number) => {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
  };
  return `ABR1.${part(12)}.${part(24)}`;
}

async function postRecovery(oldCode: string, replacementCode: string) {
  const form = new FormData();
  form.set("action", "seller_recover");
  form.set("recoveryCode", oldCode);
  form.set("replacementRecoveryCode", replacementCode);
  return fetch(`${baseUrl}/ilanlarim`, {
    method: "POST",
    headers: { origin: baseUrl },
    body: form,
  });
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();

try {
  await page.goto(`${baseUrl}/ilanlarim`, { waitUntil: "networkidle" });
  const bootstrap = await page.evaluate(async () => {
    const form = new FormData();
    form.set("action", "seller_bootstrap");
    const response = await fetch("/ilanlarim", { method: "POST", body: form });
    return { status: response.status, body: await response.json() };
  });
  assert(bootstrap.status === 201, `bootstrap failed: ${bootstrap.status}`);
  const codeA = (bootstrap.body as { recoveryCode?: string }).recoveryCode ?? "";

  await context.clearCookies();
  await page.reload({ waitUntil: "networkidle" });
  await page.getByLabel("İlanlarım kurtarma kodu", { exact: true }).fill(codeA);
  await page.getByRole("button", { name: "Kurtarmayı hazırla" }).click();
  const codeB =
    (await page.getByTestId("candidate-seller-recovery-code").textContent())?.trim() ?? "";
  assert(/^ABR1\.[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{32}$/.test(codeB), "candidate B missing");

  const committed = await postRecovery(codeA, codeB);
  assert(committed.status === 200, `A to B commit failed: ${committed.status}`);

  let injectedAmbiguous = false;
  let reconcileCalls = 0;
  let codeC = "";
  let routeError = "";
  await page.route("**/ilanlarim", async (route) => {
    const request = route.request();
    if (request.method() !== "POST") return route.continue();
    const body = request.postData() ?? "";
    if (body.includes("seller_reconcile_recovery")) {
      reconcileCalls += 1;
      if (!codeC) routeError = "reconciliation started before candidate C was displayed";
      if (codeC && (!body.includes(codeB) || !body.includes(codeC))) {
        routeError = "reconciliation did not carry B to C credentials";
      }
      return route.continue();
    }
    if (body.includes("seller_recover") && !injectedAmbiguous) {
      injectedAmbiguous = true;
      return route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, code: "SUBMISSION_FAILED", message: "ambiguous" }),
      });
    }
    return route.continue();
  });

  await page.getByRole("button", { name: "Yeni kodu kaydettim, erişimi kurtar" }).click();
  const candidateC = page.getByTestId("reconciliation-candidate-seller-recovery-code");
  await candidateC.waitFor();
  codeC = (await candidateC.textContent())?.trim() ?? "";
  assert(/^ABR1\.[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{32}$/.test(codeC), "candidate C missing");
  assert(codeC !== codeB, "candidate C reused B");
  assert(reconcileCalls === 0, "reconciliation occurred before C display");
  assert(!routeError, routeError);

  await page
    .getByRole("button", { name: "İkinci yeni kodu kaydettim, belirsiz sonucu doğrula" })
    .click();
  const finalCode =
    (await page.getByTestId("rotated-seller-recovery-code").textContent())?.trim() ?? "";
  assert(finalCode === codeC, "B to C reconciliation did not make C current");
  assert(reconcileCalls === 1, `expected one reconciliation request, got ${reconcileCalls}`);
  assert(!routeError, routeError);

  const replay = await postRecovery(codeB, newRecoveryCode());
  assert(replay.status === 401, `consumed B replay returned ${replay.status}`);
} finally {
  await browser.close();
}
