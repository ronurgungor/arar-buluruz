import { createHash } from "node:crypto";
import { deflateSync } from "node:zlib";
import {
  LISTING_PHOTO_MAX_PIXELS,
  buildListingPhotoObjectPath,
  sanitizeListingPhoto,
  validateListingPhotoContentSignature,
} from "../src/lib/listing-photo";
import { fetchPublicListing } from "../src/lib/public-listings";

const mode = process.argv[2];
if (mode !== "seed" && mode !== "verify") {
  throw new Error("Usage: bun scripts/migration-photo-fixture.ts {seed|verify}");
}

const apiUrl = process.env.MIGRATION_SUPABASE_URL?.trim();
const anonKey = process.env.MIGRATION_SUPABASE_ANON_KEY?.trim();
const serviceRoleKey = process.env.MIGRATION_SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!apiUrl || !anonKey || !serviceRoleKey) {
  throw new Error("Migration Supabase URL, anon key and service-role key are required.");
}

const baseUrl = apiUrl.replace(/\/+$/, "");
const storageBase = `${baseUrl}/storage/v1`;
const listingId = "93000000-0000-4000-8000-000000000001";
const photoId = "94000000-0000-4000-8000-000000000001";
const contactE164 = "+12025550141";
const objectPath = buildListingPhotoObjectPath(listingId, photoId, "image/webp");
const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

type TestImagePipeline = {
  webp(options: { quality: number }): TestImagePipeline;
  bytes(): Promise<Uint8Array>;
};

type TestImageConstructor = new (
  input: Uint8Array,
  options?: { maxPixels?: number },
) => TestImagePipeline;

function getTestImageConstructor(): TestImageConstructor {
  const runtime = (
    globalThis as typeof globalThis & {
      Bun?: { Image?: TestImageConstructor };
    }
  ).Bun;
  if (!runtime?.Image) throw new Error("Bun.Image is required for migration photo verification.");
  return runtime.Image;
}

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

function apiHeaders(key: string, contentType = "application/json") {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "content-type": contentType,
  };
}

function encodeObjectPath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function requireOk(response: Response, context: string): Promise<Response> {
  if (!response.ok) {
    throw new Error(`${context} failed with ${response.status}: ${await response.text()}`);
  }
  return response;
}

async function requireRejected(response: Response, context: string): Promise<void> {
  if (response.ok) {
    throw new Error(`${context} unexpectedly succeeded.`);
  }
}

const sanitized = await sanitizeListingPhoto("image/png", makeSyntheticPng());
if (sanitized.mimeType !== "image/webp") {
  throw new Error(`Migration fixture was not canonical WebP: ${sanitized.mimeType}`);
}
if (validateListingPhotoContentSignature("image/webp", sanitized.bytes) !== null) {
  throw new Error("Migration fixture canonical WebP signature validation failed.");
}
const expectedSha256 = createHash("sha256").update(sanitized.bytes).digest("hex");

if (mode === "seed") {
  await requireOk(
    await fetch(`${baseUrl}/rest/v1/listings`, {
      method: "POST",
      headers: {
        ...apiHeaders(serviceRoleKey),
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        id: listingId,
        title: "Sentetik migration fotoğraf ilanı",
        description: "Managed-to-self-host DB ve Storage restore doğrulaması için sentetik ilan.",
        price_amount: 100,
        province: "Tekirdağ",
        district: "Çorlu",
        seller_display_name: "Sentetik Satıcı",
        search_keywords: ["sentetik", "migration", "fotoğraf"],
        contact_channel: "whatsapp",
        contact_e164: contactE164,
        status: "pending",
      }),
    }),
    "migration fixture listing insert",
  );

  await requireOk(
    await fetch(`${storageBase}/object/listing_photos/${encodeObjectPath(objectPath)}`, {
      method: "POST",
      headers: {
        ...apiHeaders(serviceRoleKey, "image/webp"),
        "x-upsert": "false",
      },
      body: sanitized.bytes,
    }),
    "migration fixture Storage upload",
  );

  await requireOk(
    await fetch(`${baseUrl}/rest/v1/rpc/register_sanitized_listing_photo`, {
      method: "POST",
      headers: apiHeaders(serviceRoleKey),
      body: JSON.stringify({
        p_listing_id: listingId,
        p_photo_id: photoId,
        p_object_path: objectPath,
        p_byte_size: sanitized.bytes.byteLength,
        p_sort_order: 0,
      }),
    }),
    "migration fixture private photo metadata registration",
  );

  const hiddenManifest = await requireOk(
    await fetch(`${baseUrl}/rest/v1/rpc/get_public_listing_photos`, {
      method: "POST",
      headers: apiHeaders(anonKey),
      body: JSON.stringify({ p_listing_id: listingId }),
    }),
    "pending public photo manifest probe",
  );
  if (((await hiddenManifest.json()) as unknown[]).length !== 0) {
    throw new Error("Pending migration fixture exposed a public photo manifest.");
  }

  await requireRejected(
    await fetch(`${storageBase}/object/sign/listing_photos/${encodeObjectPath(objectPath)}`, {
      method: "POST",
      headers: apiHeaders(anonKey),
      body: JSON.stringify({ expiresIn: 60 }),
    }),
    "pending anonymous photo signing",
  );

  const now = Date.now();
  await requireOk(
    await fetch(`${baseUrl}/rest/v1/listings?id=eq.${listingId}`, {
      method: "PATCH",
      headers: apiHeaders(serviceRoleKey),
      body: JSON.stringify({
        contact_verified_at: new Date(now - 120_000).toISOString(),
        contact_verification_method: "whatsapp_same_number",
        publication_instruction_at: new Date(now - 60_000).toISOString(),
        status: "published",
        published_at: new Date(now).toISOString(),
        expires_at: new Date(now + 86_400_000).toISOString(),
      }),
    }),
    "migration fixture publication",
  );
}

const publicListing = await fetchPublicListing(listingId, {
  url: baseUrl,
  publicKey: anonKey,
});
if (!publicListing || publicListing.id !== listingId) {
  throw new Error("Migration fixture is not readable through the public application adapter.");
}
if (publicListing.publicContact?.e164 !== contactE164) {
  throw new Error("Migration fixture public contact did not survive the application read path.");
}
if (publicListing.photos.length !== 1) {
  throw new Error(`Expected one public signed photo URL, got ${publicListing.photos.length}.`);
}

const signedRead = await requireOk(
  await fetch(publicListing.photos[0]!),
  "migration fixture signed public photo read",
);
const restoredBytes = new Uint8Array(await signedRead.arrayBuffer());
const restoredSha256 = createHash("sha256").update(restoredBytes).digest("hex");
if (restoredSha256 !== expectedSha256 || restoredBytes.byteLength !== sanitized.bytes.byteLength) {
  throw new Error(
    `Migration fixture photo mismatch: expected ${expectedSha256}/${sanitized.bytes.byteLength}, got ${restoredSha256}/${restoredBytes.byteLength}.`,
  );
}

await requireRejected(
  await fetch(
    `${storageBase}/object/authenticated/listing_photos/${encodeObjectPath(objectPath)}`,
    {
      headers: apiHeaders(anonKey, "application/octet-stream"),
    },
  ),
  "anonymous direct private-object read",
);
await requireRejected(
  await fetch(`${storageBase}/object/list/listing_photos`, {
    method: "POST",
    headers: apiHeaders(anonKey),
    body: JSON.stringify({ prefix: `listings/${listingId}`, limit: 100, offset: 0 }),
  }),
  "anonymous private-bucket listing",
);

console.log(
  `Migration photo fixture ${mode} verification passed: app adapter + signed private Storage + SHA-256 ${expectedSha256}.`,
);
