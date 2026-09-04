import { chromium } from "playwright";

const publicBaseUrl = process.env.PUBLIC_BASE_URL ?? "http://127.0.0.1:4173";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function recoveryCode(): string {
  const randomPart = (byteLength: number) => {
    const bytes = new Uint8Array(byteLength);
    crypto.getRandomValues(bytes);
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
  };
  return `ABR1.${randomPart(12)}.${randomPart(24)}`;
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();

try {
  await page.goto(`${publicBaseUrl}/ilanlarim`, { waitUntil: "networkidle" });

  const bootstrap = await page.evaluate(async () => {
    const form = new FormData();
    form.set("action", "seller_bootstrap");
    const response = await fetch("/ilanlarim", {
      method: "POST",
      body: form,
      credentials: "same-origin",
    });
    return { status: response.status, body: await response.json() };
  });
  assert(bootstrap.status === 201, `Synthetic seller bootstrap failed: ${bootstrap.status}`);
  const recoveryA = (bootstrap.body as { recoveryCode?: string }).recoveryCode ?? "";
  assert(
    /^ABR1\.[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{32}$/.test(recoveryA),
    "Initial recovery credential A was not returned in canonical format.",
  );

  await context.clearCookies();
  await page.reload({ waitUntil: "networkidle" });
  await page.getByLabel("İlanlarım kurtarma kodu", { exact: true }).fill(recoveryA);
  await page.getByRole("button", { name: "Kurtarmayı hazırla" }).click();
  const candidateBNode = page.getByTestId("candidate-seller-recovery-code");
  await candidateBNode.waitFor();
  const candidateB = (await candidateBNode.textContent())?.trim() ?? "";
  assert(
    /^ABR1\.[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{32}$/.test(candidateB),
    "Pre-generated candidate B was not displayed before A to B recovery.",
  );

  let firstRecoveryCommitted = false;
  let reconciliationRequests = 0;
  let expectedC = "";
  let routeAssertionError = "";

  await page.route("**/ilanlarim", async (route) => {
    const request = route.request();
    if (request.method() !== "POST") {
      await route.continue();
      return;
    }
    const body = request.postData() ?? "";

    if (body.includes("seller_recover") && !body.includes("seller_reconcile_recovery")) {
      if (!firstRecoveryCommitted) {
        firstRecoveryCommitted = true;
        const upstream = await route.fetch();
        if (upstream.status() !== 200) {
          routeAssertionError = `A to B upstream recovery failed with ${upstream.status()}`;
        }
        await route.abort("failed");
        return;
      }
      await route.continue();
      return;
    }

    if (body.includes("seller_reconcile_recovery")) {
      reconciliationRequests += 1;
      if (!expectedC) {
        routeAssertionError = "Reconciliation mutation started before candidate C was displayed.";
      } else if (!body.includes(candidateB) || !body.includes(expectedC)) {
        routeAssertionError = "Reconciliation request did not carry B to C rotation credentials.";
      }
      await route.continue();
      return;
    }

    await route.continue();
  });

  await page.getByRole("button", { name: "Yeni kodu kaydettim, erişimi kurtar" }).click();
  const candidateCNode = page.getByTestId("reconciliation-candidate-seller-recovery-code");
  await candidateCNode.waitFor();
  expectedC = (await candidateCNode.textContent())?.trim() ?? "";
  assert(
    /^ABR1\.[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{32}$/.test(expectedC),
    "Candidate C was not generated/displayed after ambiguous A to B response loss.",
  );
  assert(expectedC !== candidateB, "Candidate C reused candidate B.");
  assert(
    reconciliationRequests === 0,
    "Reconciliation mutation occurred before the browser displayed candidate C.",
  );
  assert(!routeAssertionError, routeAssertionError);

  await page
    .getByRole("button", { name: "İkinci yeni kodu kaydettim, belirsiz sonucu doğrula" })
    .click();
  const rotated = page.getByTestId("rotated-seller-recovery-code");
  await rotated.waitFor();
  const finalCode = (await rotated.textContent())?.trim() ?? "";
  assert(finalCode === expectedC, "Successful B to C reconciliation did not make C current in UI.");
  assert(
    reconciliationRequests === 1,
    `Expected one reconciliation request, got ${reconciliationRequests}.`,
  );
  assert(!routeAssertionError, routeAssertionError);

  const replay = await page.evaluate(
    async ({ codeB, replacement }) => {
      const form = new FormData();
      form.set("action", "seller_recover");
      form.set("recoveryCode", codeB);
      form.set("replacementRecoveryCode", replacement);
      const response = await fetch("/ilanlarim", {
        method: "POST",
        body: form,
        credentials: "same-origin",
      });
      return { status: response.status, body: await response.json() };
    },
    { codeB: candidateB, replacement: recoveryCode() },
  );
  assert(
    replay.status === 401 &&
      typeof replay.body === "object" &&
      replay.body !== null &&
      (replay.body as { code?: string }).code === "RECOVERY_FAILED",
    `Consumed reconciliation credential B replay did not fail: ${JSON.stringify(replay)}`,
  );
} finally {
  await browser.close();
}
