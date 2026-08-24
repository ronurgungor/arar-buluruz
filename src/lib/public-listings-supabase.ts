import { z } from "zod";
import { publicSellerContactSchema, type PublicSellerContact } from "@/lib/public-seller-contact";

export type ListingView = {
  id: string;
  title: string;
  price: number;
  city: string;
  district: string;
  seller: string;
  description: string;
  photos: string[];
  createdAt: string;
  distanceKm: number | null;
  keywords: string[];
};

export type ListingDetailView = ListingView & {
  publicContact: PublicSellerContact | null;
};

export type ListingsSource = "mock" | "supabase" | "disabled";
export type ListingsLoadState = "ready" | "disabled" | "error";

export type ListingsCollectionResult = {
  source: ListingsSource;
  state: ListingsLoadState;
  listings: ListingView[];
  message?: string;
};

export type ListingDetailResult = {
  source: ListingsSource;
  state: ListingsLoadState;
  listing: ListingDetailView | null;
  message?: string;
};

export type PublicSupabaseConfig = {
  url: string;
  publicKey: string;
};

const LISTING_PHOTO_BUCKET = "listing_photos";
const LISTING_PHOTO_SIGNED_URL_SECONDS = 60;
const LISTING_PHOTO_MAX_BYTES = 8 * 1024 * 1024;

const publicListingRowSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(5000),
  price_amount: z.union([z.number(), z.string()]).transform((value, context) => {
    const price = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(price) || price < 0) {
      context.addIssue({ code: "custom", message: "Invalid price_amount" });
      return z.NEVER;
    }
    return price;
  }),
  province: z.string().min(2).max(64),
  district: z.string().min(2).max(64),
  seller_display_name: z.string().min(2).max(80),
  search_keywords: z.array(z.string()).max(40),
  created_at: z.string().datetime({ offset: true }),
  published_at: z.string().datetime({ offset: true }),
});

const publicListingRowsSchema = z.array(publicListingRowSchema);
const publicListingDetailRowSchema = publicListingRowSchema.extend({
  contact_channel: publicSellerContactSchema.shape.channel,
  contact_e164: publicSellerContactSchema.shape.e164,
});
const publicListingDetailRowsSchema = z.array(publicListingDetailRowSchema);

const publicPhotoManifestRowSchema = z.object({
  photo_id: z.string().uuid(),
  object_path: z.string().min(1).max(512),
  mime_type: z.literal("image/webp"),
  byte_size: z.union([z.number(), z.string()]).transform((value, context) => {
    const byteSize = typeof value === "number" ? value : Number(value);
    if (!Number.isSafeInteger(byteSize) || byteSize < 1 || byteSize > LISTING_PHOTO_MAX_BYTES) {
      context.addIssue({ code: "custom", message: "Invalid listing photo byte_size" });
      return z.NEVER;
    }
    return byteSize;
  }),
  sort_order: z.union([z.number(), z.string()]).transform((value, context) => {
    const sortOrder = typeof value === "number" ? value : Number(value);
    if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 32_767) {
      context.addIssue({ code: "custom", message: "Invalid listing photo sort_order" });
      return z.NEVER;
    }
    return sortOrder;
  }),
});
const publicPhotoManifestRowsSchema = z.array(publicPhotoManifestRowSchema).max(32);
const signedPhotoResponseSchema = z
  .object({
    signedURL: z.string().optional(),
    signedUrl: z.string().optional(),
  })
  .refine((value) => Boolean(value.signedURL ?? value.signedUrl), {
    message: "Signed photo response did not include a URL.",
  });

const PUBLIC_LISTING_COLLECTION_COLUMNS = [
  "id",
  "title",
  "description",
  "price_amount",
  "province",
  "district",
  "seller_display_name",
  "search_keywords",
  "created_at",
  "published_at",
].join(",");

const PUBLIC_LISTING_DETAIL_COLUMNS = [
  PUBLIC_LISTING_COLLECTION_COLUMNS,
  "contact_channel",
  "contact_e164",
].join(",");

export class PublicListingsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublicListingsError";
  }
}

function validateSupabaseUrl(rawUrl: string): URL {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    throw new PublicListingsError("Supabase URL is invalid.");
  }

  const isLocalhost = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(isLocalhost && url.protocol === "http:")) {
    throw new PublicListingsError("Supabase URL must use HTTPS outside local development.");
  }

  return url;
}

function createListingsUrl(
  config: PublicSupabaseConfig,
  options: { id?: string; includeContact: boolean },
): URL {
  const baseUrl = validateSupabaseUrl(config.url);
  const apiUrl = new URL("rest/v1/listings", `${baseUrl.toString().replace(/\/+$/, "")}/`);

  apiUrl.searchParams.set(
    "select",
    options.includeContact ? PUBLIC_LISTING_DETAIL_COLUMNS : PUBLIC_LISTING_COLLECTION_COLUMNS,
  );
  apiUrl.searchParams.set("order", "published_at.desc,id.desc");

  if (options.id) {
    const validId = z.string().uuid().parse(options.id);
    apiUrl.searchParams.set("id", `eq.${validId}`);
    apiUrl.searchParams.set("limit", "1");
  }

  return apiUrl;
}

function publicApiHeaders(config: PublicSupabaseConfig, includeAuthorization = false): HeadersInit {
  return includeAuthorization
    ? { apikey: config.publicKey, Authorization: `Bearer ${config.publicKey}` }
    : { apikey: config.publicKey };
}

function validatePhotoObjectPath(listingId: string, photoId: string, objectPath: string): void {
  const expectedPath = `listings/${listingId.toLowerCase()}/${photoId.toLowerCase()}.webp`;
  if (objectPath !== expectedPath) {
    throw new PublicListingsError("Public listing photo path did not match the approved contract.");
  }
}

function encodeObjectPath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function fetchListingPhotoManifest(
  listingId: string,
  config: PublicSupabaseConfig,
  fetchImpl: typeof fetch,
): Promise<z.infer<typeof publicPhotoManifestRowSchema>[]> {
  const baseUrl = validateSupabaseUrl(config.url);
  const rpcUrl = new URL(
    "rest/v1/rpc/get_public_listing_photos",
    `${baseUrl.toString().replace(/\/+$/, "")}/`,
  );
  const response = await fetchImpl(rpcUrl, {
    method: "POST",
    headers: {
      ...publicApiHeaders(config),
      "content-type": "application/json",
    },
    body: JSON.stringify({ p_listing_id: listingId }),
  });

  if (!response.ok) {
    throw new PublicListingsError(
      `Public listing photos request failed with status ${response.status}.`,
    );
  }

  const parsed = publicPhotoManifestRowsSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new PublicListingsError(
      "Public listing photos response did not match the approved schema.",
    );
  }

  for (const photo of parsed.data) {
    validatePhotoObjectPath(listingId, photo.photo_id, photo.object_path);
  }

  return parsed.data;
}

async function createPublicSignedPhotoUrl(
  objectPath: string,
  config: PublicSupabaseConfig,
  fetchImpl: typeof fetch,
): Promise<string> {
  const baseUrl = validateSupabaseUrl(config.url);
  const storageUrl = new URL(
    `storage/v1/object/sign/${LISTING_PHOTO_BUCKET}/${encodeObjectPath(objectPath)}`,
    `${baseUrl.toString().replace(/\/+$/, "")}/`,
  );
  const response = await fetchImpl(storageUrl, {
    method: "POST",
    headers: {
      ...publicApiHeaders(config, true),
      "content-type": "application/json",
    },
    body: JSON.stringify({ expiresIn: LISTING_PHOTO_SIGNED_URL_SECONDS }),
  });

  if (!response.ok) {
    throw new PublicListingsError(`Listing photo signing failed with status ${response.status}.`);
  }

  const parsed = signedPhotoResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new PublicListingsError(
      "Listing photo signing response did not match the approved schema.",
    );
  }

  const rawSignedUrl = parsed.data.signedURL ?? parsed.data.signedUrl;
  if (!rawSignedUrl) {
    throw new PublicListingsError("Listing photo signing response did not include a URL.");
  }

  const normalizedSignedPath = rawSignedUrl.startsWith("/object/")
    ? `/storage/v1${rawSignedUrl}`
    : rawSignedUrl;
  const signedUrl = new URL(normalizedSignedPath, baseUrl);
  if (signedUrl.origin !== baseUrl.origin) {
    throw new PublicListingsError("Listing photo signing response changed backend origin.");
  }
  if (!signedUrl.pathname.startsWith(`/storage/v1/object/sign/${LISTING_PHOTO_BUCKET}/`)) {
    throw new PublicListingsError(
      "Listing photo signing response used an unexpected Storage path.",
    );
  }

  return signedUrl.toString();
}

async function fetchPublicPhotoUrls(
  listingId: string,
  config: PublicSupabaseConfig,
  fetchImpl: typeof fetch,
): Promise<string[]> {
  const manifest = await fetchListingPhotoManifest(listingId, config, fetchImpl);
  return await Promise.all(
    manifest.map((photo) => createPublicSignedPhotoUrl(photo.object_path, config, fetchImpl)),
  );
}

function mapPublicRow(row: z.infer<typeof publicListingRowSchema>, photos: string[]): ListingView {
  return {
    id: row.id,
    title: row.title,
    price: row.price_amount,
    city: row.province,
    district: row.district,
    seller: row.seller_display_name,
    description: row.description,
    photos,
    createdAt: row.published_at ?? row.created_at,
    distanceKm: null,
    keywords: row.search_keywords,
  };
}

function mapPublicDetailRow(
  row: z.infer<typeof publicListingDetailRowSchema>,
  photos: string[],
): ListingDetailView {
  return {
    ...mapPublicRow(row, photos),
    publicContact: {
      channel: row.contact_channel,
      e164: row.contact_e164,
    },
  };
}

async function fetchCollectionRows(
  config: PublicSupabaseConfig,
  fetchImpl: typeof fetch,
): Promise<ListingView[]> {
  const response = await fetchImpl(createListingsUrl(config, { includeContact: false }), {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...publicApiHeaders(config),
    },
  });

  if (!response.ok) {
    throw new PublicListingsError(`Public listings request failed with status ${response.status}.`);
  }

  const parsed = publicListingRowsSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new PublicListingsError("Public listings response did not match the approved schema.");
  }

  return await Promise.all(
    parsed.data.map(async (row) =>
      mapPublicRow(row, await fetchPublicPhotoUrls(row.id, config, fetchImpl)),
    ),
  );
}

async function fetchDetailRows(
  id: string,
  config: PublicSupabaseConfig,
  fetchImpl: typeof fetch,
): Promise<ListingDetailView[]> {
  const response = await fetchImpl(createListingsUrl(config, { id, includeContact: true }), {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...publicApiHeaders(config),
    },
  });

  if (!response.ok) {
    throw new PublicListingsError(`Public listings request failed with status ${response.status}.`);
  }

  const parsed = publicListingDetailRowsSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new PublicListingsError(
      "Public listing detail response did not match the approved schema.",
    );
  }

  return await Promise.all(
    parsed.data.map(async (row) =>
      mapPublicDetailRow(row, await fetchPublicPhotoUrls(row.id, config, fetchImpl)),
    ),
  );
}

export async function fetchPublicListings(
  config: PublicSupabaseConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<ListingView[]> {
  return fetchCollectionRows(config, fetchImpl);
}

export async function fetchPublicListing(
  id: string,
  config: PublicSupabaseConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<ListingDetailView | null> {
  const rows = await fetchDetailRows(id, config, fetchImpl);
  return rows[0] ?? null;
}
