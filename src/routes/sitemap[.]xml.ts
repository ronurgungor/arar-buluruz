import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import {
  PUBLIC_V0_ROBOTS,
  buildProductionSitemapUrls,
  getRuntimeDiscoveryProfile,
  normalizeCanonicalOrigin,
  renderSitemapXml,
} from "@/lib/discovery-contract";
import { loadListingsCollection } from "@/lib/public-listings";

function sitemapResponse(xml: string, options: { closed?: boolean; status?: number } = {}) {
  return new Response(xml, {
    status: options.status ?? 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": options.closed ? "public, max-age=300" : "public, max-age=3600",
      ...(options.closed ? { "X-Robots-Tag": PUBLIC_V0_ROBOTS } : {}),
    },
  });
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        if (getRuntimeDiscoveryProfile() !== "real-content") {
          return sitemapResponse(renderSitemapXml([]), { closed: true });
        }

        const canonicalOrigin = normalizeCanonicalOrigin(process.env.ARAR_CANONICAL_ORIGIN);
        if (!canonicalOrigin) {
          return sitemapResponse(renderSitemapXml([]), { closed: true, status: 503 });
        }

        const listingData = await loadListingsCollection();
        if (listingData.state !== "ready" || listingData.source !== "supabase") {
          return sitemapResponse(renderSitemapXml([]), { closed: true, status: 503 });
        }

        const urls = buildProductionSitemapUrls(
          canonicalOrigin,
          listingData.listings.map((listing) => listing.id),
        );
        return sitemapResponse(renderSitemapXml(urls));
      },
    },
  },
});
