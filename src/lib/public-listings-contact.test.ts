import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  PublicListingsError,
  fetchPublicListing,
  fetchPublicListings,
  type PublicSupabaseConfig,
} from "./public-listings";

const config: PublicSupabaseConfig = {
  url: "https://example.supabase.co",
  publicKey: "sb_publishable_public-test-key",
};

const baseRow = {
  id: "00000000-0000-4000-8000-000000000058",
  title: "Synthetic public contact listing",
  description: "Synthetic listing proving the approved detail-only application contact payload.",
  price_amount: "1250.00",
  province: "Tekirdağ",
  district: "Çorlu",
  seller_display_name: "Synthetic Seller",
  search_keywords: ["synthetic", "contact"],
  created_at: "2026-08-10T10:00:00+00:00",
  published_at: "2026-08-10T11:00:00+00:00",
};

const detailRow = {
  ...baseRow,
  contact_channel: "whatsapp",
  contact_e164: "+12025550123",
};

describe("public listings seller-contact payload boundary", () => {
  test("collection query and mapped card payload omit seller contact", async () => {
    let requestedUrl: URL | undefined;

    const fetchMock: typeof fetch = async (input) => {
      requestedUrl = new URL(input instanceof Request ? input.url : input.toString());
      return new Response(JSON.stringify([baseRow]), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };

    const listings = await fetchPublicListings(config, fetchMock);
    const selectedColumns = requestedUrl?.searchParams.get("select") ?? "";

    expect(selectedColumns).not.toContain("contact_channel");
    expect(selectedColumns).not.toContain("contact_e164");
    expect(Object.prototype.hasOwnProperty.call(listings[0] ?? {}, "publicContact")).toBe(false);
  });

  test("detail query requests exactly the two public contact fields and maps one channel", async () => {
    let requestedUrl: URL | undefined;

    const fetchMock: typeof fetch = async (input) => {
      requestedUrl = new URL(input instanceof Request ? input.url : input.toString());
      return new Response(JSON.stringify([detailRow]), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };

    const listing = await fetchPublicListing(baseRow.id, config, fetchMock);
    const selectedColumns = requestedUrl?.searchParams.get("select") ?? "";

    expect(selectedColumns).toContain("contact_channel");
    expect(selectedColumns).toContain("contact_e164");
    expect(selectedColumns).not.toContain("contact_verified_at");
    expect(selectedColumns).not.toContain("contact_verification_method");
    expect(selectedColumns).not.toContain("publication_instruction_at");
    expect(listing?.publicContact).toEqual({
      channel: "whatsapp",
      e164: "+12025550123",
    });
  });

  test("fails closed if an active detail response lacks the required public contact", async () => {
    const fetchMock: typeof fetch = async () =>
      new Response(JSON.stringify([baseRow]), {
        status: 200,
        headers: { "content-type": "application/json" },
      });

    await expect(fetchPublicListing(baseRow.id, config, fetchMock)).rejects.toBeInstanceOf(
      PublicListingsError,
    );
  });

  test("keeps contact out of sitemap and structured metadata source paths", () => {
    const sitemapSource = readFileSync(path.resolve("src/routes/sitemap[.]xml.ts"), "utf8");
    const detailSource = readFileSync(path.resolve("src/routes/ilan.$id.tsx"), "utf8");

    expect(sitemapSource).not.toContain("contact_e164");
    expect(sitemapSource).not.toContain("publicContact");
    expect(detailSource).not.toContain("application/ld+json");
    expect(detailSource).not.toContain("schema.org");
  });
});
