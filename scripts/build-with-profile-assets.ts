import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const isPilotRc = process.env.ARAR_BUILD_PROFILE === "pilot-rc";
const realDataActivationEnabled = process.env.ARAR_REAL_DATA_ACTIVATION === "enabled";
const publicManifestPath = path.resolve("public/manifest.webmanifest");
const pilotManifestPath = path.resolve("src/build-profiles/pilot/manifest.webmanifest");
const E164_PATTERN = /^\+[1-9][0-9]{7,14}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
let originalManifest: Buffer | null = null;

function requireActivationValue(name: string, minimumLength = 3): string {
  const value = process.env[name]?.trim() ?? "";
  if (value.length < minimumLength) {
    throw new Error(`Real-data activation build requires ${name}.`);
  }
  const normalized = value.toLowerCase();
  if (normalized.includes("placeholder") || normalized.includes("aktivasyon öncesi")) {
    throw new Error(`Real-data activation build rejects placeholder value in ${name}.`);
  }
  return value;
}

function verifyRealActivationIdentity(): void {
  if (!realDataActivationEnabled) return;
  if (!isPilotRc) {
    throw new Error("ARAR_REAL_DATA_ACTIVATION=enabled is allowed only for the pilot-rc build profile.");
  }

  requireActivationValue("VITE_OPERATOR_LEGAL_NAME", 4);
  requireActivationValue("VITE_OPERATOR_ADDRESS", 10);
  const email = requireActivationValue("VITE_OPERATOR_EMAIL", 6);
  const phone = requireActivationValue("VITE_OPERATOR_PHONE_E164", 8);
  requireActivationValue("VITE_OPERATOR_TAX_REGISTRY", 3);

  if (!EMAIL_PATTERN.test(email)) {
    throw new Error("Real-data activation build requires a valid VITE_OPERATOR_EMAIL.");
  }
  if (!E164_PATTERN.test(phone)) {
    throw new Error("Real-data activation build requires a valid VITE_OPERATOR_PHONE_E164.");
  }
}

process.env.VITE_REAL_DATA_ACTIVATION = realDataActivationEnabled ? "enabled" : "disabled";
verifyRealActivationIdentity();

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
