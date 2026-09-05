const apiUrl = process.env.LOCAL_SUPABASE_URL?.trim();
const anonKey = process.env.LOCAL_SUPABASE_ANON_KEY?.trim();
const serviceRoleKey = process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!apiUrl || !anonKey || !serviceRoleKey) {
  throw new Error("Local Supabase URL, anon key and service-role key are required.");
}

const baseUrl = apiUrl.replace(/\/+$/, "");
const storageBase = `${baseUrl}/storage/v1`;
const listingId = "83000000-0000-4000-8000-000000000001";
const photoId = "84000000-0000-4000-8000-000000000001";
const objectPath = `listings/${listingId}/${photoId}.webp`;
const objectBytes = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x08, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);

function headers(key: string, contentType = "application/json"): HeadersInit {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "content-type": contentType,
  };
}

function encodeObjectPath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function responseBody(response: Response): Promise<string> {
  return await response.text().catch(() => "");
}

async function requireOk(response: Response, context: string): Promise<Response> {
  if (!response.ok) {
    throw new Error(`${context} failed with ${response.status}: ${await responseBody(response)}`);
  }
  return response;
}

async function requireRejected(response: Response, context: string): Promise<void> {
  if (response.ok) {
    throw new Error(`${context} unexpectedly succeeded.`);
  }
}

async function cleanup(): Promise<void> {
  await fetch(`${storageBase}/object/listing_photos`, {
    method: "DELETE",
    headers: headers(serviceRoleKey),
    body: JSON.stringify({ prefixes: [objectPath] }),
  }).catch(() => undefined);
  await fetch(`${baseUrl}/rest/v1/listings?id=eq.${listingId}`, {
    method: "DELETE",
    headers: headers(serviceRoleKey),
  }).catch(() => undefined);
}

try {
  await cleanup();

  await requireOk(
    await fetch(`${baseUrl}/rest/v1/listings`, {
      method: "POST",
      headers: { ...headers(serviceRoleKey), Prefer: "return=representation" },
      body: JSON.stringify({
        id: listingId,
        title: "Synthetic anonymous Storage-sign denial fixture",
        description: "Synthetic local-only fixture for signed-photo security closure.",
        price_amount: 1,
        province: "Tekirdağ",
        district: "Çorlu",
        seller_display_name: "Synthetic Seller",
        contact_channel: "phone_whatsapp",
        contact_e164: "+12025550135",
        publication_instruction_at: new Date(Date.now() - 120_000).toISOString(),
        listing_rules_version: "synthetic-photo-security-v1",
        listing_rules_accepted_at: new Date(Date.now() - 60_000).toISOString(),
        status: "pending",
      }),
    }),
    "synthetic photo-access listing insert",
  );

  await requireOk(
    await fetch(`${storageBase}/object/listing_photos/${encodeObjectPath(objectPath)}`, {
      method: "POST",
      headers: {
        ...headers(serviceRoleKey, "image/webp"),
        "x-upsert": "false",
      },
      body: objectBytes,
    }),
    "service-role synthetic Storage object upload",
  );

  await requireOk(
    await fetch(`${baseUrl}/rest/v1/rpc/register_sanitized_listing_photo`, {
      method: "POST",
      headers: headers(serviceRoleKey),
      body: JSON.stringify({
        p_listing_id: listingId,
        p_photo_id: photoId,
        p_object_path: objectPath,
        p_byte_size: objectBytes.byteLength,
        p_sort_order: 0,
      }),
    }),
    "service-role synthetic photo metadata registration",
  );

  const now = new Date();
  await requireOk(
    await fetch(`${baseUrl}/rest/v1/listings?id=eq.${listingId}`, {
      method: "PATCH",
      headers: { ...headers(serviceRoleKey), Prefer: "return=representation" },
      body: JSON.stringify({
        status: "published",
        published_at: now.toISOString(),
        expires_at: new Date(now.getTime() + 86_400_000).toISOString(),
        unpublished_at: null,
      }),
    }),
    "synthetic photo-access listing publication",
  );

  const manifest = await requireOk(
    await fetch(`${baseUrl}/rest/v1/rpc/get_public_listing_photos`, {
      method: "POST",
      headers: headers(anonKey),
      body: JSON.stringify({ p_listing_id: listingId }),
    }),
    "anonymous active photo manifest",
  );
  const manifestRows = (await manifest.json()) as Array<{ photo_id?: string; object_path?: string }>;
  if (
    manifestRows.length !== 1 ||
    manifestRows[0]?.photo_id !== photoId ||
    manifestRows[0]?.object_path !== objectPath
  ) {
    throw new Error(`Unexpected public photo manifest: ${JSON.stringify(manifestRows)}`);
  }

  for (const expiresIn of [60, 86_400]) {
    await requireRejected(
      await fetch(`${storageBase}/object/sign/listing_photos/${encodeObjectPath(objectPath)}`, {
        method: "POST",
        headers: headers(anonKey),
        body: JSON.stringify({ expiresIn }),
      }),
      `anonymous direct Storage signing with ${expiresIn}s TTL`,
    );
  }

  await requireRejected(
    await fetch(`${storageBase}/object/listing_photos/${encodeObjectPath(objectPath)}`, {
      headers: headers(anonKey, "application/octet-stream"),
    }),
    "anonymous private Storage object read",
  );

  await requireRejected(
    await fetch(`${storageBase}/object/list/listing_photos`, {
      method: "POST",
      headers: headers(anonKey),
      body: JSON.stringify({
        prefix: "",
        limit: 100,
        offset: 0,
        sortBy: { column: "name", order: "asc" },
      }),
    }),
    "anonymous Storage object listing",
  );

  await requireRejected(
    await fetch(`${storageBase}/bucket`, { headers: headers(anonKey) }),
    "anonymous Storage bucket listing",
  );

  console.log(
    "Public photo Storage access probe passed: active manifest remains public while direct anon sign/read/object-list/bucket-list are denied, including long-TTL signing attempts.",
  );
} finally {
  await cleanup();
}
