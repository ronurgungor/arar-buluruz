import path from "node:path";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:4174";
const serverEntry = path.resolve(".output/server/index.mjs");

if (!(await Bun.file(serverEntry).exists())) {
  throw new Error("The V0 production preview output is missing.");
}

let server: ReturnType<typeof Bun.spawn> | undefined;

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
  if (!activeServer || activeServer.exitCode !== null) return;

  activeServer.kill();
  const exited = await Promise.race([
    activeServer.exited.then(() => true),
    Bun.sleep(5_000).then(() => false),
  ]);

  if (!exited && activeServer.exitCode === null) {
    activeServer.kill(9);
    await activeServer.exited;
  }
}

try {
  await startServer();
  console.log("V0 mobile runner: clean production preview is ready");
  await import("./v0-mobile-e2e.ts");
} finally {
  await stopServer();
}

process.exit(0);
