import {
  fetchPublicListing,
  fetchPublicListings,
  type ListingDetailResult,
  type ListingsCollectionResult,
  type PublicSupabaseConfig,
} from "@/lib/public-listings-supabase";

function readPilotSupabaseConfig(): PublicSupabaseConfig | null {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const publicKey =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ??
    import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  return url && publicKey ? { url, publicKey } : null;
}

export async function loadPilotListingsCollection(): Promise<ListingsCollectionResult> {
  const config = readPilotSupabaseConfig();
  if (!config) {
    return {
      source: "supabase",
      state: "disabled",
      listings: [],
      message: "Pilot ilan bağlantısı için public yapılandırma henüz etkin değil.",
    };
  }

  try {
    return { source: "supabase", state: "ready", listings: await fetchPublicListings(config) };
  } catch {
    return {
      source: "supabase",
      state: "error",
      listings: [],
      message: "İlanlar şu anda güvenli biçimde yüklenemiyor. Lütfen daha sonra tekrar deneyin.",
    };
  }
}

export async function loadPilotListingDetail(id: string): Promise<ListingDetailResult> {
  const config = readPilotSupabaseConfig();
  if (!config) {
    return {
      source: "supabase",
      state: "disabled",
      listing: null,
      message: "Pilot ilan bağlantısı için public yapılandırma henüz etkin değil.",
    };
  }

  try {
    return { source: "supabase", state: "ready", listing: await fetchPublicListing(id, config) };
  } catch {
    return {
      source: "supabase",
      state: "error",
      listing: null,
      message: "İlan şu anda güvenli biçimde yüklenemiyor. Lütfen daha sonra tekrar deneyin.",
    };
  }
}
