import { describe, expect, test } from "bun:test";
import { deflateSync } from "node:zlib";
import {
  LISTING_PHOTO_MAX_BYTES,
  LISTING_PHOTO_SANITIZED_MIME_TYPE,
  buildListingPhotoObjectPath,
  sanitizeListingPhoto,
  validateListingPhoto,
  validateListingPhotoContentSignature,
} from "./listing-photo";

const listingId = "10000000-0000-4000-8000-000000000001";
const photoId = "20000000-0000-4000-8000-000000000001";
const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const XMP_MARKER = "<x:xmpmeta";
const GPS_MARKER = "GPSLatitude=41.1590";

function concatBytes(...parts: readonly Uint8Array[]): Uint8Array {
  const length = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const output = new Uint8Array(length);
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

function makeSyntheticPng(metadataText?: string): Uint8Array {
  const ihdr = new Uint8Array(13);
  const ihdrView = new DataView(ihdr.buffer);
  ihdrView.setUint32(0, 1, false);
  ihdrView.setUint32(4, 1, false);
  ihdr[8] = 8;
  ihdr[9] = 6;

  const chunks = [pngChunk("IHDR", ihdr)];
  if (metadataText) {
    chunks.push(
      pngChunk("tEXt", new TextEncoder().encode(`XML:com.adobe.xmp\0${metadataText}`)),
    );
  }

  const rgbaScanline = new Uint8Array([0, 0xff, 0x20, 0x20, 0xff]);
  chunks.push(pngChunk("IDAT", new Uint8Array(deflateSync(rgbaScanline))));
  chunks.push(pngChunk("IEND", new Uint8Array()));
  return concatBytes(PNG_SIGNATURE, ...chunks);
}

function containsAscii(bytes: Uint8Array, text: string): boolean {
  const needle = new TextEncoder().encode(text);
  for (let offset = 0; offset <= bytes.byteLength - needle.byteLength; offset += 1) {
    let matches = true;
    for (let index = 0; index < needle.byteLength; index += 1) {
      if (bytes[offset + index] !== needle[index]) {
        matches = false;
        break;
      }
    }
    if (matches) return true;
  }
  return false;
}

describe("real-pilot listing photo contract", () => {
  test("allows only JPEG, PNG and WebP within the 8 MiB boundary", () => {
    expect(validateListingPhoto("image/jpeg", 1)).toBeNull();
    expect(validateListingPhoto("image/png", LISTING_PHOTO_MAX_BYTES)).toBeNull();
    expect(validateListingPhoto("image/webp", 1024)).toBeNull();

    expect(validateListingPhoto("image/svg+xml", 1024)).toBe("UNSUPPORTED_MIME_TYPE");
    expect(validateListingPhoto("application/javascript", 1024)).toBe("UNSUPPORTED_MIME_TYPE");
    expect(validateListingPhoto("image/jpeg", 0)).toBe("EMPTY_FILE");
    expect(validateListingPhoto("image/jpeg", LISTING_PHOTO_MAX_BYTES + 1)).toBe("FILE_TOO_LARGE");
  });

  test("checks basic file signatures instead of trusting Content-Type alone", () => {
    expect(
      validateListingPhotoContentSignature(
        "image/jpeg",
        new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00]),
      ),
    ).toBeNull();
    expect(
      validateListingPhotoContentSignature(
        "image/png",
        new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
    ).toBeNull();
    expect(
      validateListingPhotoContentSignature(
        "image/webp",
        new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]),
      ),
    ).toBeNull();
    expect(
      validateListingPhotoContentSignature(
        "image/jpeg",
        new TextEncoder().encode("<script>alert(1)</script>"),
      ),
    ).toBe("CONTENT_SIGNATURE_MISMATCH");
  });

  test("decodes and re-encodes a valid supported image into canonical sanitized WebP", async () => {
    const input = makeSyntheticPng();
    const sanitized = await sanitizeListingPhoto("image/png", input);

    expect(sanitized.mimeType).toBe(LISTING_PHOTO_SANITIZED_MIME_TYPE);
    expect(sanitized.width).toBe(1);
    expect(sanitized.height).toBe(1);
    expect(validateListingPhotoContentSignature("image/webp", sanitized.bytes)).toBeNull();
    expect(sanitized.bytes.byteLength).toBeGreaterThan(0);
    expect(Array.from(sanitized.bytes)).not.toEqual(Array.from(input));
  });

  test("rejects malformed image bytes after signature validation", async () => {
    const malformed = concatBytes(PNG_SIGNATURE, new TextEncoder().encode("not-a-real-png"));

    await expect(sanitizeListingPhoto("image/png", malformed)).rejects.toMatchObject({
      code: "DECODE_FAILED",
    });
  });

  test("rejects MIME and content-signature mismatch before decoding", async () => {
    await expect(sanitizeListingPhoto("image/jpeg", makeSyntheticPng())).rejects.toMatchObject({
      code: "CONTENT_SIGNATURE_MISMATCH",
    });
  });

  test("rejects oversized input before decoding", async () => {
    const oversized = new Uint8Array(LISTING_PHOTO_MAX_BYTES + 1);
    oversized.set(PNG_SIGNATURE);

    await expect(sanitizeListingPhoto("image/png", oversized)).rejects.toMatchObject({
      code: "FILE_TOO_LARGE",
    });
  });

  test("drops synthetic XMP/GPS metadata at the decode and re-encode boundary", async () => {
    const metadata = `${XMP_MARKER}>${GPS_MARKER}</x:xmpmeta>`;
    const input = makeSyntheticPng(metadata);
    expect(containsAscii(input, XMP_MARKER)).toBe(true);
    expect(containsAscii(input, GPS_MARKER)).toBe(true);

    const sanitized = await sanitizeListingPhoto("image/png", input);

    expect(containsAscii(sanitized.bytes, XMP_MARKER)).toBe(false);
    expect(containsAscii(sanitized.bytes, GPS_MARKER)).toBe(false);
  });

  test("discards original filenames by generating an opaque listing-owned path", () => {
    expect(buildListingPhotoObjectPath(listingId, photoId, "image/jpeg")).toBe(
      `listings/${listingId}/${photoId}.jpg`,
    );
    expect(buildListingPhotoObjectPath(listingId, photoId, "image/png")).toBe(
      `listings/${listingId}/${photoId}.png`,
    );
    expect(buildListingPhotoObjectPath(listingId, photoId, "image/webp")).toBe(
      `listings/${listingId}/${photoId}.webp`,
    );
  });

  test("rejects non-UUID path ownership inputs", () => {
    expect(() => buildListingPhotoObjectPath("../../escape", photoId, "image/jpeg")).toThrow();
    expect(() => buildListingPhotoObjectPath(listingId, "not-a-uuid", "image/jpeg")).toThrow();
  });
});
