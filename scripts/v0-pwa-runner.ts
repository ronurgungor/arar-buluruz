import path from "node:path";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:4174";
const serverEntry = path.resolve(".output/server/index.mjs");
const browserSuiteTimeoutMs = 30_000;
const processExitTimeoutMs = 5_000;
const pwaOnly = process.env.ARAR_V0_PWA_ONLY === "enabled";

if (!(await Bun.file(serverEntry).exists())) {
  throw new Error("The V0 production preview output is missing.");
}

let server: ReturnType<typeof Bun.spawn> | undefined;

async function waitForServerDown() {
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      await fetch(baseUrl, { signal: AbortSignal.timeout(500) });
    } catch {
      return;
    }
    await Bun.sleep(100);
  }

  throw new Error("The V0 production preview server did not stop.");
}

async function waitForServerReady() {
  for (let attempt = 1; attempt <= 60; attempt += 1) {
    try {
      const response = await fetch(baseUrl, {
        cache: "no-store",
        signal: AbortSignal.timeout(1_000),
      });
      if (response.ok) return;
    } catch {
      // The production preview server may still be starting.
    }
    await Bun.sleep(1_000);
  }

  throw new Error("The V0 production preview server did not become ready.");
}

async function startServer() {
  if (server && server.exitCode === null) return;

  server = Bun.spawn(["bun", serverEntry], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: "4174",
      NITRO_HOST: "127.0.0.1",
      NITRO_PORT: "4174",
    },
    stdout: "inherit",
    stderr: "inherit",
  });

  await waitForServerReady();
}

async function waitForProcessExit(
  process: ReturnType<typeof Bun.spawn>,
  timeoutMs: number,
): Promise<number | null> {
  return Promise.race([process.exited, Bun.sleep(timeoutMs).then(() => null)]);
}

async function terminateProcess(process: ReturnType<typeof Bun.spawn>) {
  if (process.exitCode !== null) return;

  process.kill();
  const gracefulExit = await waitForProcessExit(process, processExitTimeoutMs);
  if (gracefulExit !== null || process.exitCode !== null) return;

  process.kill(9);
  const forcedExit = await waitForProcessExit(process, processExitTimeoutMs);
  if (forcedExit === null && process.exitCode === null) {
    throw new Error("A V0 browser validation process could not be terminated.");
  }
}

async function runBrowserSuite(script: string, label: string) {
  const child = Bun.spawn(["bun", path.resolve(script)], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      BASE_URL: baseUrl,
    },
    stdout: "inherit",
    stderr: "inherit",
  });

  const exitCode = await waitForProcessExit(child, browserSuiteTimeoutMs);
  if (exitCode === null) {
    await terminateProcess(child);
    throw new Error(`${label} exceeded ${browserSuiteTimeoutMs}ms.`);
  }
  if (exitCode !== 0) {
    throw new Error(`${label} failed with exit code ${exitCode}.`);
  }
}

async function stopServer() {
  const activeServer = server;
  if (!activeServer || activeServer.exitCode !== null) {
    server = undefined;
    return;
  }

  await terminateProcess(activeServer);
  server = undefined;
  await waitForServerDown();
}

Object.assign(globalThis, { __stopV0Server: stopServer });

try {
  await startServer();

  if (!pwaOnly) {
    await runBrowserSuite("scripts/v0-privacy-e2e.ts", "V0 privacy browser validation");
    await runBrowserSuite("scripts/v0-search-e2e.ts", "V0 search browser validation");
    await runBrowserSuite("scripts/v0-demo-listing-e2e.ts", "V0 demo listing browser validation");
  }

  await import("./v0-pwa-e2e.ts");
} finally {
  await stopServer();
}

process.exit(0);
