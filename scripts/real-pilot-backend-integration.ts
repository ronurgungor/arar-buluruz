import {
  buildListingPhotoObjectPath,
  LISTING_PHOTO_MAX_BYTES,
  validateListingPhotoContentSignature,
} from "../src/lib/listing-photo";

const apiUrl = process.env.LOCAL_SUPABASE_URL?.trim();
const anonKey = process.env.LOCAL_SUPABASE_ANON_KEY?.trim();
const serviceRoleKey = process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!apiUrl || !anonKey || !serviceRoleKey) {
  throw new Error("Local Supabase URL, anon key and service-role key are required.");
}

const baseUrl = apiUrl.replace(/\/+$/, "");
const listingId = "30000000-0000-4000-8000-000000000001";
const photoId = "40000000-0000-4000-8000-000000000001";
const validPhotoPath = buildListingPhotoObjectPath(listingId, photoId, "image/jpeg");
const syntheticJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
if (validateListingPhotoContentSignature("image/jpeg", syntheticJpeg) !== null) {
  throw new Error("Synthetic trusted-upload fixture failed the application signature check.");
}

function apiHeaders(key: string, contentType = "application/json") {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "content-type": contentType,
  };
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
    status: "pending",
  }),
});
await requireOk(pendingInsert, "service-role pending listing insert");

const hiddenPending = await fetch(`${baseUrl}/rest/v1/listings?id=eq.${listingId}&select=id,title`, {
  headers: apiHeaders(anonKey),
});
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

const now = new Date();
const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000);
const publishResponse = await fetch(`${baseUrl}/rest/v1/listings?id=eq.${listingId}`, {
  method: "PATCH",
  headers: {
    ...apiHeaders(serviceRoleKey),
    Prefer: "return=representation",
  },
  body: JSON.stringify({
    status: "published",
    published_at: now.toISOString(),
    expires_at: expires.toISOString(),
  }),
});
await requireOk(publishResponse, "service-role listing publication");

const visiblePublished = await fetch(
  `${baseUrl}/rest/v1/listings?id=eq.${listingId}&select=id,title,province,district`,
  { headers: apiHeaders(anonKey) },
);
await requireOk(visiblePublished, "anonymous active-listing read");
const publishedRows = (await visiblePublished.json()) as Array<{
  id: string;
  province: string;
  district: string;
}>;
if (
  publishedRows.length !== 1 ||
  publishedRows[0]?.id !== listingId ||
  publishedRows[0]?.province !== "Tekirdağ" ||
  publishedRows[0]?.district !== "Çorlu"
) {
  throw new Error(`Unexpected public published row: ${JSON.stringify(publishedRows)}`);
}

const privateSchemaProbe = await fetch(`${baseUrl}/rest/v1/listing_contacts`, {
  headers: {
    ...apiHeaders(serviceRoleKey),
    "Accept-Profile": "private",
  },
});
await requireRejected(privateSchemaProbe, "private schema Data API probe");

const storageBase = `${baseUrl}/storage/v1`;
const encodedPhotoPath = validPhotoPath.split("/").map(encodeURIComponent).join("/");

const anonUpload = await fetch(`${storageBase}/object/listing_photos/${encodedPhotoPath}`, {
  method: "POST",
  headers: {
    ...apiHeaders(anonKey, "image/jpeg"),
    "x-upsert": "false",
  },
  body: syntheticJpeg,
});
await requireRejected(anonUpload, "anonymous Storage upload");

const validUpload = await fetch(`${storageBase}/object/listing_photos/${encodedPhotoPath}`, {
  method: "POST",
  headers: {
    ...apiHeaders(serviceRoleKey, "image/jpeg"),
    "cache-control": "max-age=60",
    "x-upsert": "false",
  },
  body: syntheticJpeg,
});
await requireOk(validUpload, "trusted JPEG Storage upload");

const invalidMimePath = buildListingPhotoObjectPath(
  listingId,
  "40000000-0000-4000-8000-000000000002",
  "image/jpeg",
);
const invalidMimeUpload = await fetch(
  `${storageBase}/object/listing_photos/${invalidMimePath.split("/").map(encodeURIComponent).join("/")}`,
  {
    method: "POST",
    headers: {
      ...apiHeaders(serviceRoleKey, "application/javascript"),
      "x-upsert": "false",
    },
    body: new TextEncoder().encode("alert('synthetic')"),
  },
);
await requireRejected(invalidMimeUpload, "disallowed Storage MIME upload");

const oversizePath = buildListingPhotoObjectPath(
  listingId,
  "40000000-0000-4000-8000-000000000003",
  "image/jpeg",
);
const oversizeUpload = await fetch(
  `${storageBase}/object/listing_photos/${oversizePath.split("/").map(encodeURIComponent).join("/")}`,
  {
    method: "POST",
    headers: {
      ...apiHeaders(serviceRoleKey, "image/jpeg"),
      "x-upsert": "false",
    },
    body: new Uint8Array(LISTING_PHOTO_MAX_BYTES + 1),
  },
);
await requireRejected(oversizeUpload, "oversize Storage upload");

const anonPrivateRead = await fetch(`${storageBase}/object/listing_photos/${encodedPhotoPath}`, {
  headers: apiHeaders(anonKey, "application/octet-stream"),
});
await requireRejected(anonPrivateRead, "anonymous private-bucket read");

const signedUrlResponse = await fetch(`${storageBase}/object/sign/listing_photos/${encodedPhotoPath}`, {
  method: "POST",
  headers: apiHeaders(serviceRoleKey),
  body: JSON.stringify({ expiresIn: 60 }),
});
await requireOk(signedUrlResponse, "trusted signed-URL creation");
const signedPayload = (await signedUrlResponse.json()) as { signedURL?: string; signedUrl?: string };
const signedPath = signedPayload.signedURL ?? signedPayload.signedUrl;
if (!signedPath) throw new Error("Storage did not return a signed URL.");

const signedReadUrl = signedPath.startsWith("http") ? signedPath : `${storageBase}${signedPath}`;
await requireOk(await fetch(signedReadUrl), "unauthenticated short-lived signed photo read");

const cleanupResponse = await fetch(`${storageBase}/object/listing_photos`, {
  method: "DELETE",
  headers: apiHeaders(serviceRoleKey),
  body: JSON.stringify({ prefixes: [validPhotoPath] }),
});
await requireOk(cleanupResponse, "trusted Storage cleanup");

console.log("Real Corlu pilot backend integration passed with synthetic fixtures only.");
