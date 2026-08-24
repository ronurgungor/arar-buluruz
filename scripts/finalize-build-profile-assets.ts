import { createHash } from "node:crypto";
import { copyFile, readFile } from "node:fs/promises";
import path from "node:path";

if (process.env.ARAR_BUILD_PROFILE !== "pilot-rc") process.exit(0);

const source = path.resolve("src/build-profiles/pilot/manifest.webmanifest");
const destination = path.resolve(".output/public/manifest.webmanifest");

await copyFile(source, destination);

const manifestBytes = await readFile(destination);
const manifestText = manifestBytes.toString("utf8");
const manifest = JSON.parse(manifestText) as Record<string, unknown>;

for (const [field, expected] of Object.entries({
  id: "/",
  name: "Arar Buluruz",
  short_name: "Arar Buluruz",
  lang: "tr",
  start_url: "/",
  scope: "/",
  display: "standalone",
})) {
  if (manifest[field] !== expected) {
    throw new Error(`Pilot PWA manifest field ${field} drifted from ${JSON.stringify(expected)}.`);
  }
}

for (const forbidden of [
  "V0 test sürümü",
  "Pilot release candidate",
  "yalnız sentetik test verisi",
  "gerçek veri girişi kapalıdır",
  "geliştirme ortamında",
]) {
  if (manifestText.toLocaleLowerCase("tr-TR").includes(forbidden.toLocaleLowerCase("tr-TR"))) {
    throw new Error(`Pilot PWA manifest contains internal/test residue: ${forbidden}`);
  }
}

const sha256 = createHash("sha256").update(manifestBytes).digest("hex");
console.log(
  `pilot-rc finalized manifest JSON.parse passed: ${manifestBytes.byteLength} bytes, sha256=${sha256}.`,
);
