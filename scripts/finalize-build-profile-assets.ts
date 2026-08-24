import { copyFile, readFile } from "node:fs/promises";
import path from "node:path";

if (process.env.ARAR_BUILD_PROFILE !== "pilot-rc") process.exit(0);

const source = path.resolve("src/build-profiles/pilot/manifest.webmanifest");
const destination = path.resolve(".output/public/manifest.webmanifest");

await copyFile(source, destination);

const manifest = await readFile(destination, "utf8");
for (const forbidden of [
  "V0 test sürümü",
  "Pilot release candidate",
  "yalnız sentetik test verisi",
  "gerçek veri girişi kapalıdır",
]) {
  if (manifest.includes(forbidden)) {
    throw new Error(`Pilot PWA manifest contains internal/test residue: ${forbidden}`);
  }
}

console.log("pilot-rc build profile selected the public-facing PWA manifest.");
