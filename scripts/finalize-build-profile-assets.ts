import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

if (process.env.ARAR_BUILD_PROFILE !== "pilot-rc") process.exit(0);

const source = path.resolve("src/build-profiles/pilot/manifest.webmanifest");
const legacySource = path.resolve("public/manifest.webmanifest");
const destination = path.resolve(".output/public/manifest.webmanifest");
const [sourceBytes, legacyBytes, manifestBytes] = await Promise.all([
  readFile(source),
  readFile(legacySource),
  readFile(destination),
]);

const sha256 = (value: Buffer) => createHash("sha256").update(value).digest("hex");
const sourceSha256 = sha256(sourceBytes);
const legacySha256 = sha256(legacyBytes);
const outputSha256 = sha256(manifestBytes);

if (!manifestBytes.equals(sourceBytes)) {
  const outputText = manifestBytes.toString("utf8");
  let parseState = "PASS";
  try {
    JSON.parse(outputText);
  } catch (error) {
    parseState = `FAIL: ${error instanceof Error ? error.message : String(error)}`;
  }
  console.error(
    `Pilot manifest build diagnostic: source_bytes=${sourceBytes.byteLength} source_sha256=${sourceSha256} legacy_bytes=${legacyBytes.byteLength} legacy_sha256=${legacySha256} output_bytes=${manifestBytes.byteLength} output_sha256=${outputSha256} output_equals_legacy=${manifestBytes.equals(legacyBytes)} output_json_parse=${JSON.stringify(parseState)} output_preview=${JSON.stringify(outputText.slice(0, 320))}`,
  );
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

console.log(
  `pilot-rc finalized manifest JSON.parse/source-byte identity passed: ${manifestBytes.byteLength} bytes, sha256=${outputSha256}.`,
);
