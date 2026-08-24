import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

if (process.env.ARAR_BUILD_PROFILE !== "pilot-rc") process.exit(0);

const source = path.resolve("src/build-profiles/pilot/manifest.webmanifest");
const destination = path.resolve(".output/public/manifest.webmanifest");
const [sourceBytes, manifestBytes] = await Promise.all([readFile(source), readFile(destination)]);

if (!manifestBytes.equals(sourceBytes)) {
  const sourceSha256 = createHash("sha256").update(sourceBytes).digest("hex");
  const outputSha256 = createHash("sha256").update(manifestBytes).digest("hex");
  throw new Error(
    `Pilot PWA manifest output differs from the build-profile source: source=${sourceSha256} output=${outputSha256}.`,
  );
}

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
  `pilot-rc finalized manifest JSON.parse/source-byte identity passed: ${manifestBytes.byteLength} bytes, sha256=${sha256}.`,
);
