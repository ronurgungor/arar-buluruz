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

let buildFailure: unknown = null;
let restoreFailure: unknown = null;

try {
  if (isPilotRc) {
    originalManifest = Buffer.from(await readFile(publicManifestPath));
    const pilotManifest = Buffer.from(await readFile(pilotManifestPath));
    JSON.parse(pilotManifest.toString("utf8"));
    await writeFile(publicManifestPath, pilotManifest);
    console.log("pilot-rc build selected the pilot manifest before Vite/Nitro asset discovery.");
  }

  const buildExitCode = await run(["bunx", "vite", "build"]);
  if (buildExitCode !== 0) {
    buildFailure = new Error(`Vite build exited with code ${buildExitCode}.`);
  }
} catch (error) {
  buildFailure = error;
}

if (originalManifest) {
  try {
    await writeFile(publicManifestPath, originalManifest);
    const restoredManifest = Buffer.from(await readFile(publicManifestPath));
    if (!restoredManifest.equals(originalManifest)) {
      restoreFailure = new Error(
        "Pilot build could not restore public/manifest.webmanifest byte-for-byte.",
      );
    } else {
      console.log("pilot-rc build restored the repository public manifest byte-for-byte.");
    }
  } catch (error) {
    restoreFailure = error;
  }
}

if (buildFailure && restoreFailure) {
  throw new AggregateError(
    [buildFailure, restoreFailure],
    "Vite build failed and the pilot public manifest restore also failed.",
  );
}
if (buildFailure) throw buildFailure;
if (restoreFailure) throw restoreFailure;

const finalizeExitCode = await run([process.execPath, "scripts/finalize-build-profile-assets.ts"]);
if (finalizeExitCode !== 0) {
  throw new Error(`Build-profile asset verification exited with code ${finalizeExitCode}.`);
}
