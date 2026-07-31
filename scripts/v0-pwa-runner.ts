const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:4174";

const server = Bun.spawn(
  ["bun", "run", "dev", "--", "--host", "127.0.0.1", "--port", "4174", "--strictPort"],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      VITE_LISTINGS_SOURCE: "mock",
    },
    stdout: "inherit",
    stderr: "inherit",
  },
);

async function stopServer() {
  if (server.exitCode !== null) return;
  server.kill();
  await server.exited;
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
      // The dev server may still be starting.
    }
    await Bun.sleep(1_000);
  }

  if (!ready) throw new Error("The V0 test server did not become ready.");

  await import("./v0-pwa-e2e.ts");
} finally {
  await stopServer();
}

process.exit(0);
