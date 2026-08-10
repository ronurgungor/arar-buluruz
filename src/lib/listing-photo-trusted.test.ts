import { describe, expect, test } from "bun:test";
import { deflateSync } from "node:zlib";
import {
  LISTING_PHOTO_MAX_PIXELS,
  LISTING_PHOTO_SANITIZED_MIME_TYPE,
  sanitizeListingPhoto,
  validateListingPhotoContentSignature,
} from "./listing-photo";
import {
  LISTING_PHOTO_SIGNED_URL_MAX_SECONDS,
  TrustedListingPhotoIngestionError,
  createActiveListingPhotoSignedUrl,
  ingestTrustedListingPhoto,
  type StoredListingPhotoMetadata,
} from "./listing-photo-trusted";

const listingId = "51000000-0000-4000-8000-000000000001";
const photoId = "52000000-0000-4000-8000-000000000001";
const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const XMP_NAMESPACE = "http://ns.adobe.com/xap/1.0/";
const XMP_MARKER = "ARAR_SYNTHETIC_XMP_GPS_TEST";

type TestImageMetadata = {
  format: string;
  width: number;
  height: number;
};

type TestImagePipeline = {
  metadata(): Promise<TestImageMetadata>;
  jpeg(options: { quality: number }): TestImagePipeline;
  bytes(): Promise<Uint8Array>;
};

type TestImageConstructor = new (
  input: Uint8Array,
  options?: { autoOrient?: boolean; maxPixels?: number },
) => TestImagePipeline;

function getTestImageConstructor(): TestImageConstructor {
  const runtime = (
    globalThis as typeof globalThis & {
      Bun?: { Image?: TestImageConstructor };
    }
  ).Bun;
  if (!runtime?.Image) throw new Error("Bun.Image is required for trusted photo tests.");
  return runtime.Image;
}

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

function makeSyntheticPng(): Uint8Array {
  const ihdr = new Uint8Array(13);
  const ihdrView = new DataView(ihdr.buffer);
  ihdrView.setUint32(0, 1, false);
  ihdrView.setUint32(4, 1, false);
  ihdr[8] = 8;
  ihdr[9] = 6;

  const rgbaScanline = new Uint8Array([0, 0x24, 0x68, 0xac, 0xff]);
  return concatBytes(
    PNG_SIGNATURE,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", new Uint8Array(deflateSync(rgbaScanline))),
    pngChunk("IEND", new Uint8Array()),
  );
}

function writeIfdEntry(
  view: DataView,
  offset: number,
  tag: number,
  type: number,
  count: number,
  valueOrOffset: number,
): void {
  view.setUint16(offset, tag, true);
  view.setUint16(offset + 2, type, true);
  view.setUint32(offset + 4, count, true);
  view.setUint32(offset + 8, valueOrOffset, true);
}

function writeRational(
  view: DataView,
  offset: number,
  numerator: number,
  denominator: number,
): void {
  view.setUint32(offset, numerator, true);
  view.setUint32(offset + 4, denominator, true);
}

function makeSyntheticExifGpsPayload(): Uint8Array {
  const gpsIfdOffset = 26;
  const gpsDataOffset = 92;
  const longitudeDataOffset = gpsDataOffset + 24;
  const tiff = new Uint8Array(140);
  const view = new DataView(tiff.buffer);

  tiff[0] = 0x49;
  tiff[1] = 0x49;
  view.setUint16(2, 0x2a, true);
  view.setUint32(4, 8, true);

  view.setUint16(8, 1, true);
  writeIfdEntry(view, 10, 0x8825, 4, 1, gpsIfdOffset);
  view.setUint32(22, 0, true);

  view.setUint16(gpsIfdOffset, 5, true);
  writeIfdEntry(view, 28, 0x0000, 1, 4, 0);
  tiff.set([2, 3, 0, 0], 36);
  writeIfdEntry(view, 40, 0x0001, 2, 2, 0);
  tiff.set([0x4e, 0, 0, 0], 48);
  writeIfdEntry(view, 52, 0x0002, 5, 3, gpsDataOffset);
  writeIfdEntry(view, 64, 0x0003, 2, 2, 0);
  tiff.set([0x45, 0, 0, 0], 72);
  writeIfdEntry(view, 76, 0x0004, 5, 3, longitudeDataOffset);
  view.setUint32(88, 0, true);

  writeRational(view, gpsDataOffset, 41, 1);
  writeRational(view, gpsDataOffset + 8, 9, 1);
  writeRational(view, gpsDataOffset + 16, 324, 10);
  writeRational(view, longitudeDataOffset, 27, 1);
  writeRational(view, longitudeDataOffset + 8, 48, 1);
  writeRational(view, longitudeDataOffset + 16, 12, 1);

  return concatBytes(new TextEncoder().encode("Exif\0\0"), tiff);
}

function jpegApp1(payload: Uint8Array): Uint8Array {
  const segmentLength = payload.byteLength + 2;
  if (segmentLength > 0xffff) throw new Error("Synthetic APP1 payload is too large.");
  return concatBytes(
    new Uint8Array([0xff, 0xe1, (segmentLength >> 8) & 0xff, segmentLength & 0xff]),
    payload,
  );
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

function hasSyntheticExifGpsIfd(bytes: Uint8Array): boolean {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff || bytes[3] !== 0xe1) {
    return false;
  }

  const segmentLength = ((bytes[4] ?? 0) << 8) | (bytes[5] ?? 0);
  const payloadStart = 6;
  const payloadEnd = payloadStart + segmentLength - 2;
  if (
    payloadEnd > bytes.byteLength ||
    !containsAscii(bytes.subarray(payloadStart, payloadEnd), "Exif\0\0")
  ) {
    return false;
  }

  const tiffStart = payloadStart + 6;
  const tiffLength = payloadEnd - tiffStart;
  if (tiffLength < 32) return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset + tiffStart, tiffLength);
  if (view.getUint16(0, true) !== 0x4949 || view.getUint16(2, true) !== 0x2a) return false;

  const ifd0Offset = view.getUint32(4, true);
  const ifd0Count = view.getUint16(ifd0Offset, true);
  let gpsIfdOffset = -1;
  for (let index = 0; index < ifd0Count; index += 1) {
    const entryOffset = ifd0Offset + 2 + index * 12;
    if (view.getUint16(entryOffset, true) === 0x8825) {
      gpsIfdOffset = view.getUint32(entryOffset + 8, true);
      break;
    }
  }
  if (gpsIfdOffset < 0 || gpsIfdOffset + 2 > tiffLength) return false;

  const gpsCount = view.getUint16(gpsIfdOffset, true);
  const tags = new Set<number>();
  for (let index = 0; index < gpsCount; index += 1) {
    const entryOffset = gpsIfdOffset + 2 + index * 12;
    if (entryOffset + 12 > tiffLength) return false;
    tags.add(view.getUint16(entryOffset, true));
  }

  return tags.has(0x0001) && tags.has(0x0002) && tags.has(0x0003) && tags.has(0x0004);
}

async function makeSyntheticJpegWithExifGpsXmp(): Promise<Uint8Array> {
  const ImageDecoder = getTestImageConstructor();
  const baseJpeg = await new ImageDecoder(makeSyntheticPng(), {
    maxPixels: LISTING_PHOTO_MAX_PIXELS,
  })
    .jpeg({ quality: 90 })
    .bytes();

  if (baseJpeg[0] !== 0xff || baseJpeg[1] !== 0xd8) {
    throw new Error("Synthetic JPEG encoder did not produce a JPEG SOI marker.");
  }

  const xmpPayload = new TextEncoder().encode(
    `${XMP_NAMESPACE}\0<x:xmpmeta>${XMP_MARKER};lat=41.159;lon=27.802</x:xmpmeta>`,
  );

  return concatBytes(
    baseJpeg.subarray(0, 2),
    jpegApp1(makeSyntheticExifGpsPayload()),
    jpegApp1(xmpPayload),
    baseJpeg.subarray(2),
  );
}

function makeMetadata(
  overrides: Partial<StoredListingPhotoMetadata> = {},
): StoredListingPhotoMetadata {
  return {
    listingId,
    photoId,
    objectPath: `listings/${listingId}/${photoId}.webp`,
    mimeType: LISTING_PHOTO_SANITIZED_MIME_TYPE,
    byteSize: 123,
    sortOrder: 0,
    ...overrides,
  };
}

describe("trusted real-pilot photo pipeline", () => {
  test("sanitizes a synthetic decodable JPEG containing EXIF GPS and XMP into newly encoded metadata-free WebP", async () => {
    const ImageDecoder = getTestImageConstructor();
    const input = await makeSyntheticJpegWithExifGpsXmp();

    expect(validateListingPhotoContentSignature("image/jpeg", input)).toBeNull();
    expect(hasSyntheticExifGpsIfd(input)).toBe(true);
    expect(containsAscii(input, XMP_NAMESPACE)).toBe(true);
    expect(containsAscii(input, XMP_MARKER)).toBe(true);

    const inputMetadata = await new ImageDecoder(input, {
      maxPixels: LISTING_PHOTO_MAX_PIXELS,
    }).metadata();
    expect(inputMetadata).toMatchObject({ format: "jpeg", width: 1, height: 1 });

    const sanitized = await sanitizeListingPhoto("image/jpeg", input);
    expect(sanitized.mimeType).toBe("image/webp");
    expect(validateListingPhotoContentSignature("image/webp", sanitized.bytes)).toBeNull();
    expect(Array.from(sanitized.bytes)).not.toEqual(Array.from(input));
    expect(hasSyntheticExifGpsIfd(sanitized.bytes)).toBe(false);
    expect(containsAscii(sanitized.bytes, XMP_NAMESPACE)).toBe(false);
    expect(containsAscii(sanitized.bytes, XMP_MARKER)).toBe(false);
    expect(containsAscii(sanitized.bytes, "Exif\0\0")).toBe(false);

    const outputMetadata = await new ImageDecoder(sanitized.bytes, {
      maxPixels: LISTING_PHOTO_MAX_PIXELS,
    }).metadata();
    expect(outputMetadata).toMatchObject({ format: "webp", width: 1, height: 1 });
  });

  test("uploads only sanitized WebP and persists matching canonical metadata", async () => {
    const input = await makeSyntheticJpegWithExifGpsXmp();
    let uploadedBytes: Uint8Array | null = null;
    let uploadedMime: string | null = null;
    let persisted: StoredListingPhotoMetadata | null = null;

    const result = await ingestTrustedListingPhoto(
      {
        listingId,
        photoId,
        declaredMimeType: "image/jpeg",
        bytes: input,
        sortOrder: 0,
      },
      {
        async uploadSanitizedObject(upload) {
          uploadedBytes = upload.bytes.slice();
          uploadedMime = upload.mimeType;
          expect(upload.objectPath).toBe(`listings/${listingId}/${photoId}.webp`);
        },
        async insertPhotoMetadata(metadata) {
          persisted = { ...metadata };
        },
        async deleteObject() {
          throw new Error("cleanup must not run on a successful ingestion");
        },
      },
    );

    expect(uploadedMime).toBe("image/webp");
    expect(uploadedBytes).not.toBeNull();
    expect(validateListingPhotoContentSignature("image/webp", uploadedBytes!)).toBeNull();
    expect(Array.from(uploadedBytes!)).not.toEqual(Array.from(input));
    expect(containsAscii(uploadedBytes!, XMP_MARKER)).toBe(false);
    expect(persisted).toEqual(result);
    expect(result).toEqual({
      listingId,
      photoId,
      objectPath: `listings/${listingId}/${photoId}.webp`,
      mimeType: "image/webp",
      byteSize: uploadedBytes!.byteLength,
      sortOrder: 0,
    });
  });

  test("compensates a metadata failure by deleting the sanitized object", async () => {
    const input = makeSyntheticPng();
    const deleted: string[] = [];

    await expect(
      ingestTrustedListingPhoto(
        {
          listingId,
          photoId,
          declaredMimeType: "image/png",
          bytes: input,
          sortOrder: 1,
        },
        {
          async uploadSanitizedObject() {},
          async insertPhotoMetadata() {
            throw new Error("synthetic metadata failure");
          },
          async deleteObject(objectPath) {
            deleted.push(objectPath);
          },
        },
      ),
    ).rejects.toMatchObject({
      name: "TrustedListingPhotoIngestionError",
      stage: "METADATA_PERSIST_FAILED",
      orphanedObjectPath: null,
    });

    expect(deleted).toEqual([`listings/${listingId}/${photoId}.webp`]);
  });

  test("reports the exact orphan path if compensating cleanup also fails", async () => {
    const input = makeSyntheticPng();

    try {
      await ingestTrustedListingPhoto(
        {
          listingId,
          photoId,
          declaredMimeType: "image/png",
          bytes: input,
          sortOrder: 2,
        },
        {
          async uploadSanitizedObject() {},
          async insertPhotoMetadata() {
            throw new Error("synthetic metadata failure");
          },
          async deleteObject() {
            throw new Error("synthetic cleanup failure");
          },
        },
      );
      throw new Error("Expected trusted ingestion to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(TrustedListingPhotoIngestionError);
      expect(error).toMatchObject({
        stage: "COMPENSATING_DELETE_FAILED",
        orphanedObjectPath: `listings/${listingId}/${photoId}.webp`,
      });
    }
  });

  test("fails closed before signing when metadata does not match the canonical sanitized contract", async () => {
    let signed = false;
    const url = await createActiveListingPhotoSignedUrl(
      { listingId, photoId },
      {
        async getDeliverablePhoto() {
          return makeMetadata({ objectPath: `listings/${listingId}/${photoId}.jpg` });
        },
        async createSignedUrl() {
          signed = true;
          return "https://example.invalid/signed";
        },
      },
    );

    expect(url).toBeNull();
    expect(signed).toBe(false);
  });

  test("keeps signed photo delivery within the five-minute conservative TTL contract", async () => {
    await expect(
      createActiveListingPhotoSignedUrl(
        {
          listingId,
          photoId,
          expiresInSeconds: LISTING_PHOTO_SIGNED_URL_MAX_SECONDS + 1,
        },
        {
          async getDeliverablePhoto() {
            return makeMetadata();
          },
          async createSignedUrl() {
            return "https://example.invalid/signed";
          },
        },
      ),
    ).rejects.toThrow(/between 1 and 300 seconds/);
  });
});
