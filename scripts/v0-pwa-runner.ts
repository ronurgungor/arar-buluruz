import path from "node:path";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:4174";
const serverEntry = path.resolve(".output/server/index.mjs");

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

async function stopServer() {
  const activeServer = server;
  if (!activeServer || activeServer.exitCode !== null) {
    server = undefined;
    return;
  }

  activeServer.kill();
  const exited = await Promise.race([
    activeServer.exited.then(() => true),
    Bun.sleep(5_000).then(() => false),
  ]);

  if (!exited && activeServer.exitCode === null) {
    activeServer.kill(9);
    await activeServer.exited;
  }

  server = undefined;
  await waitForServerDown();
}

Object.assign(globalThis, { __stopV0Server: stopServer });

try {
  await startServer();
  await import("./v0-privacy-e2e.ts");
  await import("./v0-search-e2e.ts");

  // Run the established PWA/offline chain first. It intentionally stops the
  // preview server to verify the honest offline fallback.
  await import("./v0-pwa-e2e.ts");

  // Restart a clean production preview for the separate synthetic mobile
  // core-flow coverage so neither browser phase can affect the other.
  await startServer();
  console.log("V0 runner: production preview restarted for mobile core flow");
  await import("./v0-mobile-e2e.ts");
} finally {
  await stopServer();
}

process.exit(0);
