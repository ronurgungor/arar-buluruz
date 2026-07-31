import { z } from "zod";
import { listings as mockListings } from "@/data/listings";

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
  listing: ListingView | null;
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

const PUBLIC_LISTING_COLUMNS = [
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

function createListingsUrl(config: PublicSupabaseConfig, id?: string): URL {
  const baseUrl = validateSupabaseUrl(config.url);
  const apiUrl = new URL("rest/v1/listings", `${baseUrl.toString().replace(/\/+$/, "")}/`);

  apiUrl.searchParams.set("select", PUBLIC_LISTING_COLUMNS);
  apiUrl.searchParams.set("order", "published_at.desc,id.desc");

  if (id) {
    const validId = z.string().uuid().parse(id);
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

async function fetchRows(
  config: PublicSupabaseConfig,
  fetchImpl: typeof fetch,
  id?: string,
): Promise<ListingView[]> {
  const response = await fetchImpl(createListingsUrl(config, id), {
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

export async function fetchPublicListings(
  config: PublicSupabaseConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<ListingView[]> {
  return fetchRows(config, fetchImpl);
}

export async function fetchPublicListing(
  id: string,
  config: PublicSupabaseConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<ListingView | null> {
  const rows = await fetchRows(config, fetchImpl, id);
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
      listing: listing ? { ...listing, distanceKm: listing.distanceKm } : null,
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
