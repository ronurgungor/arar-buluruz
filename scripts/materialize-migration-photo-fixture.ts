import { createHash } from "node:crypto";
import { deflateSync } from "node:zlib";
import {
  sanitizeListingPhoto,
  validateListingPhotoContentSignature,
} from "../src/lib/listing-photo";

const outputPath = process.argv[2];
if (!outputPath) {
  throw new Error("Usage: bun scripts/materialize-migration-photo-fixture.ts <output.webp>");
}

const CANONICAL_SHA256 = "fd89cface8e12174fb1c6e78c0a8b0b26be925820eed38713ff1d921d5f969df";
const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function concatBytes(...parts: readonly Uint8Array[]): Uint8Array {
  const output = new Uint8Array(parts.reduce((sum, part) => sum + part.byteLength, 0));
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.byteLength;
  }
  return output;
}

function uint32BigEndian(value: number): Uint8Array {
  const output = new Uint8Array(4);
  new DataView(output.buffer).setUint32(0, value >>> 0, false);
  return output;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const body = concatBytes(typeBytes, data);
  return concatBytes(uint32BigEndian(data.byteLength), body, uint32BigEndian(crc32(body)));
}

function makeSyntheticPng(): Uint8Array {
  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);
  view.setUint32(0, 2, false);
  view.setUint32(4, 2, false);
  ihdr[8] = 8;
  ihdr[9] = 6;

  const scanlines = concatBytes(
    new Uint8Array([0, 0x12, 0x34, 0x56, 0xff, 0x78, 0x9a, 0xbc, 0xff]),
    new Uint8Array([0, 0x33, 0x55, 0x77, 0xff, 0xaa, 0xbb, 0xcc, 0xff]),
  );

  return concatBytes(
    PNG_SIGNATURE,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", new Uint8Array(deflateSync(scanlines))),
    pngChunk("IEND", new Uint8Array()),
  );
}

const sanitized = await sanitizeListingPhoto("image/png", makeSyntheticPng());
if (sanitized.mimeType !== "image/webp") {
  throw new Error(`Synthetic migration photo was not canonical WebP: ${sanitized.mimeType}`);
}
if (validateListingPhotoContentSignature("image/webp", sanitized.bytes) !== null) {
  throw new Error("Synthetic migration WebP signature validation failed.");
}

const sha256 = createHash("sha256").update(sanitized.bytes).digest("hex");
if (sha256 !== CANONICAL_SHA256) {
  throw new Error(`Synthetic migration photo hash drift: expected ${CANONICAL_SHA256}, got ${sha256}.`);
}

await Bun.write(outputPath, sanitized.bytes);
console.log(JSON.stringify({ path: outputPath, byteSize: sanitized.bytes.byteLength, sha256 }));
