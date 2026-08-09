export const PUBLIC_V0_ROBOTS = "noindex, nofollow, noarchive, nosnippet";
export const INDEXABLE_ROBOTS = "index, follow";

export type DiscoveryProfile = "closed" | "real-content";
export type DiscoverySurface = "home" | "publisher-info" | "listing-detail" | "search" | "utility";

type DiscoveryProfileInput = {
  publicV0Runtime: boolean;
  configuredProfile?: string;
  listingsSource?: string;
};

export const PERMANENT_PUBLISHER_PATHS = [
  "/nasil-calisir",
  "/ilan-kurallari",
  "/guvenli-kullanim",
] as const;

const permanentPublisherPathSet = new Set<string>(PERMANENT_PUBLISHER_PATHS);

export function resolveDiscoveryProfile({
  publicV0Runtime,
  configuredProfile,
  listingsSource,
}: DiscoveryProfileInput): DiscoveryProfile {
  if (publicV0Runtime) return "closed";
  if (configuredProfile !== "real-content") return "closed";
  if (listingsSource !== "supabase") return "closed";
  return "real-content";
}

export function getRuntimeDiscoveryProfile(): DiscoveryProfile {
  return resolveDiscoveryProfile({
    publicV0Runtime: import.meta.env.VITE_PUBLIC_V0_RUNTIME === "enabled",
    configuredProfile: import.meta.env.VITE_DISCOVERY_PROFILE,
    listingsSource: import.meta.env.VITE_LISTINGS_SOURCE,
  });
}

export function robotsForDiscoverySurface(
  profile: DiscoveryProfile,
  surface: DiscoverySurface,
  options: { usefulRealSearch?: boolean } = {},
): string {
  if (profile !== "real-content") return PUBLIC_V0_ROBOTS;

  if (surface === "home" || surface === "publisher-info" || surface === "listing-detail") {
    return INDEXABLE_ROBOTS;
  }

  if (surface === "search" && options.usefulRealSearch === true) {
    return INDEXABLE_ROBOTS;
  }

  return PUBLIC_V0_ROBOTS;
}

export function getRuntimeRobotsDirective(
  surface: DiscoverySurface,
  options: { usefulRealSearch?: boolean } = {},
): string {
  return robotsForDiscoverySurface(getRuntimeDiscoveryProfile(), surface, options);
}

export function robotsForRequestPath(profile: DiscoveryProfile, pathname: string): string {
  if (profile !== "real-content") return PUBLIC_V0_ROBOTS;
  if (pathname === "/" || permanentPublisherPathSet.has(pathname)) return INDEXABLE_ROBOTS;
  if (/^\/ilan\/[^/]+\/?$/.test(pathname)) return INDEXABLE_ROBOTS;
  return PUBLIC_V0_ROBOTS;
}

export function normalizeCanonicalOrigin(rawOrigin: string | undefined): string | null {
  if (!rawOrigin?.trim()) return null;

  try {
    const url = new URL(rawOrigin.trim());
    if (url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function buildProductionSitemapUrls(
  canonicalOrigin: string,
  genuinePublishedListingIds: readonly string[],
): string[] {
  const origin = normalizeCanonicalOrigin(canonicalOrigin);
  if (!origin) throw new Error("A valid HTTPS canonical origin is required.");

  const uniqueListingIds = Array.from(
    new Set(genuinePublishedListingIds.map((id) => id.trim()).filter(Boolean)),
  );

  return [
    `${origin}/`,
    ...PERMANENT_PUBLISHER_PATHS.map((path) => `${origin}${path}`),
    ...uniqueListingIds.map((id) => `${origin}/ilan/${encodeURIComponent(id)}`),
  ];
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function renderSitemapXml(urls: readonly string[]): string {
  const entries = urls.map((url) => `  <url>\n    <loc>${escapeXml(url)}</loc>\n  </url>`);

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...entries,
    `</urlset>`,
  ].join("\n");
}
