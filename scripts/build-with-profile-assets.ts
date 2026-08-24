import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const isPilotRc = process.env.ARAR_BUILD_PROFILE === "pilot-rc";
const publicManifestPath = path.resolve("public/manifest.webmanifest");
const pilotManifestPath = path.resolve("src/build-profiles/pilot/manifest.webmanifest");
let originalManifest: Buffer | null = null;

async function run(command: string[]) {
  const child = Bun.spawn(command, {
    cwd: process.cwd(),
    env: process.env,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  return await child.exited;
}

let buildExitCode = 1;
try {
  if (isPilotRc) {
    originalManifest = Buffer.from(await readFile(publicManifestPath));
    const pilotManifest = Buffer.from(await readFile(pilotManifestPath));
    JSON.parse(pilotManifest.toString("utf8"));
    await writeFile(publicManifestPath, pilotManifest);
    console.log("pilot-rc build selected the pilot manifest before Vite/Nitro asset discovery.");
  }

  buildExitCode = await run([process.execPath, "--bun", "vite", "build"]);
} finally {
  if (originalManifest) {
    await writeFile(publicManifestPath, originalManifest);
    const restoredManifest = Buffer.from(await readFile(publicManifestPath));
    if (!restoredManifest.equals(originalManifest)) {
      throw new Error("Pilot build could not restore public/manifest.webmanifest byte-for-byte.");
    }
    console.log("pilot-rc build restored the repository public manifest byte-for-byte.");
  }
}

if (buildExitCode !== 0) process.exit(buildExitCode);

const finalizeExitCode = await run([process.execPath, "scripts/finalize-build-profile-assets.ts"]);
if (finalizeExitCode !== 0) process.exit(finalizeExitCode);
