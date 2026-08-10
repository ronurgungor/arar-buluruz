import { deflateSync } from "node:zlib";
import {
  LISTING_PHOTO_MAX_BYTES,
  LISTING_PHOTO_MAX_PIXELS,
  buildListingPhotoObjectPath,
  sanitizeListingPhoto,
  validateListingPhotoContentSignature,
} from "../src/lib/listing-photo";
import {
  createActiveListingPhotoSignedUrl,
  ingestTrustedListingPhoto,
  type StoredListingPhotoMetadata,
  type TrustedListingPhotoDeliveryStore,
  type TrustedListingPhotoIngestionStore,
} from "../src/lib/listing-photo-trusted";

const apiUrl = process.env.LOCAL_SUPABASE_URL?.trim();
const anonKey = process.env.LOCAL_SUPABASE_ANON_KEY?.trim();
const serviceRoleKey = process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!apiUrl || !anonKey || !serviceRoleKey) {
  throw new Error("Local Supabase URL, anon key and service-role key are required.");
}

const baseUrl = apiUrl.replace(/\/+$/, "");
const storageBase = `${baseUrl}/storage/v1`;
const listingId = "30000000-0000-4000-8000-000000000001";
const photoId = "40000000-0000-4000-8000-000000000001";
const anonProbePhotoId = "40000000-0000-4000-8000-000000000002";
const invalidMimePhotoId = "40000000-0000-4000-8000-000000000003";
const oversizePhotoId = "40000000-0000-4000-8000-000000000004";
const sellerContactE164 = "+12025550123";
const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

type TestImagePipeline = {
  jpeg(options: { quality: number }): TestImagePipeline;
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
  if (!runtime?.Image) throw new Error("Bun.Image is required for the local photo integration.");
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

  const rgbaScanline = new Uint8Array([0, 0x12, 0x34, 0x56, 0xff]);
  return concatBytes(
    PNG_SIGNATURE,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", new Uint8Array(deflateSync(rgbaScanline))),
    pngChunk("IEND", new Uint8Array()),
  );
}

async function makeSyntheticJpeg(): Promise<Uint8Array> {
  const ImageDecoder = getTestImageConstructor();
  return await new ImageDecoder(makeSyntheticPng(), {
    maxPixels: LISTING_PHOTO_MAX_PIXELS,
  })
    .jpeg({ quality: 90 })
    .bytes();
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

async function readBody(response: Response): Promise<string> {
  return await response.text().catch(() => "");
}

async function requireOk(response: Response, context: string): Promise<Response> {
  if (!response.ok) {
    throw new Error(`${context} failed with ${response.status}: ${await readBody(response)}`);
  }
  return response;
}

async function requireRejected(response: Response, context: string): Promise<void> {
  if (response.ok) {
    throw new Error(`${context} unexpectedly succeeded.`);
  }
}

async function expectNoDeliverablePhoto(context: string): Promise<void> {
  const signedUrl = await createActiveListingPhotoSignedUrl(
    { listingId, photoId, expiresInSeconds: 60 },
    deliveryStore,
  );
  if (signedUrl !== null) {
    throw new Error(`${context} unexpectedly produced a signed photo URL.`);
  }
}

const syntheticJpeg = await makeSyntheticJpeg();
if (validateListingPhotoContentSignature("image/jpeg", syntheticJpeg) !== null) {
  throw new Error("Synthetic generated JPEG failed the application signature check.");
}
const sanitizedAnonProbe = await sanitizeListingPhoto("image/jpeg", syntheticJpeg);

const pendingInsert = await fetch(`${baseUrl}/rest/v1/listings`, {
  method: "POST",
  headers: {
    ...apiHeaders(serviceRoleKey),
    Prefer: "return=representation",
  },
  body: JSON.stringify({
    id: listingId,
    title: "Synthetic service-role pilot listing",
    description: "Synthetic fixture proving the trusted operational write path before real data.",
    price_amount: 2500,
    province: "Tekirdag",
    district: "Corlu",
    seller_display_name: "Synthetic Seller",
    search_keywords: ["synthetic", "pilot"],
    contact_channel: "whatsapp",
    contact_e164: sellerContactE164,
    status: "pending",
  }),
});
await requireOk(pendingInsert, "service-role pending listing insert");

const hiddenPending = await fetch(
  `${baseUrl}/rest/v1/listings?id=eq.${listingId}&select=id,title`,
  { headers: apiHeaders(anonKey) },
);
await requireOk(hiddenPending, "anonymous pending-listing read");
if (((await hiddenPending.json()) as unknown[]).length !== 0) {
  throw new Error("Anonymous Data API exposed the pending synthetic listing.");
}

const outOfScopeInsert = await fetch(`${baseUrl}/rest/v1/listings`, {
  method: "POST",
  headers: apiHeaders(serviceRoleKey),
  body: JSON.stringify({
    title: "Synthetic out-of-scope listing",
    description: "Synthetic location fixture that must be rejected by the Corlu pilot lock.",
    price_amount: 1,
    province: "İstanbul",
    district: "Kadıköy",
    seller_display_name: "Synthetic Seller",
    status: "pending",
  }),
});
await requireRejected(outOfScopeInsert, "out-of-scope location insert");

const privateSchemaProbe = await fetch(`${baseUrl}/rest/v1/listing_photos`, {
  headers: {
    ...apiHeaders(serviceRoleKey),
    "Accept-Profile": "private",
  },
});
await requireRejected(privateSchemaProbe, "private schema Data API probe");

const anonMetadataProbe = await fetch(`${baseUrl}/rest/v1/rpc/get_deliverable_listing_photo`, {
  method: "POST",
  headers: apiHeaders(anonKey),
  body: JSON.stringify({ p_listing_id: listingId, p_photo_id: photoId }),
});
await requireRejected(anonMetadataProbe, "anonymous private photo metadata RPC");

const anonRegisterProbe = await fetch(`${baseUrl}/rest/v1/rpc/register_sanitized_listing_photo`, {
  method: "POST",
  headers: apiHeaders(anonKey),
  body: JSON.stringify({
    p_listing_id: listingId,
    p_photo_id: anonProbePhotoId,
    p_object_path: buildListingPhotoObjectPath(listingId, anonProbePhotoId, "image/webp"),
    p_byte_size: sanitizedAnonProbe.bytes.byteLength,
    p_sort_order: 1,
  }),
});
await requireRejected(anonRegisterProbe, "anonymous private photo metadata registration");

const invalidPathRegisterProbe = await fetch(
  `${baseUrl}/rest/v1/rpc/register_sanitized_listing_photo`,
  {
    method: "POST",
    headers: apiHeaders(serviceRoleKey),
    body: JSON.stringify({
      p_listing_id: listingId,
      p_photo_id: invalidMimePhotoId,
      p_object_path: buildListingPhotoObjectPath(listingId, invalidMimePhotoId, "image/jpeg"),
      p_byte_size: sanitizedAnonProbe.bytes.byteLength,
      p_sort_order: 1,
    }),
  },
);
await requireRejected(
  invalidPathRegisterProbe,
  "service-role invalid sanitized photo metadata path",
);

const invalidByteSizeRegisterProbe = await fetch(
  `${baseUrl}/rest/v1/rpc/register_sanitized_listing_photo`,
  {
    method: "POST",
    headers: apiHeaders(serviceRoleKey),
    body: JSON.stringify({
      p_listing_id: listingId,
      p_photo_id: oversizePhotoId,
      p_object_path: buildListingPhotoObjectPath(listingId, oversizePhotoId, "image/webp"),
      p_byte_size: LISTING_PHOTO_MAX_BYTES + 1,
      p_sort_order: 2,
    }),
  },
);
await requireRejected(
  invalidByteSizeRegisterProbe,
  "service-role invalid sanitized photo metadata byte size",
);

const anonProbePath = buildListingPhotoObjectPath(listingId, anonProbePhotoId, "image/webp");
const anonUpload = await fetch(
  `${storageBase}/object/listing_photos/${encodeObjectPath(anonProbePath)}`,
  {
    method: "POST",
    headers: {
      ...apiHeaders(anonKey, "image/webp"),
      "x-upsert": "false",
    },
    body: sanitizedAnonProbe.bytes,
  },
);
await requireRejected(anonUpload, "anonymous Storage upload");

let uploadedSanitizedBytes: Uint8Array | null = null;

const ingestionStore: TrustedListingPhotoIngestionStore = {
  async uploadSanitizedObject(upload) {
    if (upload.mimeType !== "image/webp") {
      throw new Error(`Trusted uploader received unexpected MIME ${upload.mimeType}.`);
    }
    if (validateListingPhotoContentSignature("image/webp", upload.bytes) !== null) {
      throw new Error("Trusted uploader received non-WebP sanitized bytes.");
    }

    await requireOk(
      await fetch(`${storageBase}/object/listing_photos/${encodeObjectPath(upload.objectPath)}`, {
        method: "POST",
        headers: {
          ...apiHeaders(serviceRoleKey, upload.mimeType),
          "cache-control": "max-age=60",
          "x-upsert": "false",
        },
        body: upload.bytes,
      }),
      "trusted sanitized WebP Storage upload",
    );
    uploadedSanitizedBytes = upload.bytes.slice();
  },

  async insertPhotoMetadata(metadata) {
    await requireOk(
      await fetch(`${baseUrl}/rest/v1/rpc/register_sanitized_listing_photo`, {
        method: "POST",
        headers: apiHeaders(serviceRoleKey),
        body: JSON.stringify({
          p_listing_id: metadata.listingId,
          p_photo_id: metadata.photoId,
          p_object_path: metadata.objectPath,
          p_byte_size: metadata.byteSize,
          p_sort_order: metadata.sortOrder,
        }),
      }),
      "service-role sanitized photo metadata registration",
    );
  },

  async deleteObject(objectPath) {
    await requireOk(
      await fetch(`${storageBase}/object/listing_photos`, {
        method: "DELETE",
        headers: apiHeaders(serviceRoleKey),
        body: JSON.stringify({ prefixes: [objectPath] }),
      }),
      "trusted compensating Storage cleanup",
    );
  },
};

const deliveryStore: TrustedListingPhotoDeliveryStore = {
  async getDeliverablePhoto(requestListingId, requestPhotoId) {
    const response = await requireOk(
      await fetch(`${baseUrl}/rest/v1/rpc/get_deliverable_listing_photo`, {
        method: "POST",
        headers: apiHeaders(serviceRoleKey),
        body: JSON.stringify({
          p_listing_id: requestListingId,
          p_photo_id: requestPhotoId,
        }),
      }),
      "service-role photo delivery metadata lookup",
    );
    const rows = (await response.json()) as Array<{
      listing_id: string;
      photo_id: string;
      object_path: string;
      mime_type: string;
      byte_size: number;
      sort_order: number;
    }>;
    const row = rows[0];
    if (!row) return null;
    if (rows.length !== 1 || row.mime_type !== "image/webp") {
      throw new Error(`Unexpected trusted photo metadata rows: ${JSON.stringify(rows)}`);
    }

    return {
      listingId: row.listing_id,
      photoId: row.photo_id,
      objectPath: row.object_path,
      mimeType: "image/webp",
      byteSize: Number(row.byte_size),
      sortOrder: Number(row.sort_order),
    } satisfies StoredListingPhotoMetadata;
  },

  async createSignedUrl(objectPath, expiresInSeconds) {
    const response = await requireOk(
      await fetch(`${storageBase}/object/sign/listing_photos/${encodeObjectPath(objectPath)}`, {
        method: "POST",
        headers: apiHeaders(serviceRoleKey),
        body: JSON.stringify({ expiresIn: expiresInSeconds }),
      }),
      "trusted signed-URL creation",
    );
    const payload = (await response.json()) as {
      signedURL?: string;
      signedUrl?: string;
    };
    const signedPath = payload.signedURL ?? payload.signedUrl;
    if (!signedPath) throw new Error("Storage did not return a signed URL.");
    return signedPath.startsWith("http") ? signedPath : `${storageBase}${signedPath}`;
  },
};

const storedMetadata = await ingestTrustedListingPhoto(
  {
    listingId,
    photoId,
    declaredMimeType: "image/jpeg",
    bytes: syntheticJpeg,
    sortOrder: 0,
  },
  ingestionStore,
);

if (storedMetadata.mimeType !== "image/webp" || !storedMetadata.objectPath.endsWith(".webp")) {
  throw new Error(
    `Trusted ingestion did not canonicalize Storage metadata: ${JSON.stringify(storedMetadata)}`,
  );
}
if (!uploadedSanitizedBytes || storedMetadata.byteSize !== uploadedSanitizedBytes.byteLength) {
  throw new Error("Trusted ingestion metadata byte size does not match the sanitized upload.");
}
if (validateListingPhotoContentSignature("image/webp", uploadedSanitizedBytes) !== null) {
  throw new Error("Trusted ingestion did not upload canonical WebP bytes.");
}

const originalJpegPath = buildListingPhotoObjectPath(listingId, photoId, "image/jpeg");
await requireRejected(
  await fetch(`${storageBase}/object/listing_photos/${encodeObjectPath(originalJpegPath)}`, {
    headers: apiHeaders(serviceRoleKey, "application/octet-stream"),
  }),
  "original unsanitized JPEG Storage existence probe",
);

await expectNoDeliverablePhoto("pending listing");

await requireOk(
  await fetch(`${baseUrl}/rest/v1/listings?id=eq.${listingId}`, {
    method: "PATCH",
    headers: apiHeaders(serviceRoleKey),
    body: JSON.stringify({ status: "rejected" }),
  }),
  "service-role listing rejection",
);
await expectNoDeliverablePhoto("rejected listing");

await requireOk(
  await fetch(`${baseUrl}/rest/v1/listings?id=eq.${listingId}`, {
    method: "PATCH",
    headers: apiHeaders(serviceRoleKey),
    body: JSON.stringify({ status: "pending" }),
  }),
  "service-role listing return to pending for synthetic lifecycle proof",
);

const now = new Date();
const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000);
await requireOk(
  await fetch(`${baseUrl}/rest/v1/listings?id=eq.${listingId}`, {
    method: "PATCH",
    headers: {
      ...apiHeaders(serviceRoleKey),
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      contact_verified_at: new Date(now.getTime() - 2 * 60 * 1000).toISOString(),
      contact_verification_method: "whatsapp_same_number",
      publication_instruction_at: new Date(now.getTime() - 60 * 1000).toISOString(),
      status: "published",
      published_at: now.toISOString(),
      expires_at: expires.toISOString(),
    }),
  }),
  "service-role listing publication",
);

const visiblePublished = await fetch(
  `${baseUrl}/rest/v1/listings?id=eq.${listingId}&select=id,title,province,district,contact_channel,contact_e164`,
  { headers: apiHeaders(anonKey) },
);
await requireOk(visiblePublished, "anonymous active-listing read");
const publishedRows = (await visiblePublished.json()) as Array<{
  id: string;
  province: string;
  district: string;
  contact_channel: string;
  contact_e164: string;
}>;
if (
  publishedRows.length !== 1 ||
  publishedRows[0]?.id !== listingId ||
  publishedRows[0]?.province !== "Tekirdağ" ||
  publishedRows[0]?.district !== "Çorlu" ||
  publishedRows[0]?.contact_channel !== "whatsapp" ||
  publishedRows[0]?.contact_e164 !== sellerContactE164
) {
  throw new Error(`Unexpected public published row: ${JSON.stringify(publishedRows)}`);
}

const deliverableMetadata = await deliveryStore.getDeliverablePhoto(listingId, photoId);
if (
  !deliverableMetadata ||
  JSON.stringify(deliverableMetadata) !== JSON.stringify(storedMetadata)
) {
  throw new Error(
    `Delivery metadata does not match trusted ingestion metadata: ${JSON.stringify(deliverableMetadata)}`,
  );
}

const signedReadUrl = await createActiveListingPhotoSignedUrl(
  { listingId, photoId, expiresInSeconds: 60 },
  deliveryStore,
);
if (!signedReadUrl) throw new Error("Active published listing did not produce a signed photo URL.");
const signedRead = await requireOk(
  await fetch(signedReadUrl),
  "active signed sanitized photo read",
);
const signedBytes = new Uint8Array(await signedRead.arrayBuffer());
if (validateListingPhotoContentSignature("image/webp", signedBytes) !== null) {
  throw new Error("Signed delivery did not return canonical WebP bytes.");
}
if (signedBytes.byteLength !== storedMetadata.byteSize) {
  throw new Error("Signed delivered object size does not match private metadata.");
}
if (Array.from(signedBytes).join(",") !== Array.from(uploadedSanitizedBytes).join(",")) {
  throw new Error(
    "Signed delivered object does not match the sanitized bytes uploaded by the trusted path.",
  );
}

await requireRejected(
  await fetch(
    `${storageBase}/object/listing_photos/${encodeObjectPath(storedMetadata.objectPath)}`,
    {
      headers: apiHeaders(anonKey, "application/octet-stream"),
    },
  ),
  "anonymous private-bucket read",
);

await requireOk(
  await fetch(`${baseUrl}/rest/v1/listings?id=eq.${listingId}`, {
    method: "PATCH",
    headers: apiHeaders(serviceRoleKey),
    body: JSON.stringify({
      status: "unpublished",
      unpublished_at: new Date().toISOString(),
    }),
  }),
  "service-role listing unpublication",
);
await expectNoDeliverablePhoto("unpublished listing");

await requireOk(
  await fetch(`${baseUrl}/rest/v1/listings?id=eq.${listingId}`, {
    method: "PATCH",
    headers: apiHeaders(serviceRoleKey),
    body: JSON.stringify({
      status: "published",
      published_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      expires_at: new Date(Date.now() - 60 * 1000).toISOString(),
      unpublished_at: null,
    }),
  }),
  "service-role synthetic expiration setup",
);
await expectNoDeliverablePhoto("expired listing");

const invalidMimePath = buildListingPhotoObjectPath(listingId, invalidMimePhotoId, "image/webp");
await requireRejected(
  await fetch(`${storageBase}/object/listing_photos/${encodeObjectPath(invalidMimePath)}`, {
    method: "POST",
    headers: {
      ...apiHeaders(serviceRoleKey, "application/javascript"),
      "x-upsert": "false",
    },
    body: new TextEncoder().encode("alert('synthetic')"),
  }),
  "disallowed Storage MIME upload",
);

const oversizePath = buildListingPhotoObjectPath(listingId, oversizePhotoId, "image/webp");
await requireRejected(
  await fetch(`${storageBase}/object/listing_photos/${encodeObjectPath(oversizePath)}`, {
    method: "POST",
    headers: {
      ...apiHeaders(serviceRoleKey, "image/webp"),
      "x-upsert": "false",
    },
    body: new Uint8Array(LISTING_PHOTO_MAX_BYTES + 1),
  }),
  "oversize Storage upload",
);

await requireOk(
  await fetch(`${storageBase}/object/listing_photos`, {
    method: "DELETE",
    headers: apiHeaders(serviceRoleKey),
    body: JSON.stringify({ prefixes: [storedMetadata.objectPath] }),
  }),
  "trusted Storage cleanup",
);

console.log(
  "Real Corlu trusted photo pipeline passed with synthetic local fixtures only: sanitize -> WebP -> private Storage -> private metadata -> lifecycle-gated signed delivery.",
);
