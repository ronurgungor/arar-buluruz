import path from "node:path";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:4174";
const viteCli = path.resolve("node_modules/vite/bin/vite.js");

const server = Bun.spawn(
  ["bun", viteCli, "preview", "--host", "127.0.0.1", "--port", "4174", "--strictPort"],
  {
    cwd: process.cwd(),
    env: process.env,
    stdout: "inherit",
    stderr: "inherit",
  },
);

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

async function stopServer() {
  if (server.exitCode !== null) return;

  server.kill();
  const exited = await Promise.race([
    server.exited.then(() => true),
    Bun.sleep(5_000).then(() => false),
  ]);

  if (!exited && server.exitCode === null) {
    server.kill(9);
    await server.exited;
  }

  await waitForServerDown();
}

Object.assign(globalThis, { __stopV0Server: stopServer });

try {
  let ready = false;
  for (let attempt = 1; attempt <= 60; attempt += 1) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {
      // The production preview server may still be starting.
    }
    await Bun.sleep(1_000);
  }

  if (!ready) throw new Error("The V0 production preview server did not become ready.");

  await import("./v0-pwa-e2e.ts");
} finally {
  await stopServer();
}

process.exit(0);
