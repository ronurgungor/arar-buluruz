import { z } from "zod";
import { listings as mockListings } from "@/data/listings";
import {
  publicSellerContactSchema,
  type PublicSellerContact,
} from "@/lib/public-seller-contact";

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

type RuntimeModeInput = {
  isDevelopment: boolean;
  configuredSource?: string;
};

export type PublicSupabaseConfig = {
  url: string;
  publicKey: string;
};

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

export function resolveListingsSource({
  isDevelopment,
  configuredSource,
}: RuntimeModeInput): ListingsSource {
  if (configuredSource === "supabase") return "supabase";
  if (configuredSource === "disabled") return "disabled";
  if (configuredSource === "mock") return "mock";
  return isDevelopment ? "mock" : "disabled";
}

function readRuntimeSupabaseConfig(): PublicSupabaseConfig | null {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const publicKey =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ??
    import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

  if (!url || !publicKey) return null;
  return { url, publicKey };
}

function readRuntimeSource(): ListingsSource {
  return resolveListingsSource({
    isDevelopment: import.meta.env.DEV,
    configuredSource: import.meta.env.VITE_LISTINGS_SOURCE,
  });
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

function mapPublicRow(row: z.infer<typeof publicListingRowSchema>): ListingView {
  return {
    id: row.id,
    title: row.title,
    price: row.price_amount,
    city: row.province,
    district: row.district,
    seller: row.seller_display_name,
    description: row.description,
    photos: [],
    createdAt: row.published_at ?? row.created_at,
    distanceKm: null,
    keywords: row.search_keywords,
  };
}

function mapPublicDetailRow(
  row: z.infer<typeof publicListingDetailRowSchema>,
): ListingDetailView {
  return {
    ...mapPublicRow(row),
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
      apikey: config.publicKey,
    },
  });

  if (!response.ok) {
    throw new PublicListingsError(`Public listings request failed with status ${response.status}.`);
  }

  const parsed = publicListingRowsSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new PublicListingsError("Public listings response did not match the approved schema.");
  }

  return parsed.data.map(mapPublicRow);
}

async function fetchDetailRows(
  id: string,
  config: PublicSupabaseConfig,
  fetchImpl: typeof fetch,
): Promise<ListingDetailView[]> {
  const response = await fetchImpl(
    createListingsUrl(config, { id, includeContact: true }),
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        apikey: config.publicKey,
      },
    },
  );

  if (!response.ok) {
    throw new PublicListingsError(`Public listings request failed with status ${response.status}.`);
  }

  const parsed = publicListingDetailRowsSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new PublicListingsError("Public listing detail response did not match the approved schema.");
  }

  return parsed.data.map(mapPublicDetailRow);
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

export async function loadListingsCollection(): Promise<ListingsCollectionResult> {
  const source = readRuntimeSource();

  if (source === "mock") {
    return {
      source,
      state: "ready",
      listings: mockListings.map((listing) => ({ ...listing, distanceKm: listing.distanceKm })),
    };
  }

  if (source === "disabled") {
    return {
      source,
      state: "disabled",
      listings: [],
      message: "Pilot ilan bağlantısı henüz etkin değil.",
    };
  }

  const config = readRuntimeSupabaseConfig();
  if (!config) {
    return {
      source,
      state: "disabled",
      listings: [],
      message: "Pilot ilan bağlantısı için public yapılandırma henüz etkin değil.",
    };
  }

  try {
    return {
      source,
      state: "ready",
      listings: await fetchPublicListings(config),
    };
  } catch {
    return {
      source,
      state: "error",
      listings: [],
      message: "İlanlar şu anda güvenli biçimde yüklenemiyor. Lütfen daha sonra tekrar deneyin.",
    };
  }
}

export async function loadListingDetail(id: string): Promise<ListingDetailResult> {
  const source = readRuntimeSource();

  if (source === "mock") {
    const listing = mockListings.find((item) => item.id === id) ?? null;
    return {
      source,
      state: "ready",
      listing: listing
        ? { ...listing, distanceKm: listing.distanceKm, publicContact: null }
        : null,
    };
  }

  if (source === "disabled") {
    return {
      source,
      state: "disabled",
      listing: null,
      message: "Pilot ilan bağlantısı henüz etkin değil.",
    };
  }

  const config = readRuntimeSupabaseConfig();
  if (!config) {
    return {
      source,
      state: "disabled",
      listing: null,
      message: "Pilot ilan bağlantısı için public yapılandırma henüz etkin değil.",
    };
  }

  try {
    return {
      source,
      state: "ready",
      listing: await fetchPublicListing(id, config),
    };
  } catch {
    return {
      source,
      state: "error",
      listing: null,
      message: "İlan şu anda güvenli biçimde yüklenemiyor. Lütfen daha sonra tekrar deneyin.",
    };
  }
}
