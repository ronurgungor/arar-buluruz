import { listings as mockListings } from "@/data/listings";
import {
  fetchPublicListing,
  fetchPublicListings,
  type ListingDetailResult,
  type ListingsCollectionResult,
  type ListingsSource,
  type PublicSupabaseConfig,
} from "@/lib/public-listings-supabase";

export {
  PublicListingsError,
  fetchPublicListing,
  fetchPublicListings,
} from "@/lib/public-listings-supabase";
export type {
  ListingDetailResult,
  ListingDetailView,
  ListingsCollectionResult,
  ListingsLoadState,
  ListingsSource,
  ListingView,
  PublicSupabaseConfig,
} from "@/lib/public-listings-supabase";

type RuntimeModeInput = {
  isDevelopment: boolean;
  configuredSource?: string;
};

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
      listing: listing ? { ...listing, distanceKm: listing.distanceKm, publicContact: null } : null,
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
