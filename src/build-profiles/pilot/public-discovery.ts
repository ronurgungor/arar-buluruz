import type { ListingView } from "@/lib/public-listings-supabase";

export const CLOSED_ROBOTS = "noindex, nofollow, noarchive, nosnippet";
export const publicValidationIndexingEnabled =
  import.meta.env.VITE_REAL_DATA_ACTIVATION === "enabled";

export function robotsContent(
  indexableInPublicValidation: boolean,
  indexingEnabled = publicValidationIndexingEnabled,
): string | null {
  return indexingEnabled && indexableInPublicValidation ? null : CLOSED_ROBOTS;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function absoluteUrl(origin: string, pathname: string): string {
  return new URL(pathname, `${origin.replace(/\/+$/, "")}/`).toString();
}

export function createPilotSitemapXml(
  origin: string,
  listings: Pick<ListingView, "id" | "createdAt">[],
): string {
  const urls = [
    { loc: absoluteUrl(origin, "/"), lastmod: null },
    ...listings.map((listing) => ({
      loc: absoluteUrl(origin, `/ilan/${encodeURIComponent(listing.id)}`),
      lastmod: listing.createdAt,
    })),
  ];

  const entries = urls
    .map(({ loc, lastmod }) => {
      const lastmodLine = lastmod ? `\n    <lastmod>${escapeXml(lastmod)}</lastmod>` : "";
      return `  <url>\n    <loc>${escapeXml(loc)}</loc>${lastmodLine}\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}
