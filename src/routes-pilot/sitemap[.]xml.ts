import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const CLOSED_ROBOTS = "noindex, nofollow, noarchive, nosnippet";
const EMPTY_SITEMAP = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>';

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => new Response(EMPTY_SITEMAP, {
        status: 200,
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "Cache-Control": "public, max-age=300",
          "X-Robots-Tag": CLOSED_ROBOTS,
        },
      }),
    },
  },
});
