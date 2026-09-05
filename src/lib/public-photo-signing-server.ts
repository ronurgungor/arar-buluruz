import {
  LISTING_PHOTO_SIGNED_URL_DEFAULT_SECONDS,
  createActiveListingPhotoSignedUrl,
  type StoredListingPhotoMetadata,
  type TrustedListingPhotoDeliveryStore,
} from "./listing-photo-trusted";

const LISTING_PHOTO_BUCKET = "listing_photos";
const PUBLIC_PHOTO_PATH_PREFIX = "/api/listing-photo/";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TARLADAN_PROJECT_REFS = new Set(["jlbsoraqnlricbyagxdk", "gwgrwwvaiizfsqaacnhf"]);

export type PublicPhotoSigningBackendConfig = {
  baseUrl: string;
  serviceRoleKey: string;
};

type PublicPhotoSigningOptions = {
  config?: PublicPhotoSigningBackendConfig;
  fetchImpl?: typeof fetch;
};

function noStoreHeaders(contentType = "text/plain; charset=utf-8"): Record<string, string> {
  return {
    "Cache-Control": "no-store, max-age=0",
    "Content-Type": contentType,
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  };
}

function notFoundResponse(): Response {
  return new Response("Not found", { status: 404, headers: noStoreHeaders() });
}

function parsePhotoRequestPath(pathname: string): { listingId: string; photoId: string } | null {
  if (!pathname.startsWith(PUBLIC_PHOTO_PATH_PREFIX)) return null;
  const parts = pathname.slice(PUBLIC_PHOTO_PATH_PREFIX.length).split("/");
  if (parts.length !== 2) return { listingId: "", photoId: "" };
  const [listingId = "", photoId = ""] = parts;
  if (!UUID_PATTERN.test(listingId) || !UUID_PATTERN.test(photoId)) {
    return { listingId: "", photoId: "" };
  }
  return { listingId: listingId.toLowerCase(), photoId: photoId.toLowerCase() };
}

function validateBackendUrl(rawUrl: string): string {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Public photo backend URL is invalid.");
  }

  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(isLocal && url.protocol === "http:")) {
    throw new Error("Public photo backend must use HTTPS outside local development.");
  }
  for (const forbiddenRef of TARLADAN_PROJECT_REFS) {
    if (url.hostname.includes(forbiddenRef)) {
      throw new Error("Tarladan resources are outside the Arar Buluruz public photo boundary.");
    }
  }
  return url.toString().replace(/\/+$/, "");
}

function readBackendConfig(): PublicPhotoSigningBackendConfig {
  const rawUrl =
    process.env.PILOT_PUBLIC_PHOTO_SUPABASE_URL?.trim() ??
    process.env.PILOT_SUBMISSION_SUPABASE_URL?.trim() ??
    process.env.PILOT_OPERATOR_SUPABASE_URL?.trim();
  const serviceRoleKey =
    process.env.PILOT_PUBLIC_PHOTO_SUPABASE_SERVICE_ROLE_KEY?.trim() ??
    process.env.PILOT_SUBMISSION_SUPABASE_SERVICE_ROLE_KEY?.trim() ??
    process.env.PILOT_OPERATOR_SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!rawUrl || !serviceRoleKey) {
    throw new Error("Public photo signing backend is not configured.");
  }
  return { baseUrl: validateBackendUrl(rawUrl), serviceRoleKey };
}

function serviceHeaders(config: PublicPhotoSigningBackendConfig): HeadersInit {
  return {
    apikey: config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`,
    "content-type": "application/json",
  };
}

function encodeObjectPath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function requireOk(response: Response, context: string): Promise<Response> {
  if (!response.ok) {
    throw new Error(`${context} failed with HTTP ${response.status}.`);
  }
  return response;
}

function normalizeSignedUrl(
  rawSignedUrl: string,
  config: PublicPhotoSigningBackendConfig,
  objectPath: string,
): string {
  const baseUrl = new URL(config.baseUrl);
  const normalizedPath = rawSignedUrl.startsWith("/object/")
    ? `/storage/v1${rawSignedUrl}`
    : rawSignedUrl;
  const signedUrl = new URL(normalizedPath, baseUrl);
  if (signedUrl.origin !== baseUrl.origin) {
    throw new Error("Storage signing response changed backend origin.");
  }
  const expectedPath = `/storage/v1/object/sign/${LISTING_PHOTO_BUCKET}/${objectPath}`;
  if (decodeURIComponent(signedUrl.pathname) !== expectedPath) {
    throw new Error("Storage signing response changed the approved object path.");
  }
  return signedUrl.toString();
}

function createDeliveryStore(
  config: PublicPhotoSigningBackendConfig,
  fetchImpl: typeof fetch,
): TrustedListingPhotoDeliveryStore {
  return {
    async getDeliverablePhoto(listingId, photoId) {
      const response = await requireOk(
        await fetchImpl(`${config.baseUrl}/rest/v1/rpc/get_deliverable_listing_photo`, {
          method: "POST",
          headers: serviceHeaders(config),
          body: JSON.stringify({ p_listing_id: listingId, p_photo_id: photoId }),
        }),
        "public photo deliverability lookup",
      );
      const rows = (await response.json()) as Array<{
        listing_id?: string;
        photo_id?: string;
        object_path?: string;
        mime_type?: string;
        byte_size?: number | string;
        sort_order?: number | string;
      }>;
      if (rows.length === 0) return null;
      const row = rows[0];
      if (
        rows.length !== 1 ||
        !row ||
        typeof row.listing_id !== "string" ||
        typeof row.photo_id !== "string" ||
        typeof row.object_path !== "string" ||
        row.mime_type !== "image/webp"
      ) {
        throw new Error("Public photo deliverability lookup returned an invalid contract.");
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
      if (expiresInSeconds !== LISTING_PHOTO_SIGNED_URL_DEFAULT_SECONDS) {
        throw new Error("Public photo signing attempted a non-canonical TTL.");
      }
      const response = await requireOk(
        await fetchImpl(
          `${config.baseUrl}/storage/v1/object/sign/${LISTING_PHOTO_BUCKET}/${encodeObjectPath(objectPath)}`,
          {
            method: "POST",
            headers: serviceHeaders(config),
            body: JSON.stringify({ expiresIn: LISTING_PHOTO_SIGNED_URL_DEFAULT_SECONDS }),
          },
        ),
        "public photo signed URL creation",
      );
      const payload = (await response.json()) as { signedURL?: string; signedUrl?: string };
      const rawSignedUrl = payload.signedURL ?? payload.signedUrl;
      if (!rawSignedUrl) throw new Error("Storage signing response did not include a URL.");
      return normalizeSignedUrl(rawSignedUrl, config, objectPath);
    },
  };
}

export async function maybeHandlePublicListingPhotoRequest(
  request: Request,
  options: PublicPhotoSigningOptions = {},
): Promise<Response | null> {
  const requestUrl = new URL(request.url);
  const parsed = parsePhotoRequestPath(requestUrl.pathname);
  if (parsed === null) return null;
  if (!parsed.listingId || !parsed.photoId) return notFoundResponse();
  if (request.method !== "GET") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { ...noStoreHeaders(), Allow: "GET" },
    });
  }

  try {
    const config = options.config
      ? { ...options.config, baseUrl: validateBackendUrl(options.config.baseUrl) }
      : readBackendConfig();
    const signedUrl = await createActiveListingPhotoSignedUrl(
      { listingId: parsed.listingId, photoId: parsed.photoId },
      createDeliveryStore(config, options.fetchImpl ?? fetch),
    );
    if (!signedUrl) return notFoundResponse();

    return new Response(null, {
      status: 302,
      headers: {
        ...noStoreHeaders(),
        Location: signedUrl,
      },
    });
  } catch (error) {
    console.error("Public listing photo issuance failed", error);
    return new Response("Photo temporarily unavailable", {
      status: 503,
      headers: noStoreHeaders(),
    });
  }
}
